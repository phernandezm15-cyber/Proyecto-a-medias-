/**
 * AI Farmacia Assistant Chatbot powered by Gemini 3.8 Flash.
 * Answers questions about inventory, critical stock, expirations, sales analytics,
 * and pharmaceutical information using real-time database context.
 */

import { useEffect, useRef, useState } from "react";
import { Bot, Send, X, Sparkles, Mic, Trash2, Loader2, Volume2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useData } from "@/lib/db";
import { toast } from "sonner";
import { FormattedBotMessage } from "@/components/FormattedBotMessage";

interface Msg {
  from: "bot" | "user";
  text: string;
  time?: string;
}

const SUGGESTIONS = [
  "¿Qué dar para dolor de estómago o acidez?",
  "¿Qué sirve para el dolor de cabeza o fiebre?",
  "¿Qué tienen para la gripe o tos?",
  "¿Qué medicamentos vencen pronto?",
  "¿Cuáles tienen stock crítico?",
  "¿Cuánto hemos vendido hoy?",
];

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      from: "bot",
      text: "¡Hola! Soy tu **Asistente Clínico y de Gestión de FarmaciaDB**.\n\nPuedes hacerme **cualquier pregunta libre** sobre:\n🩺 **Síntomas y recomendaciones:** *\"¿Qué dar a alguien con dolor de estómago?\"*, *\"¿Qué sirve para la migraña o gripe?\"*\n💊 **Medicamentos y dosis:** *\"¿Para qué sirve el Omeprazol?\"*, *\"¿Cuánto cuesta el Amoxil?\"*\n📊 **Gestión e inventario:** Vencimientos, stock bajo o ventas del día.\n\nEscribe o presiona el micrófono para hablarme.",
      time: new Date().toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const { meds, ventas, clientes, compras } = useData();
  const endRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Msg = {
      from: "user",
      text: trimmed,
      time: new Date().toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" }),
    };

    setMsgs((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          context: {
            meds: meds.map((m) => ({
              nombre: m.nombre,
              principio: m.principio,
              categoria: m.categoria,
              caducidad: m.caducidad,
              stock: m.stock,
              precioVenta: m.precioVenta,
            })),
            ventas: ventas.slice(0, 15).map((v) => ({
              id: v.id,
              total: v.total,
              fecha: v.fecha,
              vendedor: v.vendedor,
            })),
            clientes: clientes.slice(0, 10).map((c) => ({
              nombre: c.nombre,
              nit: c.nit,
              puntos: c.puntos,
            })),
            compras: compras.slice(0, 8).map((cp) => ({
              codigo: cp.codigo,
              estado: cp.estado,
              costo: cp.costo,
              cantidad: cp.cantidad,
            })),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor (${response.status})`);
      }

      const data = await response.json();
      const botReply = data.reply || "No obtuve una respuesta clara.";

      setMsgs((prev) => [
        ...prev,
        {
          from: "bot",
          text: botReply,
          time: new Date().toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err: any) {
      console.error("Chatbot error:", err);
      setMsgs((prev) => [
        ...prev,
        {
          from: "bot",
          text: "Lo siento, hubo un problema al comunicarme con el asistente de IA. Por favor intenta de nuevo.",
          time: new Date().toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      toast.error("Error al consultar la IA");
    } finally {
      setLoading(false);
    }
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startVoiceInput = async () => {
    if (isListening) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setIsListening(false);
      return;
    }

    let gotNativeSpeech = false;
    audioChunksRef.current = [];

    // Try getting user media
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch (e) {
      toast.warning("Micrófono no disponible", {
        description: "Permite el acceso al micrófono en tu navegador.",
      });
      return;
    }

    setIsListening(true);
    toast.info("Escuchando...", { description: "Habla tu consulta para el asistente" });

    // 1. Native Web Speech (Chrome / Edge)
    const W = window as any;
    const SpeechRec = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        rec.lang = "es-GT";
        rec.interimResults = false;
        rec.maxAlternatives = 1;

        rec.onresult = (e: any) => {
          const transcript = e.results[0]?.[0]?.transcript;
          if (transcript) {
            gotNativeSpeech = true;
            setInput(transcript);
            setIsListening(false);
            send(transcript);
          }
        };

        rec.onerror = () => {
          // Opera GX or network error - MediaRecorder fallback handles it
        };

        rec.onend = () => {
          if (gotNativeSpeech) {
            setIsListening(false);
          }
        };

        recognitionRef.current = rec;
        rec.start();
      } catch {}
    }

    // 2. MediaRecorder universal fallback (Opera GX, Firefox, Safari)
    try {
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        setIsListening(false);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        if (gotNativeSpeech) return;

        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size < 1000) return;

        try {
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(",")[1];
            const res = await fetch("/api/ai/voice-transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ audioBase64: base64Data }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.text) {
                setInput(data.text);
                send(data.text);
              }
            }
          };
        } catch (err) {
          console.warn("Chatbot voice transcribe error:", err);
        }
      };

      recorder.start(250);

      // Stop after 6 seconds max
      setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, 6000);
    } catch (e) {
      console.warn("MediaRecorder init error:", e);
    }
  };

  const clearChat = () => {
    setMsgs([
      {
        from: "bot",
        text: "Historial reiniciado. ¿En qué puedo ayudarte hoy?",
        time: new Date().toLocaleTimeString("es-GT", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Asistente de IA"
        className="glow fixed bottom-5 left-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-7 w-7" />}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="glass fixed bottom-22 left-5 z-40 flex h-[580px] w-[min(480px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl shadow-2xl border border-primary/30 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3 bg-card/70 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/15 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  Asistente IA FarmaciaDB
                  <span className="inline-block h-2 w-2 rounded-full bg-success animate-pulse" />
                </p>
                <p className="text-[11px] text-muted-foreground">Recomendaciones clínicas y gestión en vivo</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={clearChat}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Limpiar chat"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 space-y-3 overflow-y-auto p-3.5 text-sm">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col ${m.from === "user" ? "items-end" : "items-start w-full"}`}
              >
                <div
                  className={`max-w-[94%] rounded-2xl px-3.5 py-2.5 shadow-sm text-xs sm:text-sm leading-relaxed ${
                    m.from === "user"
                      ? "bg-primary text-primary-foreground rounded-br-xs whitespace-pre-line"
                      : "bg-card/95 border border-border/80 text-foreground rounded-bl-xs w-full"
                  }`}
                >
                  {m.from === "user" ? (
                    m.text
                  ) : (
                    <FormattedBotMessage text={m.text} />
                  )}
                </div>
                {m.time && (
                  <span className="text-[10px] text-muted-foreground mt-0.5 px-1">{m.time}</span>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card/70 border border-border/60 rounded-2xl px-3.5 py-2.5 w-fit">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>Consultando datos de FarmaciaDB con IA...</span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick suggestions */}
          <div className="px-3 py-1.5 border-t border-border/50 bg-card/40 flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={loading}
                className="text-[11px] rounded-full border border-border bg-background/80 hover:bg-primary/10 hover:border-primary/40 px-2.5 py-1 text-muted-foreground hover:text-foreground transition-all cursor-pointer text-left"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t p-2.5 bg-card/80"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={startVoiceInput}
              title="Preguntar por voz"
              className={`h-9 w-9 shrink-0 ${
                isListening ? "bg-destructive/20 text-destructive animate-pulse ring-2 ring-destructive" : "text-muted-foreground"
              }`}
            >
              <Mic className="h-4 w-4" />
            </Button>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Escuchando... habla ahora" : "Pregunta sobre síntomas, medicamentos, stock, ventas..."}
              className="h-9 text-xs sm:text-sm bg-background/60"
              disabled={loading}
            />

            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || loading}
              className="h-9 w-9 shrink-0"
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
