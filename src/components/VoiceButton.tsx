/**
 * Direct Voice Search for POS and Inventory.
 * Works seamlessly across Opera GX, Google Chrome, Edge, Safari, Firefox.
 * 
 * Flow:
 * 1. User clicks microphone: immediate activation, live soundwave visualizer.
 * 2. User speaks: "Advil", "Amoxil", "Omeprazol", "Losartán", etc.
 * 3. Dual-engine: Native Chrome SpeechRec + Universal MediaRecorder fallback to local Whisper-tiny.
 * 4. Finishes on user stop or silence -> instantly applies search query, no blocking modals.
 */

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { playBeep } from "@/lib/sound";

function cleanSpokenQuery(rawText: string): string {
  let clean = rawText
    .replace(/\[.*?\]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/^[.,;:!?¿¡"'\s]+|[.,;:!?¿¡"'\s]+$/g, "")
    .trim();

  // Strip conversational prefixes and suffixes in Spanish
  clean = clean.replace(/^(busca|buscar|quiero|necesito|dame|tienes|hay|precio de|consultar|ver|vendes)\s+/i, "");
  clean = clean.replace(/\s+(por favor|gracias)$/i, "");
  return clean.trim();
}

interface VoiceButtonProps {
  onText: (text: string) => void;
  className?: string;
}

export function VoiceButton({ onText, className }: VoiceButtonProps) {
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [audioBars, setAudioBars] = useState<number[]>(new Array(12).fill(15));
  const [voiceDetected, setVoiceDetected] = useState(false);
  const [statusMsg, setStatusMsg] = useState("Escuchando...");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const nativeGotResultRef = useRef<boolean>(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up all resources cleanly
  const cleanup = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setListening(false);
    setAudioBars(new Array(12).fill(15));
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Stop recording and process captured audio
  const stopAndTranscribe = () => {
    if (maxTimeoutRef.current) clearTimeout(maxTimeoutRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      setStatusMsg("Procesando audio...");
      mediaRecorderRef.current.stop();
    } else {
      cleanup();
    }
  };

  // Start microphone
  const startRecording = async () => {
    cleanup();
    audioChunksRef.current = [];
    nativeGotResultRef.current = false;
    setVoiceDetected(false);
    setStatusMsg("Escuchando... habla ahora");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
    } catch (err: any) {
      console.warn("Microphone access denied or not available:", err);
      toast.error("Permiso de micrófono denegado", {
        description: "Haz clic en el candado de la barra de direcciones de Opera GX / Chrome y permite el micrófono.",
      });
      return;
    }

    try {
      playBeep(650, 0.08);
    } catch {}

    setListening(true);

    // 1. Audio Visualizer & Voice Activity Detection (Web Audio API)
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let hadSpeech = false;

      const analyzeAudio = () => {
        if (!audioCtxRef.current) return;
        analyser.getByteFrequencyData(buffer);

        let sum = 0;
        const bars: number[] = [];
        for (let i = 0; i < 12; i++) {
          const val = buffer[i * 2] || 0;
          sum += val;
          const pct = Math.max(15, Math.min(100, Math.round((val / 255) * 100)));
          bars.push(pct);
        }
        setAudioBars(bars);

        const avgVolume = sum / 12;
        if (avgVolume > 18) {
          hadSpeech = true;
          setVoiceDetected(true);
          setStatusMsg("Detectando tu voz...");

          // Reset silence timer whenever user is actively speaking
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (hadSpeech && !silenceTimerRef.current) {
          // User paused/finished speaking -> automatically stop and search after 1.3s
          silenceTimerRef.current = setTimeout(() => {
            stopAndTranscribe();
          }, 1300);
        }

        animFrameRef.current = requestAnimationFrame(analyzeAudio);
      };

      analyzeAudio();
    } catch (e) {
      console.warn("Web Audio meter error:", e);
    }

    // 2. Native Web Speech Recognition (for instant streaming in Chrome/Edge)
    const W = window as any;
    const SpeechRec = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        rec.lang = navigator.language?.startsWith("es") ? navigator.language : "es-GT";
        rec.continuous = false;
        rec.interimResults = true;

        rec.onresult = (e: any) => {
          let text = "";
          for (let i = 0; i < e.results.length; i++) {
            text += e.results[i][0].transcript + " ";
          }
          const clean = cleanSpokenQuery(text);
          if (clean) {
            nativeGotResultRef.current = true;
            onText(clean);
            setStatusMsg(`Reconocido: "${clean}"`);
          }
        };

        rec.onerror = (e: any) => {
          // Opera GX fires 'network' error here; we gracefully ignore and rely on MediaRecorder + Whisper
          console.log("Native speech notice (handled by server Whisper fallback):", e.error);
        };

        rec.onend = () => {
          // If native speech concluded and found results, we can finish
          if (nativeGotResultRef.current) {
            cleanup();
          }
        };

        recognitionRef.current = rec;
        rec.start();
      } catch (recErr) {
        console.warn("SpeechRec start error:", recErr);
      }
    }

    // 3. MediaRecorder Universal Capture (Opera GX, Chrome, Safari, Firefox)
    try {
      let mimeType = "audio/webm";
      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
          mimeType = "audio/ogg;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else {
          mimeType = "";
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        cleanup();

        // If native speech already provided the query (e.g. Chrome), no need to re-query Whisper
        if (nativeGotResultRef.current) {
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        if (audioBlob.size < 1000) {
          // Audio was too short or empty
          toast.info("Audio muy breve", { description: "Mantén presionado o habla claro al micrófono." });
          return;
        }

        setProcessing(true);
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            try {
              const base64Data = (reader.result as string).split(",")[1];
              const res = await fetch("/api/ai/voice-transcribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  audioBase64: base64Data,
                  mimeType: recorder.mimeType,
                }),
              });

              if (!res.ok) {
                throw new Error(`Servidor ${res.status}`);
              }

              const data = await res.json();
              const recognizedText = cleanSpokenQuery(data.text || "");

              if (recognizedText) {
                onText(recognizedText);
                playBeep(880, 0.1);
                toast.success("Búsqueda por voz exitosa", {
                  description: `Buscando: “${recognizedText}”`,
                });
              } else {
                toast.info("No se reconoció ninguna palabra", {
                  description: "Habla más cerca de tu micrófono y pronuncia el medicamento.",
                });
              }
            } catch (err: any) {
              console.error("Transcribe API error:", err);
              toast.error("Error al procesar audio", {
                description: "Revisa tu conexión o escribe el nombre del medicamento.",
              });
            } finally {
              setProcessing(false);
            }
          };
        } catch (e: any) {
          console.error("FileReader error:", e);
          setProcessing(false);
        }
      };

      recorder.start(250);

      // Max safety timeout of 6 seconds
      maxTimeoutRef.current = setTimeout(() => {
        stopAndTranscribe();
      }, 6000);
    } catch (recorderErr) {
      console.error("MediaRecorder creation error:", recorderErr);
    }
  };

  const handleToggle = () => {
    if (listening) {
      stopAndTranscribe();
    } else {
      startRecording();
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <Button
        type="button"
        variant={listening ? "destructive" : "hero"}
        size="icon"
        onClick={handleToggle}
        disabled={processing}
        aria-label={listening ? "Detener grabación de voz" : "Buscar con micrófono"}
        title={listening ? "Detener y buscar ahora" : "Buscar por voz (Opera GX, Chrome, Edge)"}
        className={`glow transition-all cursor-pointer relative ${
          listening
            ? "ring-4 ring-destructive/40 animate-pulse scale-105"
            : "hover:scale-105"
        } ${className || ""}`}
      >
        {processing ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
        ) : listening ? (
          <Square className="h-4 w-4 fill-current text-white animate-pulse" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>

      {/* Floating Direct Status Pill (Direct & Non-intrusive) */}
      {(listening || processing) && (
        <div className="absolute left-1/2 -bottom-14 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-full border border-primary/40 bg-card/95 px-4 py-2 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 whitespace-nowrap">
          {processing ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Transcribiendo voz...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
              </span>

              {/* Real-time sound wave bars */}
              <div className="flex items-end gap-0.5 h-4 w-16">
                {audioBars.map((h, i) => (
                  <span
                    key={i}
                    className="flex-1 rounded-full bg-gradient-to-t from-primary to-emerald-400 transition-all duration-75"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>

              <span className="text-xs font-medium text-foreground">
                {statusMsg}
              </span>

              <button
                type="button"
                onClick={stopAndTranscribe}
                className="ml-1 rounded-full bg-primary/20 hover:bg-primary/30 px-2 py-0.5 text-[10px] font-bold text-primary cursor-pointer transition-colors"
              >
                Buscar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
