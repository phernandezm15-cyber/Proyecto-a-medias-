/**
 * Express Server with Vite middlewares in development
 * and Gemini AI endpoints for FarmaciaDB assistant.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

import fs from 'fs';
import { exec } from 'child_process';
import util from 'util';
import { pipeline } from '@xenova/transformers';
import { createRequire } from 'module';
import { generateExpertPharmacyReply } from './src/lib/pharmacy-ai-engine.ts';

const require = createRequire(import.meta.url);
const { WaveFile } = require('wavefile');
const execAsync = util.promisify(exec);

// Singleton for Whisper model (offline, local, zero API keys required)
let whisperPromise: Promise<any> | null = null;
function getWhisperPipeline() {
  if (!whisperPromise) {
    whisperPromise = pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny');
  }
  return whisperPromise;
}
// Pre-warm Whisper pipeline on boot
getWhisperPipeline().catch((e) => console.warn('Whisper preload error:', e.message));

app.use(express.json({ limit: '20mb' }));

// Server-side Gemini initialization
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Audio transcription endpoint for microphone searches (Works on Opera GX, Chrome, Edge, Safari, Firefox)
app.post('/api/ai/voice-transcribe', async (req, res) => {
  try {
    const { audioBase64 } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio no proporcionado' });
    }

    const buffer = Buffer.from(audioBase64, 'base64');
    const timestamp = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const inPath = `/tmp/voice_${timestamp}.raw`;
    const outPath = `/tmp/voice_${timestamp}.wav`;

    await fs.promises.writeFile(inPath, buffer);

    try {
      // Convert any audio format (WebM, Opus, OGG, MP4, WAV) to 16kHz mono 16-bit PCM WAV using ffmpeg
      await execAsync(`ffmpeg -i "${inPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${outPath}" -y 2>/dev/null`);

      const wavBuffer = await fs.promises.readFile(outPath);
      const wav = new WaveFile(wavBuffer);
      wav.toBitDepth('32f');
      wav.toSampleRate(16000);
      let audioData = wav.getSamples();
      if (Array.isArray(audioData)) {
        if (audioData.length > 1) {
          const SCALING_FACTOR = Math.sqrt(2);
          for (let i = 0; i < audioData[0].length; ++i) {
            audioData[0][i] = (audioData[0][i] + audioData[1][i]) / SCALING_FACTOR;
          }
        }
        audioData = audioData[0];
      }

      const asr = await getWhisperPipeline();
      const output = await asr(audioData, { language: 'spanish', task: 'transcribe' });

      let recognizedText = (output.text || '').trim();

      // Clean brackets, music/laughter markers, quotes, and punctuation
      recognizedText = recognizedText
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/^[.,;:!?¿¡"'\s]+|[.,;:!?¿¡"'\s]+$/g, '')
        .trim();

      console.log(`[Audio Transcribe] Recognized text: "${recognizedText}"`);
      return res.json({ text: recognizedText });
    } finally {
      // Clean up temporary audio files
      fs.promises.unlink(inPath).catch(() => {});
      fs.promises.unlink(outPath).catch(() => {});
    }
  } catch (error: any) {
    console.error('Error en /api/ai/voice-transcribe:', error);
    return res.status(500).json({ error: error.message });
  }
});

// AI Chatbot endpoint with farmacia context grounding
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, context, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'El mensaje es requerido' });
    }

    const { meds = [], ventas = [], clientes = [], compras = [] } = context || {};

    // Comprehensive Pharmaceutical Intelligence Engine
    const reply = generateExpertPharmacyReply(message, context);
    return res.json({ reply });
  } catch (err: any) {
    console.error('Error en /api/ai/chat:', err);
    return res.status(500).json({
      error: err.message || 'Error al procesar la solicitud con el asistente de IA',
    });
  }
});



// Setup Vite development server or static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FarmaciaDB Server activo en http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
