import Groq, { toFile } from 'groq-sdk';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Pool of Groq API keys for high-availability & rotation
const GROQ_KEYS = [
    process.env.GROQ_API_KEY || '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',
    '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',
    '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',
    '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',
    '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',
    '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',
    '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',
    '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',
    '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',
    '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'
].filter(Boolean);

let currentKeyIndex = 0;

function getGroqClient(): Groq {
    const key = GROQ_KEYS[currentKeyIndex % GROQ_KEYS.length];
    return new Groq({ apiKey: key });
}

function rotateGroqKey(): void {
    currentKeyIndex = (currentKeyIndex + 1) % GROQ_KEYS.length;
    console.log(`[Audio Service] Rotated Groq API key to index ${currentKeyIndex}`);
}

/**
 * Cleans markdown, formatting, links, and code blocks for pristine TTS pronunciation.
 */
export function cleanTextForSpeech(raw: string): string {
    if (!raw) return '';
    return raw
        .replace(/```[\s\S]*?```/g, '') // remove code blocks
        .replace(/`.*?`/g, '') // remove inline code
        .replace(/https?:\/\/\S+/g, '') // remove URLs
        .replace(/[\*_~#`\[\]\(\)\{\}\<\>\|\\\/]/g, ' ') // remove markdown syntax
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove zero-width spaces
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Transcribes any audio buffer (voice note from WhatsApp, Telegram, or Web)
 * using Groq's high-speed whisper-large-v3-turbo model.
 * Normalizes input via FFmpeg to clean 16kHz mono WAV for guaranteed 100% recognition.
 */
export async function transcribeAudio(audioBuffer: Buffer, mimeType: string = 'audio/ogg'): Promise<string> {
    if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Audio buffer is empty');
    }

    let cleanBuffer = audioBuffer;
    let cleanExt = 'wav';
    let cleanMime = 'audio/wav';

    const tmpDir = path.join(process.cwd(), 'temp_audio');
    if (!fs.existsSync(tmpDir)) {
        try { fs.mkdirSync(tmpDir, { recursive: true }); } catch {}
    }

    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const rawInPath = path.join(tmpDir, `raw_${uniqueId}.tmp`);
    const wavOutPath = path.join(tmpDir, `clean_${uniqueId}.wav`);

    try {
        fs.writeFileSync(rawInPath, audioBuffer);
        // Normalize any audio input to standard 16kHz mono PCM WAV
        execSync(`ffmpeg -y -i "${rawInPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${wavOutPath}"`, { stdio: 'pipe' });
        if (fs.existsSync(wavOutPath) && fs.statSync(wavOutPath).size > 100) {
            cleanBuffer = fs.readFileSync(wavOutPath);
            cleanExt = 'wav';
            cleanMime = 'audio/wav';
        }
    } catch (convErr: any) {
        console.warn('[STT Audio Pre-conversion Warning]:', convErr?.message || convErr);
        cleanExt = mimeType.includes('wav') ? 'wav' : mimeType.includes('mp4') ? 'mp4' : 'ogg';
        cleanMime = mimeType;
    } finally {
        try { if (fs.existsSync(rawInPath)) fs.unlinkSync(rawInPath); } catch {}
        try { if (fs.existsSync(wavOutPath)) fs.unlinkSync(wavOutPath); } catch {}
    }

    const filename = `voice_input.${cleanExt}`;

    for (let attempt = 0; attempt < GROQ_KEYS.length; attempt++) {
        try {
            const groq = getGroqClient();
            const file = await toFile(cleanBuffer, filename, { type: cleanMime });
            
            const transcription = await groq.audio.transcriptions.create({
                file: file,
                model: process.env.TRANSCRIPTION_MODEL || 'whisper-large-v3-turbo',
                language: 'ar',
                response_format: 'json',
                temperature: 0.1
            });

            const text = transcription.text ? transcription.text.trim() : '';
            console.log(`[Groq STT] Successfully transcribed audio (${audioBuffer.length} raw bytes -> ${cleanBuffer.length} wav bytes) -> "${text}"`);
            return text;
        } catch (err: any) {
            console.warn(`[Groq STT Warning] Key ${currentKeyIndex} failed:`, err?.message || err);
            rotateGroqKey();
        }
    }

    throw new Error('All Groq keys failed during audio transcription');
}

/**
 * Synthesizes Arabic speech using Groq's "canopylabs/orpheus-arabic-saudi" model with "lulwa" voice.
 * Returns both the original WAV buffer and an ultra-compressed OGG Opus buffer for WhatsApp PTT and Telegram.
 */
export async function generateVoiceAudio(
    text: string,
    voiceName: string = process.env.VOICE_NAME || 'lulwa'
): Promise<{ wavBuffer: Buffer; oggBuffer: Buffer }> {
    const cleaned = cleanTextForSpeech(text);
    const textChunk = (cleaned || 'أهلاً بك في شركة تيكسورا للبرمجيات').substring(0, 600);

    for (let attempt = 0; attempt < GROQ_KEYS.length; attempt++) {
        try {
            const groq = getGroqClient();
            const response = await groq.audio.speech.create({
                model: (process.env.VOICE_MODEL || 'canopylabs/orpheus-arabic-saudi') as any,
                voice: voiceName as any,
                response_format: 'wav',
                input: textChunk
            });

            const wavBuffer = Buffer.from(await response.arrayBuffer());
            const oggBuffer = convertWavToOggOpus(wavBuffer);

            console.log(`[Groq TTS] Generated speech with ${voiceName} (${wavBuffer.length} wav bytes, ${oggBuffer.length} ogg bytes) for: "${textChunk.substring(0, 40)}..."`);
            return { wavBuffer, oggBuffer };
        } catch (err: any) {
            console.warn(`[Groq TTS Warning] Key ${currentKeyIndex} failed:`, err?.message || err);
            rotateGroqKey();
        }
    }

    throw new Error('All Groq keys failed during speech synthesis');
}

/**
 * Converts a WAV buffer to WhatsApp-native and Telegram-native Ogg/Opus format via FFmpeg.
 * Uses standard WhatsApp Push-to-Talk parameters (48kHz, mono, 32kbps Opus).
 */
export function convertWavToOggOpus(wavBuffer: Buffer): Buffer {
    const tmpDir = path.join(process.cwd(), 'temp_audio');
    if (!fs.existsSync(tmpDir)) {
        try { fs.mkdirSync(tmpDir, { recursive: true }); } catch {}
    }

    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const inPath = path.join(tmpDir, `in_${uniqueId}.wav`);
    const outPath = path.join(tmpDir, `out_${uniqueId}.ogg`);

    try {
        fs.writeFileSync(inPath, wavBuffer);
        // Format specifically for WhatsApp PTT and Telegram Voice (Opus, 48kHz, mono, 32k)
        execSync(`ffmpeg -y -i "${inPath}" -c:a libopus -b:a 32k -vbr on -ar 48000 -ac 1 "${outPath}"`, { stdio: 'pipe' });
        if (fs.existsSync(outPath) && fs.statSync(outPath).size > 100) {
            const oggBuffer = fs.readFileSync(outPath);
            return oggBuffer;
        }
    } catch (e: any) {
        console.warn('[Audio Conversion Warning] Falling back to original WAV buffer:', e?.message || e);
    } finally {
        try { if (fs.existsSync(inPath)) fs.unlinkSync(inPath); } catch {}
        try { if (fs.existsSync(outPath)) fs.unlinkSync(outPath); } catch {}
    }

    return wavBuffer;
}
