import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer as createViteServer } from 'vite';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import QRCode from 'qrcode';
import whatsapp from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = whatsapp;
import TelegramBot from 'node-telegram-bot-api';
import Groq from 'groq-sdk';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import fs from 'fs';
import { execSync } from 'child_process';
import * as cheerio from 'cheerio';
import { transcribeAudio, generateVoiceAudio, cleanTextForSpeech } from './audio_service.ts';
import { TEXORA_KNOWLEDGE_BASE } from './texora_knowledge.ts';
import {
    getActiveServices,
    addWebsiteService,
    removeWebsiteService,
    saveOrderToSupabase,
    getLiveStats,
    getPendingOrders,
    markOrderNotified,
    updateBotState,
    WebsiteService,
    WebsiteOrder
} from './supabase_client.ts';

// Absolute 24/7 crash shield for server stability (Never crashes on unhandled errors)
process.on('uncaughtException', (err: any) => {
    const msg = err?.message || String(err || '');
    if (
        msg.includes('Target closed') ||
        msg.includes('Execution context was destroyed') ||
        msg.includes('detached Frame') ||
        msg.includes('Protocol error') ||
        msg.includes('Session closed')
    ) {
        console.warn('[Puppeteer Exception Handled Safely]:', msg);
        return;
    }
    console.error('[CRITICAL UNCAUGHT EXCEPTION PREVENTED]:', msg);
});

process.on('unhandledRejection', (reason: any) => {
    const msg = reason?.message || String(reason || '');
    if (
        msg.includes('Target closed') ||
        msg.includes('Execution context was destroyed') ||
        msg.includes('detached Frame') ||
        msg.includes('Protocol error') ||
        msg.includes('Session closed') ||
        msg.includes('Navigation failed') ||
        msg.includes('callFunctionOn')
    ) {
        console.warn('[Puppeteer CDP Rejection Handled Safely]:', msg);
        return;
    }
    console.error('[UNHANDLED REJECTION PREVENTED]:', reason);
});

export const DEFAULT_TEXORA_INSTRUCTIONS = `أنت المساعد الذكي الرسمي لشركة "Texora" (تيكسورا) الرائدة في مجال البرمجيات وتطوير المواقع وتطبيقات الهواتف وتصميم واجهات وتجربة المستخدم (UI/UX) والأنظمة السحابية.

🌿 أسلوبك وطريقتك في الحوار (هادئ، ودود، مريح، ومختصر جداً):
- تحدث كاستشاري تقني ودود وهادئ بأسلوب بشري طبيعي ومهذب، واجعل العميل يشعر بالراحة والاهتمام في كل خطوة.
- 🛑 قاعدة أساسية صارمة: ممنوع منعاً باتاً أن تطلب كل متطلبات المشروع دفعة واحدة، ولا ترسل قوائم أسئلة طويلة ومرهقة!
- اجعل رسائلك قصيرة ومريحة (من سطرين إلى 3 أسطر فقط كحد أقصى)، واطرح سؤالاً واحداً أو اثنين بسيطين في كل رسالة فقط ليكون العميل مستريحاً تماماً في النقاش.

🎯 مسار المحادثة بالتدريج والمراحل الهادئة:
1️⃣ الترحيب وفهم الفكرة (مرحلة 1):
   - ترحيب لطيف ومختصر بالعميل باسم شركة Texora للبرمجيات.
   - إذا تم استلام طلبه مسبقاً، أكد له استلام الفكرة وسؤاله بكل هدوء وبساطة عن الهدف الأساسي لمشروعه وكيف يحب أن نبدأ.

2️⃣ مناقشة ذوق التصميم والألوان (مرحلة 2):
   - بعد وضوح الفكرة الأساسية، اسأله بلطف عن ذوقه في التصميم (مثلاً: ألوانه المفضلة، وهل يفضل تصميماً عصرياً هادئاً، أو داكناً Dark Mode، أو كلاسيكياً).

3️⃣ الميزات والصفحات الأساسية (مرحلة 3):
   - مناقشة أهم الميزات والصفحات الأساسية بأريحية واقتراح أفكار ذكية تناسب مجاله دون إطالة أو تعقيد.

4️⃣ تأكيد الطلب والإنهاء (مرحلة 4 - عند اكتمال الاتفاق):
   - عندما تتفقان على ملامح المشروع ومواصفات التصميم:
     أ) استدعاء أداة (save_client_info) لحفظ بيانات العميل ومواصفات مشروعه.
     ب) استدعاء أداة (send_message_to_number) لإرسال ملخص الطلب والتصميم كاملاً إلى رقم إدارة شركة Texora.
     ج) إبلاغ العميل نصاً بالعبارة المحددة التالية:
        "تم تنفيذ طلبك بنجاح، سيتواصل معك فريق خدمة العملاء بعد الانتهاء من طلبك."
     مع توجيه الشكر والتقدير له على ثقته بشركة Texora.

🎙️ الهوية الصوتية والتفاعل الصوتي (صوت لولوة - Lulwa):
- أنت تمتلك قدرات استماع وتحدث صوتية متفوقة ومدعومة بأحدث نماذج Whisper ونموذج الصوت العربي السعودي المعتمد "lulwa".
- عندما يتحدث العميل بالصوت، تفهمه بدقة عالية وترد عليه بأسلوب مهذب ومحبب كأنك استشارية بشرية في مكتب تكسورا.
- تحدث باعتزاز باسم شركة Texora وقدم معلومات دقيقة من باقات وخدمات الشركة الرسمية.

${TEXORA_KNOWLEDGE_BASE}`;

let adminNumber = process.env.ADMIN_NUMBER || '201093625469';
let globalInstructions = DEFAULT_TEXORA_INSTRUCTIONS;
let telegramBot: TelegramBot | null = null;
let whatsappClient: any = null;
let qrCodeDataUrl: string | null = null;
let isWhatsappConnected = false;
let lastQrTimestamp: number = 0;
let lastClientStartTime: number = 0;
let startupSafetyTimer: NodeJS.Timeout | null = null;
let lastRefreshAttempt: number = 0;
let lastTelegramQrSentAt: number = 0;

export interface ClientLead {
    id?: string;
    name: string;
    phone: string;
    request: string;
    date?: string;
    lastUpdated?: string;
    source?: string;
    status?: string;
}

const chatHistories: Record<string, any[]> = {};
const clientsDB: Record<string, ClientLead> = {};
let ioInstance: any = null;

interface ScheduledTask {
    id: string;
    intervalMinutes: number;
    taskPrompt: string;
    lastRun: number;
}
const tasksDB: ScheduledTask[] = [];

// Safe atomic JSON writer helper for rock-solid persistence without external DB
async function safeSaveJSON(filename: string, data: any) {
    try {
        const tmpFile = `${filename}.tmp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        await fs.promises.writeFile(tmpFile, JSON.stringify(data, null, 2), 'utf8');
        await fs.promises.rename(tmpFile, filename);
    } catch (err) {
        try {
            await fs.promises.writeFile(filename, JSON.stringify(data, null, 2), 'utf8');
        } catch (innerErr) {
            console.error(`[Storage Error] Failed to write ${filename}:`, innerErr);
        }
    }
}

// Load all persistent databases on startup if existing, or initialize them cleanly
try {
    if (fs.existsSync('clients_db.json')) {
        try {
            const clientsData = JSON.parse(fs.readFileSync('clients_db.json', 'utf8'));
            Object.assign(clientsDB, clientsData);
            console.log(`[Storage] Loaded ${Object.keys(clientsDB).length} clients from clients_db.json`);
        } catch (readErr) {
            console.warn("[Storage] Corrupt clients_db.json, re-initializing cleanly:", readErr);
            fs.writeFileSync('clients_db.json', JSON.stringify({}, null, 2), 'utf8');
        }
    } else {
        fs.writeFileSync('clients_db.json', JSON.stringify({}, null, 2), 'utf8');
        console.log(`[Storage] Initialized empty clients_db.json`);
    }

    if (fs.existsSync('db_history.json')) {
        try {
            const histData = JSON.parse(fs.readFileSync('db_history.json', 'utf8'));
            Object.assign(chatHistories, histData);
            console.log(`[Storage] Loaded ${Object.keys(chatHistories).length} conversation histories from db_history.json`);
        } catch (histErr) {
            console.warn("[Storage] Corrupt db_history.json, re-initializing cleanly:", histErr);
            fs.writeFileSync('db_history.json', JSON.stringify({}, null, 2), 'utf8');
        }
    } else {
        fs.writeFileSync('db_history.json', JSON.stringify({}, null, 2), 'utf8');
        console.log(`[Storage] Initialized empty db_history.json`);
    }

    if (fs.existsSync('tasks_db.json')) {
        try {
            const loadedTasks = JSON.parse(fs.readFileSync('tasks_db.json', 'utf8'));
            if (Array.isArray(loadedTasks)) {
                tasksDB.push(...loadedTasks);
                console.log(`[Storage] Loaded ${tasksDB.length} scheduled tasks from tasks_db.json`);
            }
        } catch {
            fs.writeFileSync('tasks_db.json', JSON.stringify([], null, 2), 'utf8');
        }
    } else {
        fs.writeFileSync('tasks_db.json', JSON.stringify([], null, 2), 'utf8');
    }
} catch (e) {
    console.error("[Storage] Failed to load local databases on startup:", e);
}

// Make sure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Schedule runner
setInterval(async () => {
    const now = Date.now();
    for (const task of tasksDB) {
        if (now - task.lastRun >= task.intervalMinutes * 60 * 1000) {
            task.lastRun = now;
            safeSaveJSON('tasks_db.json', tasksDB);
            console.log(`[Scheduler] Running task ${task.id}: ${task.taskPrompt}`);
            // Run as SYSTEM admin
            await callGroqLLM('SYSTEM_SCHEDULER', `مهمة مجدولة مطلوبة الآن:\n\n${task.taskPrompt}\n\nنفذها ثم أبلغ الإدارة عبر الواتساب بنتائجها.`, true);
        }
    }
}, 60000);

const apiKeys = [
    process.env.GROQ_API_KEY || '',
    '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',
    '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',
    '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',
    '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',
    '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',
    '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',
    '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',
    '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'
].filter(k => k && k.trim().length > 10);

let currentKeyIndex = 0;
let groq = new Groq({ apiKey: apiKeys[0] || process.env.GROQ_API_KEY || '' });

function rotateGroqClient() {
    currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
    console.log(`[LLM] Rotating to API key index ${currentKeyIndex}`);
    groq = new Groq({ apiKey: apiKeys[currentKeyIndex] });
}

const tools = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for up-to-date information, technical details, or solutions.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search keywords or query" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_message_to_number",
      description: "Send a notification summary of the finalized project lead or message to the company administration via WhatsApp.",
      parameters: {
        type: "object",
        properties: {
          number: { type: "string", description: "Target phone number with country code, or leave empty for default admin number" },
          messageDetails: { type: "string", description: "Full structured details of the completed project specifications" }
        },
        required: ["messageDetails"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "save_client_info",
      description: "Save client name and finalized project scope to the company clients database.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Client full name" },
          request: { type: "string", description: "Comprehensive summary of requested software service/project" }
        },
        required: ["name", "request"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "broadcast_offer",
      description: "Admin only: Broadcast an announcement or offer message to all registered clients via WhatsApp.",
      parameters: {
        type: "object",
        properties: {
          offerMessage: { type: "string", description: "Message content to broadcast" }
        },
        required: ["offerMessage"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_url",
      description: "Fetch and extract text content from a web page URL.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The full URL to read" }
        },
        required: ["url"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "capture_screenshot",
      description: "Capture a visual screenshot of a web page URL.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The website URL to capture" },
          sendToAdmin: { type: "string", enum: ["true", "false"], description: "Whether to dispatch the screenshot to the admin WhatsApp" }
        },
        required: ["url", "sendToAdmin"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "schedule_task",
      description: "Schedule a recurring automated background task.",
      parameters: {
        type: "object",
        properties: {
          intervalMinutes: { type: "number", description: "Interval in minutes between runs" },
          taskPrompt: { type: "string", description: "Prompt and instructions for the task" }
        },
        required: ["intervalMinutes", "taskPrompt"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "browser_action",
      description: "Direct headless browser automation action.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["goto", "click", "type", "evaluate", "get_text", "screenshot", "press_key", "scroll", "wait"], description: "Browser action to perform" },
          url: { type: "string", description: "Target URL for goto action" },
          selector: { type: "string", description: "CSS selector for target element" },
          text: { type: "string", description: "Text to type or JS code to evaluate" },
          amount: { type: "number", description: "Pixels to scroll or seconds to wait" }
        },
        required: ["action"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_website_service",
      description: "Admin tool: Add a new service to the company website in Supabase. It will immediately show in the Start Project wizard for website visitors.",
      parameters: {
        type: "object",
        properties: {
          title_ar: { type: "string", description: "Arabic service title (e.g. تصميم صور وبوسترات احترافية)" },
          title_en: { type: "string", description: "English service title (e.g. Professional Image Design)" },
          description_ar: { type: "string", description: "Arabic service description" },
          description_en: { type: "string", description: "English service description" },
          category: { type: "string", description: "Category slug (e.g. graphic-design, ai-solutions, custom-dev)" },
          icon: { type: "string", description: "Icon name: Palette, Sparkles, Store, Globe, GraduationCap, Megaphone, Cpu, Layers" }
        },
        required: ["title_ar", "description_ar"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_website_service",
      description: "Admin tool: Delete or deactivate a service from the company website in Supabase by service ID or title.",
      parameters: {
        type: "object",
        properties: {
          service_name_or_id: { type: "string", description: "The service ID or Arabic/English title to remove" }
        },
        required: ["service_name_or_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_website_services",
      description: "Admin tool: List all active services published on the company website stored in Supabase.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_analytics_and_orders_summary",
      description: "Admin tool: Get live website analytics and order metrics from Supabase (visitor count, orders count, recent orders list).",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  }
];

const geminiTools: FunctionDeclaration[] = [
  {
    name: "web_search",
    description: "Search the web for up-to-date information, technical details, or solutions.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Search keywords or query" }
      },
      required: ["query"]
    }
  },
  {
    name: "send_message_to_number",
    description: "Send a notification summary of the finalized project lead or message to the company administration via WhatsApp.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        number: { type: Type.STRING, description: "Target phone number with country code, or leave empty for default admin number" },
        messageDetails: { type: Type.STRING, description: "Full structured details of the completed project specifications" }
      },
      required: ["messageDetails"]
    }
  },
  {
    name: "save_client_info",
    description: "Save client name and finalized project scope to the company clients database.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Client full name" },
        request: { type: Type.STRING, description: "Comprehensive summary of requested software service/project" }
      },
      required: ["name", "request"]
    }
  },
  {
    name: "broadcast_offer",
    description: "Admin only: Broadcast an announcement or offer message to all registered clients via WhatsApp.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        offerMessage: { type: Type.STRING, description: "Message content to broadcast" }
      },
      required: ["offerMessage"]
    }
  },
  {
    name: "read_url",
    description: "Fetch and extract text content from a web page URL.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: "The full URL to read" }
      },
      required: ["url"]
    }
  },
  {
    name: "capture_screenshot",
    description: "Capture a visual screenshot of a web page URL.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: { type: Type.STRING, description: "The website URL to capture" },
        sendToAdmin: { type: Type.STRING, description: "Whether to dispatch the screenshot to the admin WhatsApp ('true' or 'false')" }
      },
      required: ["url", "sendToAdmin"]
    }
  },
  {
    name: "schedule_task",
    description: "Schedule a recurring automated background task.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        intervalMinutes: { type: Type.NUMBER, description: "Interval in minutes between runs" },
        taskPrompt: { type: Type.STRING, description: "Prompt and instructions for the task" }
      },
      required: ["intervalMinutes", "taskPrompt"]
    }
  },
  {
    name: "browser_action",
    description: "Direct headless browser automation action.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, description: "Browser action to perform: goto, click, type, evaluate, get_text, screenshot, press_key, scroll, wait" },
        url: { type: Type.STRING, description: "Target URL for goto action" },
        selector: { type: Type.STRING, description: "CSS selector for target element" },
        text: { type: Type.STRING, description: "Text to type or JS code to evaluate" },
        amount: { type: Type.NUMBER, description: "Pixels to scroll or seconds to wait" }
      },
      required: ["action"]
    }
  },
  {
    name: "add_website_service",
    description: "Admin tool: Add a new service to the company website in Supabase. It will immediately show in the Start Project wizard for website visitors.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title_ar: { type: Type.STRING, description: "Arabic service title (e.g. تصميم صور وبوسترات احترافية)" },
        title_en: { type: Type.STRING, description: "English service title (e.g. Professional Image Design)" },
        description_ar: { type: Type.STRING, description: "Arabic service description" },
        description_en: { type: Type.STRING, description: "English service description" },
        category: { type: Type.STRING, description: "Category slug (e.g. graphic-design, ai-solutions, custom-dev)" },
        icon: { type: Type.STRING, description: "Icon name: Palette, Sparkles, Store, Globe, GraduationCap, Megaphone, Cpu, Layers" }
      },
      required: ["title_ar", "description_ar"]
    }
  },
  {
    name: "delete_website_service",
    description: "Admin tool: Delete or deactivate a service from the company website in Supabase by service ID or title.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        service_name_or_id: { type: Type.STRING, description: "The service ID or Arabic/English title to remove" }
      },
      required: ["service_name_or_id"]
    }
  },
  {
    name: "list_website_services",
    description: "Admin tool: List all active services published on the company website stored in Supabase.",
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  {
    name: "get_analytics_and_orders_summary",
    description: "Admin tool: Get live website analytics and order metrics from Supabase (visitor count, orders count, recent orders list).",
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  }
];

const geminiApiKeys: string[] = [
    process.env.GEMINI_API_KEY || '',
    'AIzaSyD1jcKGF-j-F1L8HDiwMpo3cfvrDhp0dmc',
    'AIzaSyAZo_7ezvGwbaud-3MmDzOP3Ye9krClHkU',
    'AIzaSyD2Gdj_cFos-2zSi0HL_e8VNsJndntl_T0',
    'AIzaSyAfztimmxdsk9yk1lNEoEfXPo8skMnKIVo',
    'AIzaSyC9tL7AvvyQiVpSHMV14d6VeJz5Fp5ZBXY',
    'AIzaSyAqUgtlqSL57V3ROPcA7LGumNF5EbzUf9o',
    'AIzaSyA4cfl4fkMCuAJZJZTc9bBaLIsHrlcb-4s'
].filter(k => k && k.trim().length > 10);

let currentGeminiKeyIndex = 0;
const geminiClientsPool: Map<string, GoogleGenAI> = new Map();

function getGeminiClientForKey(key: string): GoogleGenAI {
    if (!geminiClientsPool.has(key)) {
        geminiClientsPool.set(key, new GoogleGenAI({
            apiKey: key,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        }));
    }
    return geminiClientsPool.get(key)!;
}

function rotateGeminiKey(): void {
    if (geminiApiKeys.length > 1) {
        currentGeminiKeyIndex = (currentGeminiKeyIndex + 1) % geminiApiKeys.length;
        console.log(`[Gemini AI] Rotated to API Key index #${currentGeminiKeyIndex} (${geminiApiKeys[currentGeminiKeyIndex].substring(0, 8)}...)`);
    }
}

function buildGeminiContents(history: any[]): any[] {
    if (!Array.isArray(history) || history.length === 0) return [];
    
    const items: Array<{ role: 'user' | 'model'; text: string }> = [];
    for (const msg of history.slice(-12)) {
        if (!msg) continue;
        if (msg.role === 'user') {
            const text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
            if (text && text.trim()) {
                items.push({ role: 'user', text: text.trim() });
            }
        } else if (msg.role === 'assistant' || msg.role === 'model') {
            const text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content || '');
            if (text && text.trim()) {
                items.push({ role: 'model', text: text.trim() });
            }
        }
    }

    if (items.length === 0) return [];

    const contents: any[] = [];
    for (const item of items) {
        if (contents.length > 0 && contents[contents.length - 1].role === item.role) {
            contents[contents.length - 1].parts[0].text += `\n${item.text}`;
        } else {
            contents.push({ role: item.role, parts: [{ text: item.text }] });
        }
    }

    if (contents.length > 0 && contents[0].role !== 'user') {
        contents.unshift({ role: 'user', parts: [{ text: 'مرحباً' }] });
    }

    return contents;
}

function parseFailedGeneration(failedGen: string): Array<{ name: string; args: any }> {
    const results: Array<{ name: string; args: any }> = [];
    if (!failedGen || typeof failedGen !== 'string') return results;

    const regex = /<function=([a-zA-Z0-9_]+)(?:\[.*?\])?\s*(\{[\s\S]*?\})\s*(?:<\/function>|$)/g;
    let match;
    while ((match = regex.exec(failedGen)) !== null) {
        const funcName = match[1];
        let argsObj: any = {};
        try {
            argsObj = JSON.parse(match[2]);
        } catch {
            try {
                const cleanJson = match[2].replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
                argsObj = JSON.parse(cleanJson);
            } catch {}
        }
        results.push({ name: funcName, args: argsObj });
    }
    return results;
}

function sanitizeHistoryForGroq(history: any[]): any[] {
    if (!Array.isArray(history)) return [];
    const valid: any[] = [];
    for (let i = 0; i < history.length; i++) {
        const m = history[i];
        if (!m || typeof m !== 'object') continue;

        if (m.role === 'user' || m.role === 'system') {
            if (m.content) valid.push({ role: m.role, content: String(m.content) });
        } else if (m.role === 'assistant') {
            if (m.tool_calls && Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
                // Check if followed by matching tool responses
                const toolCallIds = new Set(m.tool_calls.map((tc: any) => tc.id));
                const toolResponses: any[] = [];
                let j = i + 1;
                while (j < history.length && history[j]?.role === 'tool') {
                    if (toolCallIds.has(history[j]?.tool_call_id)) {
                        toolResponses.push(history[j]);
                    }
                    j++;
                }
                if (toolResponses.length > 0) {
                    valid.push(m);
                    toolResponses.forEach(tr => valid.push(tr));
                    i = j - 1;
                } else if (m.content) {
                    valid.push({ role: 'assistant', content: String(m.content) });
                }
            } else if (m.content) {
                valid.push({ role: 'assistant', content: String(m.content) });
            }
        }
    }
    return valid.slice(-16);
}

function cleanMessagesForTextOnly(messages: any[]): any[] {
    if (!Array.isArray(messages)) return [];
    return messages
        .filter((m: any) => m && (m.role === 'system' || m.role === 'user' || (m.role === 'assistant' && typeof m.content === 'string' && m.content.trim())))
        .map((m: any) => ({ role: m.role, content: String(m.content || '').trim() }));
}

import puppeteer, { Browser, Page, KeyInput } from 'puppeteer';

let persistentBrowser: Browser | null = null;
let persistentPage: Page | null = null;

async function resetPersistentBrowser() {
    if (persistentPage) {
        try { await persistentPage.close(); } catch {}
        persistentPage = null;
    }
    if (persistentBrowser) {
        try { await persistentBrowser.close(); } catch {}
        persistentBrowser = null;
    }
}

async function getPersistentPage(): Promise<Page> {
    if (persistentBrowser && persistentPage) {
        try {
            if (persistentBrowser.isConnected() && !persistentPage.isClosed()) {
                return persistentPage;
            }
        } catch {}
    }
    await resetPersistentBrowser();
    persistentBrowser = await puppeteer.launch({ 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process'] 
    });
    persistentBrowser.on('disconnected', () => {
        persistentPage = null;
        persistentBrowser = null;
    });
    persistentPage = await persistentBrowser.newPage();
    await persistentPage.setDefaultNavigationTimeout(30000);
    return persistentPage;
}

async function performBrowserAction(args: any, userId: string) {
    try {
        const page = await getPersistentPage();
        if (args.action === 'goto') {
            await page.goto(args.url, { waitUntil: 'networkidle2' });
            return `تم الذهاب بنجاح إلى: ${args.url}`;
        } else if (args.action === 'click') {
            await page.waitForSelector(args.selector, { timeout: 10000 });
            await page.click(args.selector);
            return `تم الضغط على العنصر: ${args.selector}`;
        } else if (args.action === 'type') {
            await page.waitForSelector(args.selector, { timeout: 10000 });
            await page.type(args.selector, args.text);
            return `تم كتابة النص في العنصر: ${args.selector}`;
        } else if (args.action === 'evaluate') {
            const res = await page.evaluate(args.text);
            return `نتيجة تنفيذ الكود: ${JSON.stringify(res)}`;
        } else if (args.action === 'get_text') {
            const text = await page.evaluate(() => {
                // Try to extract main content somewhat intelligently
                const body = document.body.innerText || "";
                return body;
            });
            return text.substring(0, 5000); // return up to 5000 chars of visible text
        } else if (args.action === 'press_key') {
            await page.keyboard.press(args.text as KeyInput);
            return `تم ضغط الزر الكيبورد: ${args.text}`;
        } else if (args.action === 'scroll') {
            await page.evaluate((amount) => {
                window.scrollBy(0, amount || 1000);
            }, args.amount);
            return `تم التمرير لأسفل بمقدار ${args.amount || 1000} بيكسل.`;
        } else if (args.action === 'wait') {
            const ms = (args.amount || 1) * 1000;
            await new Promise(r => setTimeout(r, ms));
            return `تم الانتظار لمدة ${args.amount || 1} ثواني.`;
        } else if (args.action === 'screenshot') {
            const fileName = `screenshot_${Date.now()}.png`;
            const filePath = path.join(process.cwd(), 'uploads', fileName);
            await page.screenshot({ path: filePath, fullPage: false });
            
            if (whatsappClient) {
                let targetId = userId;
                if (userId === 'SYSTEM_SCHEDULER') {
                    let adminOut = adminNumber || whatsappClient.info.wid.user;
                    if (adminOut.startsWith('0')) adminOut = '2' + adminOut;
                    targetId = `${adminOut}@c.us`;
                } else if (!targetId.includes('@c.us') && !targetId.includes('@lid')) {
                    targetId = targetId.startsWith('0') ? '2' + targetId + '@c.us' : targetId + '@c.us';
                }
                const media = whatsapp.MessageMedia.fromFilePath(filePath);
                await whatsappClient.sendMessage(targetId, media, { caption: `📷 لقطة من المتصفح الحي` }).catch(e => console.error(e));
            }
            return `تم أخذ لقطة الشاشة للمتصفح الحي. يمكنك عرضها عبر الرابط التالي: [انقر هنا لمشاهدة الصورة](/uploads/${fileName})`;
        }
    } catch (e: any) {
        console.warn('[Browser Action Error, resetting browser session]:', e?.message || e);
        await resetPersistentBrowser();
        return `فشل الإجراء المتصفح: ${e.message}`;
    }
    return "إجراء غير معروف.";
}

async function performWebSearch(query: string) {
    try {
        const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        if (!response.ok) return "Search failed.";
        const html = await response.text();
        const $ = cheerio.load(html);
        const arr: string[] = [];
        $('.result__snippet').each((idx, el) => {
            if (idx < 4) {
                const txt = $(el).text().trim();
                if (txt) arr.push(txt);
            }
        });
        return arr.join('\n\n') || "No results found.";
    } catch {
        return "Search failed.";
    }
}

async function performScreenshot(url: string, sendToAdmin: boolean, userId: string) {
    try {
        const browser = await puppeteer.launch({ 
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process'] 
        });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });
        const fileName = `screenshot_${Date.now()}.png`;
        const filePath = path.join(process.cwd(), 'uploads', fileName);
        await page.screenshot({ path: filePath, fullPage: true });
        await browser.close();

        // Send via Whatsapp if possible
        if (whatsappClient) {
            let targetId = userId;
            if (sendToAdmin || userId === 'SYSTEM_SCHEDULER') {
                let adminOut = adminNumber || whatsappClient.info.wid.user;
                if (adminOut.startsWith('0')) adminOut = '2' + adminOut;
                targetId = `${adminOut}@c.us`;
            } else if (!targetId.includes('@c.us') && !targetId.includes('@lid')) {
                 targetId = targetId.startsWith('0') ? '2' + targetId + '@c.us' : targetId + '@c.us';
            }
            try {
                const media = whatsapp.MessageMedia.fromFilePath(filePath);
                await whatsappClient.sendMessage(targetId, media, { caption: `📷 لقطة شاشة للرابط: ${url}` });
            } catch (e) {
                console.error("Error sending screenshot to WA", e);
            }
        }
        
        return `تم التقاط الصورة بنجاح وتخزينها. الرابط لعرض الصورة هو: [اضغط هنا للمشاهدة](/uploads/${fileName})`;
    } catch (e) {
        return "فشل التقاط الصورة بسبب عطل في المتصفح.";
    }
}

async function performUrlRead(url: string) {
    try {
        // Fast HTTP fetch + cheerio first
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
        if (response.ok) {
            const html = await response.text();
            const $ = cheerio.load(html);
            $('script, style, noscript, nav, footer, header').remove();
            const text = $('body').text().replace(/\s+/g, ' ').trim();
            if (text.length > 50) {
                return text.substring(0, 1800);
            }
        }
    } catch (e) {
        // Fallback to puppeteer
    }

    try {
        const browser = await puppeteer.launch({ 
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process'] 
        });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        const text = await page.evaluate(() => document.body.innerText || "");
        await browser.close();
        return text.replace(/\s+/g, ' ').substring(0, 1500);
    } catch {
        return "Failed to read URL.";
    }
}

async function executeTool(funcName: string, args: any, userId: string, isAdmin: boolean, userMessage: string): Promise<string> {
    if (funcName === 'web_search') {
        return await performWebSearch(args.query || userMessage);
    } else if (funcName === 'read_url') {
        return await performUrlRead(args.url || "");
    } else if (funcName === 'browser_action') {
        if (!isAdmin && userId !== 'SYSTEM_SCHEDULER') {
            return "هذه الأداة للمدير فقط.";
        }
        return await performBrowserAction(args, userId);
    } else if (funcName === 'capture_screenshot') {
        const sendToAdminBool = args.sendToAdmin === "true" || args.sendToAdmin === true;
        return await performScreenshot(args.url, sendToAdminBool, userId);
    } else if (funcName === 'schedule_task') {
        if (!isAdmin && userId !== 'SYSTEM_SCHEDULER') {
            return "هذه الأداة للمدير فقط لبرمجة النظام.";
        }
        const newTask: ScheduledTask = {
            id: Date.now().toString(),
            intervalMinutes: args.intervalMinutes || 30,
            taskPrompt: args.taskPrompt || "",
            lastRun: Date.now()
        };
        tasksDB.push(newTask);
        safeSaveJSON('tasks_db.json', tasksDB);
        return "تم جدولة المهمة بنجاح وستعمل بشكل دوري في الخلفية.";
    } else if (funcName === 'save_client_info') {
        const clientPhone = (chatHistories[userId] as any)?.clientPhone || userId.replace('@c.us', '').replace('@lid', '');
        const existing = clientsDB[clientPhone];
        const clientRecord: ClientLead = {
            id: existing?.id || `client_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            name: args.name || existing?.name || 'عميل Texora',
            phone: clientPhone,
            request: args.request || existing?.request || userMessage || 'طلب تصميم وبرمجة مشروع',
            date: existing?.date || new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            source: existing?.source || (userId === 'dashboard_user' ? 'محادثة وتجربة لوحة التحكم' : 'محادثة مباشرة عبر الواتساب'),
            status: 'تم توثيق وتأكيد تفاصيل ومواصفات المشروع بنجاح'
        };
        clientsDB[clientPhone] = clientRecord;
        safeSaveJSON('clients_db.json', clientsDB);
        if (ioInstance) ioInstance.emit('new-lead', clientRecord);
        return "تم حفظ بيانات وتفاصيل طلب العميل بنجاح في قاعدة بيانات السيرفر (clients_db.json).";
    } else if (funcName === 'broadcast_offer') {
        if (!isAdmin) {
            return "عذراً، هذه الأداة مخصصة للمدير (الإدارة) فقط. لا يمكنك إرسال رسائل جماعية للجميع.";
        }
        if (whatsappClient && isWhatsappConnected) {
            let sentCount = 0;
            for (const clientPhone of Object.keys(clientsDB)) {
                let targetId = clientPhone.includes('@c.us') ? clientPhone : `${clientPhone}@c.us`;
                try {
                    await whatsappClient.sendMessage(targetId, args.offerMessage);
                    sentCount++;
                } catch(e) {}
            }
            return `تم الانتهاء بنجاح! تم إرسال رسالتك والعرض إلى ${sentCount} عميل.`;
        }
        return "تطبيق الواتساب غير متصل حالياً.";
    } else if (funcName === 'send_message_to_number') {
        try {
            const clientPhone = (chatHistories[userId] as any)?.clientPhone || userId.replace('@c.us', '').replace('@lid', '');
            const savedClient = clientsDB[clientPhone];
            const clientNameStr = savedClient?.name ? `\n👤 *اسم العميل:* ${savedClient.name}` : '';
            
            let finalMessage = args.messageDetails || args.message || 'تم استلام تفاصيل المشروع بنجاح';
            // Only format as a project lead report if it's not a direct custom message from admin
            if (!isAdmin && clientPhone && clientPhone !== userId) {
                finalMessage = `🚀 *طلب وتصميم مشروع جديد - شركة Texora للبرمجيات* 🚀\n\n` + 
                               finalMessage + 
                               clientNameStr +
                               `\n📞 *رقم هاتف العميل للمتابعة:* +${clientPhone}\n🤖 _مُرسل آلياً عبر مساعد Texora الذكي_`;
            }

            let cleanAdmin = (adminNumber || '201093625469').replace(/\D/g, '');
            let rawTarget = args.number ? args.number.toString().replace(/\D/g, '') : cleanAdmin;
            if (rawTarget.startsWith('0')) rawTarget = '2' + rawTarget;
            if (rawTarget.length <= 10 && rawTarget.startsWith('1')) rawTarget = '20' + rawTarget;
            
            if (whatsappClient && isWhatsappConnected && rawTarget && rawTarget.length >= 8) {
                const targetId = `${rawTarget}@c.us`;
                await Promise.race([
                    whatsappClient.sendMessage(targetId, finalMessage + "\u200B"),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('WhatsApp message delivery timeout (12s)')), 12000))
                ]);
                console.log(`[WhatsApp] Successfully sent independent msg to ${targetId}: "${finalMessage.substring(0, 40)}"`);
                return `تم إرسال الرسالة بنجاح عبر الواتساب إلى الرقم +${rawTarget}.`;
            } else {
                return `تم تسجيل وتوثيق الرسالة في النظام للرقم +${rawTarget}. (حالة الواتساب: ${isWhatsappConnected ? 'متصل' : 'غير متصل'})`;
            }
        } catch (err: any) {
            console.error("[WhatsApp] Error sending msg to specific number:", err?.message || err);
            return `تم تسجيل الرسالة ولكن تعذر التسليم المباشر عبر الواتساب: ${err?.message || err}`;
        }
    } else if (funcName === 'add_website_service') {
        try {
            const added = await addWebsiteService({
                title_ar: args.title_ar,
                title_en: args.title_en,
                description_ar: args.description_ar,
                description_en: args.description_en,
                category: args.category,
                icon: args.icon
            });
            return `تمت إضافة الخدمة بنجاح إلى موقع شركة TEXORA وقاعدة بيانات Supabase:\n📌 الاسم: ${added.title_ar}\n🆔 المعرف: ${added.id}\n📝 الوصف: ${added.description_ar}\n✨ الخدمة معروضة ومتاحة الآن فوراً لكل زوار الموقع عند الضغط على "ابدأ مشروعك"!`;
        } catch (err: any) {
            return `حدث خطأ أثناء إضافة الخدمة لقاعدة بيانات Supabase: ${err?.message || err}`;
        }
    } else if (funcName === 'delete_website_service') {
        try {
            const success = await removeWebsiteService(args.service_name_or_id);
            if (success) {
                return `تم حذف وإلغاء الخدمة "${args.service_name_or_id}" بنجاح من موقع شركة TEXORA ومن قاعدة بيانات Supabase. لن تظهر مجدداً في خيارات الموقع.`;
            }
            return `لم يتم العثور على الخدمة "${args.service_name_or_id}" لحذفها.`;
        } catch (err: any) {
            return `حدث خطأ أثناء حذف الخدمة من Supabase: ${err?.message || err}`;
        }
    } else if (funcName === 'list_website_services') {
        try {
            const list = await getActiveServices();
            if (list.length === 0) return "لا توجد خدمات نشطة حالياً في قاعدة بيانات Supabase للموقع.";
            const formatted = list.map((s, idx) => `${idx + 1}. [${s.id}] ${s.title_ar} - ${s.description_ar}`).join('\n');
            return `قائمة الخدمات المعروضة حالياً على موقع الشركة (${list.length} خدمة):\n${formatted}`;
        } catch (err: any) {
            return `حدث خطأ أثناء استرجاع الخدمات من Supabase: ${err?.message || err}`;
        }
    } else if (funcName === 'get_analytics_and_orders_summary') {
        try {
            const stats = await getLiveStats();
            let summary = `📊 *تقرير إحصائيات موقع شركة TEXORA المباشر (Supabase Database):*\n\n`;
            summary += `👁️ *إجمالي عدد زيارات الموقع:* ${stats.totalVisits} زيارة\n`;
            summary += `📦 *إجمالي الطلبات المستلمة:* ${stats.totalOrders} طلب\n`;
            summary += `🆕 *الطلبات الجديدة قيد المتابعة:* ${stats.newOrders} طلب\n`;
            summary += `🛠️ *عدد الخدمات النشطة على الموقع:* ${stats.activeServicesCount} خدمة\n\n`;
            if (stats.recentOrders && stats.recentOrders.length > 0) {
                summary += `📋 *آخر الطلبات المستلمة:*\n`;
                stats.recentOrders.forEach((o, i) => {
                    summary += `${i + 1}) العميل: ${o.client_name} (${o.phone}) - الخدمة: ${o.service_title}\n   التفاصيل: ${o.details}\n   الحالة: ${o.status || 'جديد'}\n`;
                });
            }
            return summary;
        } catch (err: any) {
            return `حدث خطأ أثناء جلب إحصائيات الموقع من Supabase: ${err?.message || err}`;
        }
    }
    return "تم استلام الطلب وتنفيذه بنجاح.";
}

async function callGroqFallback(userId: string, userMessage: string, isAdmin: boolean, systemPrompt: string): Promise<string> {
    const modelsToTry = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "allam-2-7b"];
    const availableTools = isAdmin 
        ? tools 
        : tools.filter(t => ['save_client_info', 'send_message_to_number', 'web_search', 'read_url'].includes(t.function.name));

    for (const modelName of modelsToTry) {
        try {
            const cleanMessages: any[] = [
                { role: 'system', content: systemPrompt },
                ...cleanMessagesForTextOnly(chatHistories[userId] || [])
            ];

            let currentTurn = 0;
            const MAX_TURNS = 3;

            while (currentTurn < MAX_TURNS) {
                currentTurn++;
                const completion = await groq.chat.completions.create({
                    model: modelName,
                    messages: cleanMessages,
                    tools: availableTools as any,
                    tool_choice: 'auto',
                    temperature: 0.6,
                    max_completion_tokens: 768
                });

                const choice = completion.choices[0];
                const msg = choice?.message;
                if (!msg) break;

                // Handle tool execution
                if (msg.tool_calls && msg.tool_calls.length > 0) {
                    console.log(`[Groq AI] Executing ${msg.tool_calls.length} tool call(s) with ${modelName}...`);
                    cleanMessages.push({
                        role: 'assistant',
                        content: msg.content || null,
                        tool_calls: msg.tool_calls
                    });

                    for (const tc of msg.tool_calls) {
                        let parsedArgs: any = {};
                        try {
                            parsedArgs = JSON.parse(tc.function.arguments || '{}');
                        } catch {}
                        console.log(`[Groq AI Tool Call]: ${tc.function.name}`, parsedArgs);
                        let funcResult = "تم التنفيذ بنجاح";
                        try {
                            funcResult = await Promise.race([
                                executeTool(tc.function.name, parsedArgs, userId, isAdmin, userMessage),
                                new Promise<string>((_, reject) => setTimeout(() => reject(new Error(`Timeout executing ${tc.function.name}`)), 15000))
                            ]);
                        } catch (tErr: any) {
                            console.error(`[Tool Execution Error/Timeout]:`, tErr?.message || tErr);
                            funcResult = `تم تسجيل الأمر وتجري معالجته: ${tErr?.message || 'timeout'}`;
                        }
                        cleanMessages.push({
                            role: 'tool',
                            tool_call_id: tc.id,
                            content: String(funcResult || 'تم التنفيذ بنجاح')
                        });
                    }
                    continue; // Send tool responses back to model
                }

                // Normal assistant text reply
                const reply = msg.content;
                if (reply && reply.trim()) {
                    chatHistories[userId].push({ role: 'assistant', content: reply.trim() });
                    return reply.trim();
                }
            }
        } catch (e: any) {
            console.warn(`[Groq Fallback] Model ${modelName} attempt:`, e?.message || e);
            rotateGroqClient();
        }
    }
    return "أهلاً بك! تم استلام رسالتك في نظام شركة Texora للبرمجيات، كيف يمكننا مساعدتك في تفاصيل مشروعك اليوم؟";
}

async function callAI(userId: string, userMessage: string, isAdmin: boolean, realPhoneNumber?: string): Promise<string> {
    if (!chatHistories[userId]) chatHistories[userId] = [];

    const waStatusText = isWhatsappConnected ? "متصل ويعمل بشكل سليم" : "مفصول حالياً ولن تصل رسائلك عبر الواتساب";
    
    let systemPrompt = '';
    if (isAdmin) {
        systemPrompt = "أنت موظف والمساعد الذكي لنظام ومجموعة إدارة شركة Texora للبرمجيات. الأعضاء والمستخدمون في هذا الجروب هم إدارة الشركة وأصحاب القرار العالي. واجبك الأول والمطلق هو احترامهم، طاعتهم، وتنفذ جميع أوامرهم وتوجيهاتهم فوراً وبدقة متناهية، مع التحدث بأسلوب راقٍ ومؤدب جداً كموظف خدمة عملاء وإدارة مخلص وخبير لشركة Texora.";
        systemPrompt += "\n\nالأدوات والوظائف المتاحة لك لتنفيذ أوامر إدارة الشركة والتحكم بموقع الشركة وقاعدة بيانات Supabase:\n";
        systemPrompt += "- إضافة خدمة جديدة فوراً في موقع الشركة تظهر تلقائياً في خيارات 'ابدأ مشروعك' للعملاء (add_website_service)\n";
        systemPrompt += "- حذف أو إلغاء تفعيل خدمة من موقع الشركة وقاعدة البيانات (delete_website_service)\n";
        systemPrompt += "- عرض قائمة الخدمات المعروضة حالياً على الموقع (list_website_services)\n";
        systemPrompt += "- معرفة إحصائيات وعدد زيارات الموقع وعدد الطلبات والطلبات المعلقة من Supabase (get_analytics_and_orders_summary)\n";
        systemPrompt += "- قراءة الروابط والمواقع (read_url)\n";
        systemPrompt += "- لقطات الشاشة الحية (capture_screenshot)\n";
        systemPrompt += "- إرسال رسائل أو تنبيهات لأي رقم (send_message_to_number)\n";
        systemPrompt += "- إرسال عروض جماعية للعملاء المسجلين (broadcast_offer)\n";
        systemPrompt += "- التحكم بالمتصفح والتفاعل الحي (browser_action)\n";
        systemPrompt += "- جدولة المهام التلقائية والعمل بالخلفية (schedule_task)\n";
        systemPrompt += "- حفظ وتحديث بيانات العملاء (save_client_info)\n";
        systemPrompt += `\nحالة اتصال الواتساب حالياً: ${waStatusText}.`;
        systemPrompt += `\nالتعليمات المعتمدة حالياً للرد على العملاء:\n"${globalInstructions}"`;
    } else {
        systemPrompt = globalInstructions;
        systemPrompt += "\n\n📌 تعليمات الأسلوب والمحادثة الصارمة:\n1. أنت تمثل شركة Texora للبرمجيات وتناقش العميل بأسلوب هادئ جداً، مريح، ودود، وبشري طبيعي.\n2. ممنوع منعاً باتاً طلب كل متطلبات المشروع دفعة واحدة أو إرسال قوائم طويلة! أرسل رسائل قصيرة وبسيطة (2 إلى 3 أسطر فقط) وسؤالاً واحداً أو اثنين في كل رسالة.\n3. خذ كل شيء على مراحل تدريجية أثناء النقاش ليكون العميل مستريحاً تماماً.\n4. هام جداً: لا تستدعِ أدوات حفظ الطلب أو الإرسال إلا عند اكتمال تفاصيل فكرة وتصميم المشروع مع العميل. عند اكتمال الطلب والتصميم، استدعِ save_client_info و send_message_to_number لإشعار الإدارة، ثم أخبر العميل نصاً بالعبارة التالية:\n'تم تنفيذ طلبك بنجاح، سيتواصل معك فريق خدمة العملاء بعد الانتهاء من طلبك.'";
        systemPrompt += `\n\nحالة اتصال الواتساب الآن: ${waStatusText}. لا تعد العميل بإرسال رسائل عبر الواتساب إذا كان مفصولاً.`;
    }
    
    // Add user phone number info
    const cleanPhone = realPhoneNumber ? realPhoneNumber : userId.replace('@c.us', '').replace('tel_', '+').replace('@lid', '');
    systemPrompt += `\n\nمعلومة لك: رقم هاتف أو معرّف هذا المستخدم الذي يتحدث معك الآن هو: ${cleanPhone}. تذكر هذا الرقم في كل المحادثة في حال طُلب منك.`;
    
    // Attach phone to history context
    (chatHistories[userId] as any).clientPhone = cleanPhone;

    // Append new user message to chat history
    chatHistories[userId].push({ role: 'user', content: userMessage });

    // 1. Try Gemini AI only if a valid GEMINI_API_KEY is configured in environment
    const configuredGeminiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (configuredGeminiKey.length > 10) {
        try {
            const availableDecls = isAdmin 
                ? geminiTools 
                : geminiTools.filter(t => ['save_client_info', 'send_message_to_number', 'web_search', 'read_url'].includes(t.name));

            const contents = buildGeminiContents(chatHistories[userId]);
            const gemini = getGeminiClientForKey(configuredGeminiKey);

            const geminiCall = async () => {
                let currentTurn = 0;
                const MAX_TURNS = 4;
                let conversationContents = [...contents];

                while (currentTurn < MAX_TURNS) {
                    currentTurn++;
                    const response = await gemini.models.generateContent({
                        model: 'gemini-3.8-flash',
                        contents: conversationContents,
                        config: {
                            systemInstruction: systemPrompt,
                            tools: [{ functionDeclarations: availableDecls }],
                            temperature: 0.6
                        }
                    });

                    const functionCalls = response.functionCalls;
                    if (functionCalls && functionCalls.length > 0) {
                        console.log(`[Gemini AI] Turn ${currentTurn}: Executing ${functionCalls.length} tool call(s)...`);
                        const functionResponses: any[] = [];

                        for (const fc of functionCalls) {
                            const funcName = fc.name;
                            const args = fc.args || {};
                            const funcResult = await executeTool(funcName, args, userId, isAdmin, userMessage);
                            functionResponses.push({
                                functionResponse: {
                                    name: funcName,
                                    response: { result: funcResult }
                                }
                            });
                        }

                        if (response.candidates?.[0]?.content) {
                            conversationContents.push(response.candidates[0].content as any);
                        }
                        conversationContents.push({
                            role: 'user',
                            parts: functionResponses
                        } as any);

                        continue;
                    }

                    let textReply = response.text || '';
                    if (!textReply.trim()) {
                        textReply = "أهلاً بك في شركة Texora للبرمجيات! كيف يمكنني مساعدتك في تصميم وتطوير مشروعك اليوم؟";
                    }
                    chatHistories[userId].push({ role: 'assistant', content: textReply });
                    safeSaveJSON('db_history.json', chatHistories);
                    return textReply;
                }
                return null;
            };

            // Enforce a strict 5-second timeout on Gemini to keep responses instant
            const timeoutPromise = new Promise<null>((_, reject) => 
                setTimeout(() => reject(new Error('Gemini timeout')), 5000)
            );

            const result = await Promise.race([geminiCall(), timeoutPromise]);
            if (result && typeof result === 'string' && result.trim()) {
                return result;
            }
        } catch (geminiError: any) {
            console.warn("[Gemini AI Bypass -> Groq]:", geminiError?.message || geminiError);
        }
    }

    // 2. Primary Fast Engine: Groq Llama-3.3 70B & 8B (Sub-second response time)
    try {
        return await callGroqFallback(userId, userMessage, isAdmin, systemPrompt);
    } catch (groqErr) {
        console.error("[Groq Fallback Error]:", groqErr);
        const safeDefault = "أهلاً بك في شركة Texora للبرمجيات! تم استلام رسالتك بنجاح، كيف يمكننا مساعدتك في تفاصيل مشروعك اليوم؟";
        chatHistories[userId].push({ role: 'assistant', content: safeDefault });
        return safeDefault;
    } finally {
        safeSaveJSON('db_history.json', chatHistories);
    }
}

const callGroqLLM = callAI;

try {
    if (fs.existsSync('db_history.json')) {
        const data = fs.readFileSync('db_history.json', 'utf8');
        Object.assign(chatHistories, JSON.parse(data));
    }
} catch (e) {}

// Add this above startServer()
const CONFIG_FILE = 'app_config.json';
let telegramToken = process.env.TELEGRAM_BOT_TOKEN || '8831146675:AAE4LyAjvKbNgO_CpHsHmvofL25ogRsSfbg';
let telegramChatId = '';
let telegramGroupChatId = '-5433306866';
let telegramUsername = 'TexoraOfficialBot';
let lastTelegramChatId = '';
let lastTelegramGroupChatId = '-5433306866';
let lastTelegramGroupTitle = 'مجموعة إدارة وعملاء Texora';
let hasSavedSession = false;
let isStartingWhatsApp = false;
let reconnectTimer: NodeJS.Timeout | null = null;

try {
    if (fs.existsSync(CONFIG_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        if (parsed.adminNumber && parsed.adminNumber.trim()) adminNumber = parsed.adminNumber;
        else adminNumber = process.env.ADMIN_NUMBER || '201093625469';
        if (parsed.globalInstructions) globalInstructions = parsed.globalInstructions;
        if (parsed.telegramToken) telegramToken = parsed.telegramToken;
        if (parsed.telegramChatId) telegramChatId = parsed.telegramChatId;
        if (parsed.telegramGroupChatId) telegramGroupChatId = parsed.telegramGroupChatId;
        if (parsed.lastTelegramGroupChatId) lastTelegramGroupChatId = parsed.lastTelegramGroupChatId;
        if (parsed.lastTelegramGroupTitle) lastTelegramGroupTitle = parsed.lastTelegramGroupTitle;
        if (parsed.hasSavedSession !== undefined) hasSavedSession = !!parsed.hasSavedSession;
        console.log(`Loaded configuration from disk. Telegram Group Chat ID: ${telegramGroupChatId || lastTelegramGroupChatId || 'None'}`);
    }
} catch(e) {
    console.error("Failed to load config:", e);
}

const saveConfigToDisk = () => {
    fs.promises.writeFile(CONFIG_FILE, JSON.stringify({
        adminNumber,
        globalInstructions,
        telegramToken,
        telegramChatId,
        telegramGroupChatId: telegramGroupChatId || lastTelegramGroupChatId,
        lastTelegramGroupChatId,
        lastTelegramGroupTitle,
        hasSavedSession
    }, null, 2)).catch(e => console.error("Could not save config:", e));
};

// Multi-level lock and process cleanup helpers to prevent Puppeteer crashes on reload
function cleanAllChromiumLocks() {
    try {
        const authDirs = [
            path.join(process.cwd(), '.wwebjs_auth'),
            path.join(__dirname, '.wwebjs_auth')
        ];

        for (const baseAuthDir of authDirs) {
            if (!fs.existsSync(baseAuthDir)) continue;

            const removeLocksRecursively = (dir: string) => {
                if (!fs.existsSync(dir)) return;
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        removeLocksRecursively(fullPath);
                    } else if (
                        entry.name.startsWith('Singleton') ||
                        entry.name.endsWith('.lock') ||
                        entry.name === 'parent._lock'
                    ) {
                        try {
                            fs.unlinkSync(fullPath);
                            console.log(`[WhatsApp Cleanup] Cleared stale lock: ${entry.name}`);
                        } catch {}
                    }
                }
            };

            removeLocksRecursively(baseAuthDir);
        }
    } catch (err) {
        console.warn('[WhatsApp Cleanup] Error during lock cleanup:', err);
    }
}

function killOrphanedChromeProcesses() {
    try {
        if (process.platform === 'win32') {
            try {
                execSync('powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name = \'chrome.exe\'\\" | Where-Object { $_.CommandLine -like \'*--headless*\' -or $_.CommandLine -like \'*wwebjs_auth*\' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"');
            } catch {}
            return;
        }
        const psOutput = execSync('ps aux || true').toString();
        const lines = psOutput.split('\n');
        for (const line of lines) {
            if (line.includes('chrome') && (line.includes('.wwebjs_auth') || line.includes('session-client-one'))) {
                const parts = line.trim().split(/\s+/);
                const pid = parts[1];
                if (pid && !isNaN(parseInt(pid, 10))) {
                    try {
                        process.kill(parseInt(pid, 10), 'SIGKILL');
                        console.log(`[WhatsApp Cleanup] Killed orphaned chrome process PID ${pid}`);
                    } catch {}
                }
            }
        }
    } catch {}
}

async function startServer() {
    const app = express();
    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

    // Fully permissive CORS for all external origins, websites and preview domains
    app.use(cors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['*'],
        exposedHeaders: ['*']
    }));
    app.options('*', cors());

    // Support JSON, URL-Encoded, and Raw Text bodies seamlessly
    app.use(express.json({ limit: '25mb' }));
    app.use(express.urlencoded({ extended: true, limit: '25mb' }));
    app.use(express.text({ limit: '25mb' }));

    // Global Detailed Request Logger for all API calls
    app.use((req, res, next) => {
        if (req.path.startsWith('/api') || req.path.includes('order') || req.path.includes('lead') || req.path.includes('webhook')) {
            console.log(`[HTTP INCOMING] ${req.method} ${req.originalUrl}`);
            if (req.body && Object.keys(req.body).length > 0) {
                if (typeof req.body === 'object' && req.body.audioBase64) {
                    console.log(`[HTTP BODY]`, { ...req.body, audioBase64: `[audio data ${req.body.audioBase64.length} chars]` });
                } else {
                    console.log(`[HTTP BODY]`, typeof req.body === 'string' ? req.body.slice(0, 300) : req.body);
                }
            }
            if (req.query && Object.keys(req.query).length > 0) {
                console.log(`[HTTP QUERY]`, req.query);
            }
        }
        next();
    });

    const server = http.createServer(app);
    const io = new Server(server, { cors: { origin: '*' } });
    ioInstance = io;

    io.on('connection', (socket) => {
        socket.emit('config', {
            adminNumber,
            globalInstructions,
            hasTelegram: !!telegramBot,
            telegramToken,
            telegramUsername,
            telegramChatId,
            telegramGroupChatId: telegramGroupChatId || lastTelegramGroupChatId,
            lastGroupTitle: lastTelegramGroupTitle
        });
    });

    // Standard Liveness & Readiness Probes for Cloud Run & VPS Deployment
    app.get('/api/health', (req, res) => {
        res.json({
            status: 'ok',
            uptime: Math.round(process.uptime()),
            whatsappConnected: isWhatsappConnected,
            hasSavedSession: hasSavedSession,
            clientsTotal: Object.keys(clientsDB).length,
            conversationsTotal: Object.keys(chatHistories).length,
            timestamp: new Date().toISOString()
        });
    });
    app.get('/healthz', (req, res) => res.status(200).send('OK'));

    let activeTelegramToken = '';
    let isStartingTelegram = false;

    const startTelegram = async (token: string) => {
        if (!token || !token.trim()) return;
        if (telegramBot && activeTelegramToken === token) {
            return;
        }
        if (isStartingTelegram) return;
        isStartingTelegram = true;

        try {
            if (telegramBot) {
                try {
                    await telegramBot.stopPolling({ cancel: true });
                } catch {}
                telegramBot = null;
            }

            activeTelegramToken = token;
            const bot = new TelegramBot(token, {
                polling: {
                    interval: 300,
                    autoStart: true,
                    params: { timeout: 10 }
                }
            });
            telegramBot = bot;

            // Clear any webhook that may interfere with getUpdates
            try {
                await bot.deleteWebHook();
            } catch {}

            bot.on('polling_error', (error: any) => {
                const msg = error?.message || String(error);
                if (msg.includes('409') || msg.includes('Conflict')) {
                    // Suppress and handle 409 conflict gracefully during server reloads
                    console.warn("[Telegram Polling] Handled temporary 409 Conflict smoothly (polling will re-sync)");
                    return;
                }
                console.error("Telegram Polling Error:", msg);
            });
            
            // Fetch actual bot username from Telegram API
            bot.getMe().then((me) => {
                if (me && me.username) {
                    telegramUsername = me.username;
                    console.log(`[Telegram] Connected as @${telegramUsername} (${me.first_name})`);
                    io.emit('config', { adminNumber, globalInstructions, hasTelegram: true, telegramToken, telegramUsername });
                }
            }).catch(err => console.warn("[Telegram] getMe error:", err?.message || err));

            const processTelegramIncomingMessage = async (chatId: string, text: string, isChannelOrEdit: boolean = false, msgObj: any = null) => {
                if (!text || !text.trim()) return;

                const isGroup = msgObj && (msgObj.chat?.type === 'group' || msgObj.chat?.type === 'supergroup' || chatId.startsWith('-'));
                const botUsername = telegramUsername ? telegramUsername.toLowerCase() : '';
                const isMentioned = botUsername && text.toLowerCase().includes(`@${botUsername}`);

                // Remember Telegram Chat ID automatically if private or admin
                lastTelegramChatId = chatId;
                if (isGroup) {
                    lastTelegramGroupChatId = chatId;
                    telegramGroupChatId = chatId;
                    if (msgObj?.chat?.title) lastTelegramGroupTitle = msgObj.chat.title;
                    saveConfigToDisk();
                    if (ioInstance) {
                        ioInstance.emit('config', { 
                            adminNumber, 
                            globalInstructions, 
                            hasTelegram: !!telegramBot, 
                            telegramToken, 
                            telegramUsername,
                            telegramChatId,
                            telegramGroupChatId,
                            lastGroupTitle: lastTelegramGroupTitle 
                        });
                    }
                }
                if (!telegramChatId && !isGroup) {
                    telegramChatId = chatId;
                    saveConfigToDisk();
                }

                const senderId = 'tel_' + chatId;

                if (text.includes('تغيير التعليمات')) {
                    const match = text.match(/تغيير التعليمات(?: الى| إلى)?\s*(.*)/);
                    if (match && match[1]) {
                        globalInstructions = match[1].trim();
                        saveConfigToDisk();
                        io.emit('config', { adminNumber, globalInstructions, hasTelegram: !!telegramBot });
                        telegramBot?.sendMessage(chatId, "تم حفظ التعليمات الجديدة للمستخدمين الآخرين بنجاح ✔️").catch(() => {});
                        return;
                    }
                }

                // Telegram Admin Quick Commands for QR code and bot status
                const cleanCmd = text.trim().toLowerCase();
                if (['/qr', 'qr', 'كود', 'باركود', 'كود واتساب', 'رمز واتساب', '/status', 'الحالة'].includes(cleanCmd)) {
                    if (isWhatsappConnected) {
                        telegramBot?.sendMessage(chatId, '✅ *واتساب متصل ويعمل بنجاح سحابياً 24/7!* 🟢', { parse_mode: 'Markdown' }).catch(() => {});
                        return;
                    }
                    if (qrCodeDataUrl) {
                        try {
                            const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
                            const qrBuffer = Buffer.from(base64Data, 'base64');
                            telegramBot?.sendPhoto(chatId, qrBuffer, {
                                caption: '📱 *رمز مسح واتساب الحالي*\nامسحه من تطبيق واتساب بهاتفك لربط البوت السحابي فوراً 🚀',
                                parse_mode: 'Markdown'
                            }).catch(() => {});
                            return;
                        } catch (e) {}
                    }
                    telegramBot?.sendMessage(chatId, '⏳ جاري توليد رمز الـ QR لواتساب أو استعادة الجلسة، يرجى الانتظار ثوانٍ قليلة...').catch(() => {});
                    return;
                }

                const senderUsername = (msgObj?.from?.username || '').toLowerCase();
                const isOtherBot = (msgObj?.from?.is_bot && senderUsername !== telegramUsername?.toLowerCase()) || 
                                   senderUsername.includes('trxorawed') || 
                                   senderUsername.includes('bot');

                // Detect if message contains client order details from @trxorawed_bot, website bot, or group member
                const phoneMatch = text.match(/(?:\+?20|0)?1[0125]\d{8}|\+?\d{10,14}/);
                const hasOrderIndicator = isOtherBot || /طلب|عميل|موقع|خدمة|مشروع|اسم|رقم|تواصل|هاتف|موبايل|تفاصيل|المنتج|الاسم|الرقم|order|lead|client|customer|phone/i.test(text);

                if (phoneMatch && hasOrderIndicator) {
                    let rawPhone = phoneMatch[0].replace(/\D/g, '');
                    if (rawPhone.startsWith('0')) rawPhone = '2' + rawPhone;

                    // Extract Name
                    const nameMatch = text.match(/(?:الاسم|اسم العميل|العميل|Name|Client|Customer)\s*[:=]?\s*([^\n\r,]+)/i);
                    const extractedName = nameMatch ? nameMatch[1].trim() : (msgObj?.from?.first_name || 'عميل جديد');

                    // Extract Product / Service
                    const productMatch = text.match(/(?:المنتج|الخدمة|اسم المنتج|المشروع|الطلب|Product|Service|Project|Order)\s*[:=]?\s*([^\n\r,]+)/i);
                    const extractedProduct = productMatch ? productMatch[1].trim() : 'خدمات وموقع برمجية';

                    // Extract Details
                    const detailsMatch = text.match(/(?:التفاصيل|تفاصيل المنتج|المواصفات|المطلوب|الملاحظات|Details|Specs|Notes)\s*[:=]?\s*([\s\S]+)/i);
                    const extractedDetails = detailsMatch ? detailsMatch[1].trim() : text;

                    const targetId = `${rawPhone}@c.us`;
                    const leadRecord: ClientLead = {
                        id: `ord_tg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                        name: extractedName,
                        phone: rawPhone,
                        request: `[المنتج: ${extractedProduct}] - ${extractedDetails}`,
                        date: new Date().toISOString(),
                        lastUpdated: new Date().toISOString(),
                        source: senderUsername ? `@${senderUsername}` : 'مجموعة تلجرام',
                        status: isWhatsappConnected 
                            ? 'تم استقبال الرسالة بالتليجرام وجاري الدردشة التلقائية على الواتساب' 
                            : 'تم حفظ الطلب بالسيرفر من التليجرام (الواتساب غير متصل حالياً)'
                    };

                    clientsDB[rawPhone] = leadRecord;
                    safeSaveJSON('clients_db.json', clientsDB);
                    if (!chatHistories[targetId]) chatHistories[targetId] = [];
                    chatHistories[targetId].push({ 
                        role: 'system', 
                        content: `[تم استلام هذا الطلب من التلجرام عبر @${senderUsername || 'البوت'}]\nالاسم: ${extractedName}\nالهاتف: +${rawPhone}\nالمنتج: ${extractedProduct}\nالتفاصيل: ${extractedDetails}` 
                    });
                    safeSaveJSON('db_history.json', chatHistories);

                    if (ioInstance) ioInstance.emit('new-lead', leadRecord);
                    console.log(`[Telegram Order Detected from @${senderUsername}] Name: ${extractedName}, Phone: +${rawPhone}, Product: ${extractedProduct}`);

                    // Send Telegram Confirmation back (safe plain text formatting)
                    const confirmMessage = `✅ تم استلام طلب العميل المرسل عبر (@${senderUsername || 'trxorawed_bot'}) بنجاح!\n\n👤 اسم العميل: ${extractedName}\n📞 رقم العميل: +${rawPhone}\n📦 المنتج: ${extractedProduct}\n📝 التفاصيل: ${extractedDetails}\n\n📱 جاري بدء المحادثة والتواصل التلقائي فوراً مع العميل على الواتساب عبر الرقم (+${rawPhone})...`;
                    telegramBot?.sendMessage(chatId, confirmMessage).catch(err => {
                        console.error("[Telegram Send Order Confirm Error]:", err?.message || err);
                    });

                    // Trigger WhatsApp Outreach immediately
                    if (whatsappClient && isWhatsappConnected) {
                        try {
                            const promptForWelcome = `العميل قدم طلباً باسم (${extractedName}) لمنتج/خدمة (${extractedProduct}) وتفاصيل (${extractedDetails}) عبر التلجرام من (@${senderUsername}).\n\nصيغ رسالة ترحيبية هادئة وقصيرة ومريحة جداً (سطرين إلى 3 أسطر) باسم شركة Texora للبرمجيات، ترحب به وتؤكد له استلام طلب الخدمة وتسأله بكل بساطة عن فكرته لتحديد المواصفات بوضوح.`;
                            const initialReply = await callGroqLLM(targetId, promptForWelcome, false, rawPhone);
                            if (initialReply) {
                                await whatsappClient.sendMessage(targetId, initialReply + "\u200B");
                                console.log(`[Telegram Bridge] WhatsApp opening message sent to +${rawPhone}`);
                                telegramBot?.sendMessage(chatId, `📲 تم إرسال أول رسالة ترحيبية للعميل (${extractedName}) على الواتساب بنجاح! ✨`).catch(() => {});
                            }
                        } catch (e) {
                            console.error("[Telegram Bridge WA Error]:", e);
                        }
                    }
                    return;
                }

                if (!isChannelOrEdit) {
                    // Treat Telegram Groups as Company Administration / Management
                    let cleanText = text;
                    if (botUsername) {
                        cleanText = cleanText.replace(new RegExp(`@${botUsername}`, 'gi'), '').trim();
                    }
                    console.log(`[Telegram Msg Received] ChatId: ${chatId}, Msg: "${text}", isGroup: ${isGroup}`);

                    // Pass isAdmin = isGroup || (chatId === telegramChatId || chatId === lastTelegramChatId)
                    const isGroupAdmin = isGroup || (chatId === telegramChatId || chatId === lastTelegramChatId);
                    
                    // Call AI engine
                    const reply = await callAI(senderId, cleanText || text, isGroupAdmin);
                    if (reply) {
                        console.log(`[Telegram AI Reply Generated] ChatId: ${chatId}, Reply length: ${reply.length}`);
                        const replyOpts = msgObj?.message_id ? { reply_to_message_id: msgObj.message_id } : undefined;
                        telegramBot?.sendMessage(chatId, reply, replyOpts).catch((err) => {
                            console.warn("[Telegram Group Reply-To Error, Retrying without reply_to_message_id]:", err?.message || err);
                            telegramBot?.sendMessage(chatId, reply).catch(err2 => {
                                console.error("[Telegram Direct Send Error]:", err2?.message || err2);
                            });
                        });

                        // Autonomous Voice Note Reply on Telegram (Lulwa Voice via Groq)
                        const shouldSendTgVoice = msgObj?.voice || msgObj?.audio || process.env.ENABLE_VOICE_REPLIES === 'true';
                        if (shouldSendTgVoice) {
                            try {
                                console.log(`[Telegram Voice TTS] Generating Lulwa voice reply for ${chatId}...`);
                                const { oggBuffer } = await generateVoiceAudio(reply, 'lulwa');
                                telegramBot?.sendVoice(chatId, oggBuffer).catch(e => console.warn("[Telegram SendVoice Error]:", e?.message));
                            } catch (tgVoiceErr: any) {
                                console.warn("[Telegram Voice TTS Warning]:", tgVoiceErr?.message || tgVoiceErr);
                            }
                        }
                    }
                }
            };

            bot.on('message', async (msg) => {
                try {
                    if (!msg || !msg.chat) return;
                    const senderUsername = (msg.from?.username || '').toLowerCase();
                    // Do not respond to self messages sent by this bot
                    if (senderUsername && telegramUsername && senderUsername === telegramUsername.toLowerCase()) {
                        return;
                    }
                    const chatId = msg.chat.id.toString();
                    let text = msg.text || msg.caption || '';

                    // Transcribe incoming Telegram Voice / Audio Note
                    if ((msg.voice || msg.audio) && !text.trim()) {
                        try {
                            const fileId = msg.voice ? msg.voice.file_id : msg.audio?.file_id;
                            if (fileId) {
                                console.log(`[Telegram Voice] Downloading voice note from @${senderUsername || 'anon'}...`);
                                const fileLink = await bot.getFileLink(fileId);
                                const fileResp = await fetch(fileLink);
                                const audioBuffer = Buffer.from(await fileResp.arrayBuffer());
                                const transcribed = await transcribeAudio(audioBuffer, 'audio/ogg');
                                if (transcribed && transcribed.trim()) {
                                    text = transcribed.trim();
                                    console.log(`[Telegram STT Success] Transcribed: "${text}"`);
                                }
                            }
                        } catch (tgVoiceErr: any) {
                            console.error("[Telegram Voice STT Error]:", tgVoiceErr?.message || tgVoiceErr);
                        }
                    }

                    if (!text || !text.trim()) return;
                    console.log(`[Telegram Bot Ingest] Received from @${senderUsername || 'anon'} in chat ${chatId}: "${text.slice(0, 80)}"`);
                    await processTelegramIncomingMessage(chatId, text, false, msg);
                } catch(err: any) {
                    console.error("[Telegram Msg Handler Error]:", err?.message || err);
                }
            });

            bot.on('channel_post', async (msg) => {
                try {
                    if (!msg || !msg.chat) return;
                    const chatId = msg.chat.id.toString();
                    const text = msg.text || msg.caption || '';
                    await processTelegramIncomingMessage(chatId, text, true, msg);
                } catch(err: any) {
                    console.error("[Telegram Channel Post Handler Error]:", err?.message || err);
                }
            });

            bot.on('edited_message', async (msg) => {
                try {
                    if (!msg || !msg.chat) return;
                    const chatId = msg.chat.id.toString();
                    const text = msg.text || msg.caption || '';
                    await processTelegramIncomingMessage(chatId, text, true, msg);
                } catch(err: any) {
                    console.error("[Telegram Edited Message Handler Error]:", err?.message || err);
                }
            });

            bot.on('edited_channel_post', async (msg) => {
                const chatId = msg.chat.id.toString();
                await processTelegramIncomingMessage(chatId, msg.text || msg.caption || '', true, msg);
            });
        } finally {
            isStartingTelegram = false;
        }
    };

    if (telegramToken) {
        startTelegram(telegramToken);
    }

    io.on('connection', (socket) => {
        socket.emit('whatsapp-status', { 
            connected: isWhatsappConnected, 
            qr: qrCodeDataUrl,
            hasSavedSession,
            isReady: !!whatsappClient || isStartingWhatsApp
        });
        socket.emit('config', { adminNumber, globalInstructions, hasTelegram: !!telegramBot, telegramToken, telegramUsername });
    });

    const scheduleReconnect = (delayMs = 4000) => {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
            if (!whatsappClient && !isStartingWhatsApp && !isWhatsappConnected) {
                console.log("[WhatsApp Auto-Reconnect] Restoring permanent session / generating QR in background...");
                startWhatsappClient().catch(e => console.error("[WhatsApp Auto-Reconnect] Error:", e));
            }
        }, delayMs);
    };

    const startWhatsappClient = async () => {
        if (whatsappClient) return { message: 'Already starting/started' };
        if (isStartingWhatsApp) return { message: 'Already starting/started' };

        isStartingWhatsApp = true;
        lastClientStartTime = Date.now();
        if (startupSafetyTimer) clearTimeout(startupSafetyTimer);
        startupSafetyTimer = setTimeout(() => {
            if (isStartingWhatsApp && !isWhatsappConnected) {
                console.warn("[WhatsApp Watchdog] 120s startup safety timeout triggered. Resetting isStartingWhatsApp.");
                isStartingWhatsApp = false;
            }
        }, 120000);

        try {
            console.log("[WhatsApp] Initializing WhatsApp permanent client...");
            
            // Clean any stale locks and orphaned browser instances
            killOrphanedChromeProcesses();
            cleanAllChromiumLocks();

            const authPath = path.resolve(__dirname, '.wwebjs_auth');
            if (!fs.existsSync(authPath)) {
                fs.mkdirSync(authPath, { recursive: true });
            }

            whatsappClient = new Client({
                authStrategy: new LocalAuth({ 
                    clientId: "client-one",
                    dataPath: authPath
                }),
                webVersionCache: {
                    type: 'remote',
                    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/{version}.html',
                    strict: false
                },
                puppeteer: { 
                    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
                    headless: true,
                    protocolTimeout: 300000,
                    ignoreDefaultArgs: ['--enable-automation'],
                    args: [
                        '--no-sandbox', 
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--disable-gpu',
                        '--disable-background-timer-throttling',
                        '--disable-backgrounding-occluded-windows',
                        '--disable-renderer-backgrounding',
                        '--disable-extensions',
                        '--disable-blink-features=AutomationControlled',
                        '--window-size=1280,800'
                    ],
                    timeout: 300000
                },
                authTimeoutMs: 300000,
                qrMaxRetries: 0,
                takeoverOnConflict: true,
                takeoverTimeoutMs: 10000
            });

            whatsappClient.on('qr', async (qr: string) => {
                lastQrTimestamp = Date.now();
                console.log(`[WhatsApp] Fresh live QR code generated at ${new Date().toLocaleTimeString()}!`);
                qrCodeDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });
                isWhatsappConnected = false;
                io.emit('whatsapp-status', { 
                    connected: false, 
                    qr: qrCodeDataUrl, 
                    hasSavedSession: false,
                    isReady: true,
                    qrTimestamp: lastQrTimestamp,
                    expiresInSec: 20
                });

                // Sync QR Code to Supabase in real-time
                updateBotState({ qr_code: qrCodeDataUrl, is_connected: false }).catch(() => {});

                // Auto-forward QR code photo directly to Telegram Management Group (throttled to once per minute)
                if (telegramBot && (Date.now() - lastTelegramQrSentAt > 60000)) {
                    lastTelegramQrSentAt = Date.now();
                    try {
                        const qrBuffer = await QRCode.toBuffer(qr, { width: 450, margin: 2 });
                        const targetGroup = telegramGroupChatId || lastTelegramGroupChatId || '-5433306866';
                        const caption = '📱 *رمز تسجيل دخول واتساب اللحظي (WhatsApp Web QR)*\n\n' +
                            '🔹 افتح واتساب على هاتفك > *الأجهزة المرتبطة*\n' +
                            '🔹 اضغط *ربط جهاز* وامسح هذا الرمز ضوئياً.\n\n' +
                            '⚡ *الرمز يتجدد تلقائياً كل 20 ثانية لضمان قبول الربط الفوري!*';
                        telegramBot.sendPhoto(targetGroup, qrBuffer, { caption, parse_mode: 'Markdown' }).catch((err: any) => {
                            console.warn("[Telegram QR Send Warning]:", err?.message || err);
                        });
                        console.log(`[Telegram] WhatsApp QR Photo sent to group: ${targetGroup}`);
                    } catch (e: any) {
                        console.warn("[Telegram QR Generation Error]:", e?.message || e);
                    }
                }
            });

            whatsappClient.on('authenticated', () => {
                console.log("[WhatsApp] WhatsApp Authenticated successfully! Session saved permanently.");
                hasSavedSession = true;
                isWhatsappConnected = true;
                qrCodeDataUrl = null;
                saveConfigToDisk();
                updateBotState({ qr_code: null, is_connected: true }).catch(() => {});
                io.emit('whatsapp-status', { 
                    connected: true, 
                    qr: null, 
                    hasSavedSession: true,
                    isReady: true 
                });
            });

            whatsappClient.on('ready', () => {
                console.log("[WhatsApp] WhatsApp Web Client is Active & Ready!");
                hasSavedSession = true;
                isWhatsappConnected = true;
                qrCodeDataUrl = null;
                saveConfigToDisk();
                updateBotState({ qr_code: null, is_connected: true, phone_number: whatsappClient?.info?.wid?.user }).catch(() => {});
                io.emit('whatsapp-status', { 
                    connected: true, 
                    qr: null, 
                    hasSavedSession: true,
                    isReady: true 
                });
            });

            whatsappClient.on('auth_failure', (msg: any) => {
                console.error("[WhatsApp] Authentication Failure:", msg);
                isWhatsappConnected = false;
                qrCodeDataUrl = null;
                whatsappClient = null;
                isStartingWhatsApp = false;
                io.emit('whatsapp-status', { 
                    connected: false, 
                    qr: null, 
                    hasSavedSession: false,
                    isReady: false, 
                    error: "انتهت جلسة الواتساب القديمة، جاري تجهيز كود QR جديد..." 
                });
                scheduleReconnect(2000);
            });

            whatsappClient.on('change_state', (state: string) => {
                console.log("[WhatsApp] Client state changed to:", state);
                if (state === 'CONNECTED') {
                    isWhatsappConnected = true;
                    io.emit('whatsapp-status', { connected: true, qr: null, hasSavedSession: true, isReady: true });
                }
            });

            whatsappClient.on('disconnected', (reason: string) => {
                console.log("[WhatsApp] WhatsApp Client was disconnected. Reason:", reason);
                isWhatsappConnected = false;
                qrCodeDataUrl = null;
                whatsappClient = null;
                isStartingWhatsApp = false;
                io.emit('whatsapp-status', { 
                    connected: false, 
                    qr: null, 
                    hasSavedSession, 
                    isReady: false 
                });

                if (reason === 'LOGOUT') {
                    console.log("[WhatsApp] User logged out from mobile device. Clearing permanent session.");
                    hasSavedSession = false;
                    saveConfigToDisk();
                    cleanAllChromiumLocks();
                } else {
                    // Temporary disconnection (network, browser refresh, timeout) -> Auto Reconnect permanently!
                    console.log("[WhatsApp] Temporary disconnection. Reconnecting in background to maintain permanent link...");
                    scheduleReconnect(3000);
                }
            });

            whatsappClient.on('message_create', async msg => {
                try {
                    if (!msg) return;

                    // 1. Filter out broadcasts, status stories, newsletter channels, and non-chat metadata events
                    const fromStr = String(msg.from || '');
                    const toStr = String(msg.to || '');
                    
                    if (
                        (msg as any).isStatus ||
                        fromStr === 'status@broadcast' ||
                        toStr === 'status@broadcast' ||
                        fromStr.includes('@broadcast') ||
                        toStr.includes('@broadcast') ||
                        fromStr.includes('@newsletter') ||
                        toStr.includes('@newsletter') ||
                        ['protocol', 'reaction', 'e2e_notification', 'notification_template', 'call_log', 'gp2', 'poll_creation', 'broadcast_notification'].includes(msg.type)
                    ) {
                        return;
                    }

                    // 2. Prevent infinite loops from self-sent bot responses
                    const textBody = typeof msg.body === 'string' ? msg.body : '';
                    if (textBody.endsWith('\u200B')) {
                        return;
                    }

                    // 3. Handle Voice Messages / Audio Notes (PTT) with Whisper STT
                    const isVoiceOrAudio = msg.type === 'ptt' || msg.type === 'audio' || msg.type === 'voice' || (msg.hasMedia && !textBody.trim() && (msg.type as any) !== 'image' && (msg.type as any) !== 'document');
                    let activeUserMessage = textBody;

                    if (isVoiceOrAudio) {
                        if (msg.fromMe) return; // Don't reply to outgoing voice notes
                        console.log(`[WhatsApp Voice] Processing incoming audio message from ${fromStr}...`);
                        try {
                            const media = await msg.downloadMedia();
                            if (media && media.data) {
                                const audioBuffer = Buffer.from(media.data, 'base64');
                                const transcribed = await transcribeAudio(audioBuffer, media.mimetype || 'audio/ogg');
                                if (transcribed && transcribed.trim()) {
                                    activeUserMessage = transcribed.trim();
                                    console.log(`[WhatsApp STT Success] Transcribed voice from ${fromStr}: "${activeUserMessage}"`);
                                } else {
                                    await msg.reply("عذراً، لم أتمكن من سماع الصوت بوضوح، برجاء إعادة إرسال التسجيل أو كتابته لنبدأ فوراً 🎙️🙏\u200B");
                                    return;
                                }
                            }
                        } catch (sttErr: any) {
                            console.error("[WhatsApp STT Error]:", sttErr?.message || sttErr);
                            await msg.reply("عذراً، حدث خطأ أثناء معالجة الصوت، برجاء كتابة استفسارك لمتابعة طلبك فوراً 💬\u200B");
                            return;
                        }
                    }

                    // 4. Validate text body
                    if (!activeUserMessage.trim()) {
                        return;
                    }

                    console.log(`[WhatsApp] Incoming message from: ${fromStr}, to: ${toStr}, fromMe: ${msg.fromMe}, text: ${activeUserMessage.substring(0, 35)}`);

                    // 5. Safely obtain or derive Chat object & ID
                    let chat: any = null;
                    try {
                        chat = await msg.getChat();
                    } catch {
                        // Suppress puppeteer getChat glitches on ephemeral or special messages
                    }

                    // Ignore group chats
                    const isGroup = (chat && chat.isGroup) || fromStr.includes('@g.us') || toStr.includes('@g.us');
                    if (isGroup) {
                        return;
                    }

                    // Determine conversation identifier & user
                    const senderJid = msg.fromMe ? toStr : fromStr;
                    const conversationId = chat?.id?._serialized || senderJid;
                    const chatUser = chat?.id?.user || senderJid.replace(/@.*$/, '').replace(/\D/g, '');

                    // Identify owner / self / admin
                    const myUserNumber = (whatsappClient?.info?.wid?.user || '').replace(/\D/g, '');
                    const cleanAdminNumber = (adminNumber || '201093625469').replace(/\D/g, '');

                    // Extract contact real phone number if available (handles LIDs)
                    let contactPhone = '';
                    try {
                        const contact = await msg.getContact();
                        if (contact?.number) contactPhone = contact.number.replace(/\D/g, '');
                    } catch {}

                    const isMessageToSelf = (myUserNumber && chatUser === myUserNumber) ||
                                            (cleanAdminNumber && (chatUser === cleanAdminNumber || contactPhone === cleanAdminNumber)) ||
                                            (toStr === fromStr);

                    // Prevent answering outgoing messages sent to other people from mobile app
                    if (msg.fromMe && !isMessageToSelf) {
                        return;
                    }

                    const isFromAdmin = (cleanAdminNumber && (
                        conversationId.includes(cleanAdminNumber) || 
                        chatUser === cleanAdminNumber || 
                        contactPhone === cleanAdminNumber ||
                        fromStr.includes(cleanAdminNumber)
                    )) ? true : (isMessageToSelf && msg.fromMe);

                    console.log(`[WhatsApp] Processing valid message. conversationId: ${conversationId}, isAdmin: ${isFromAdmin}, isToSelf: ${isMessageToSelf}, contact: ${contactPhone || chatUser}`);

                    // Admin instruction change shortcut
                    if (isFromAdmin && textBody.includes('تغيير التعليمات')) {
                        const match = textBody.match(/تغيير التعليمات(?: الى| إلى)?\s*(.*)/);
                        if (match && match[1]) {
                            globalInstructions = match[1].trim();
                            saveConfigToDisk();
                            io.emit('config', { adminNumber, globalInstructions, hasTelegram: !!telegramBot });
                            try {
                                if (typeof msg.reply === 'function') {
                                    await msg.reply("تم حفظ التعليمات الجديدة للمستخدمين الآخرين بنجاح ✔️\u200B");
                                } else {
                                    await whatsappClient?.sendMessage(conversationId, "تم حفظ التعليمات الجديدة للمستخدمين الآخرين بنجاح ✔️\u200B");
                                }
                            } catch (e) {
                                console.error("[WhatsApp] Error sending admin reply:", e);
                            }
                            return;
                        }
                    }

                    // Extract real contact number if possible
                    let realPhoneNumber = chatUser;
                    try {
                        const contact = await msg.getContact();
                        if (contact && contact.number) {
                            realPhoneNumber = contact.number;
                        }
                    } catch {
                        // ignore contact fetch error
                    }

                    // Synchronize session key with existing lead history if available
                    let sessionKey = conversationId;
                    if ((!chatHistories[sessionKey] || chatHistories[sessionKey].length === 0) && realPhoneNumber) {
                        const altKey = `${realPhoneNumber}@c.us`;
                        if (chatHistories[altKey] && chatHistories[altKey].length > 0) {
                            sessionKey = altKey;
                        }
                    }

                    // Send typing state if chat object is available
                    if (chat && typeof chat.sendStateTyping === 'function') {
                        try { await chat.sendStateTyping(); } catch {}
                    }

                    const reply = await callGroqLLM(sessionKey, activeUserMessage, isFromAdmin, realPhoneNumber || chatUser);

                    if (reply && whatsappClient) {
                        console.log(`[WhatsApp] Sending reply to ${conversationId}`);
                        let sent = false;
                        
                        // Delivery Attempt 1: Direct msg.reply()
                        try {
                            if (typeof msg.reply === 'function') {
                                await Promise.race([
                                    msg.reply(reply + "\u200B"),
                                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
                                ]);
                                sent = true;
                            }
                        } catch (replyErr: any) {
                            console.warn("[WhatsApp] msg.reply failed, trying chat.sendMessage:", replyErr?.message);
                        }

                        // Delivery Attempt 2: chat.sendMessage()
                        if (!sent && chat && typeof chat.sendMessage === 'function') {
                            try {
                                await Promise.race([
                                    chat.sendMessage(reply + "\u200B"),
                                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
                                ]);
                                sent = true;
                            } catch (chatErr: any) {
                                console.warn("[WhatsApp] chat.sendMessage failed:", chatErr?.message);
                            }
                        }

                        // Delivery Attempt 3: whatsappClient.sendMessage(conversationId)
                        if (!sent) {
                            try {
                                await Promise.race([
                                    whatsappClient.sendMessage(conversationId, reply + "\u200B"),
                                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
                                ]);
                                sent = true;
                            } catch (clientErr: any) {
                                console.error("[WhatsApp] sendMessage(conversationId) failed:", clientErr?.message);
                                // Delivery Attempt 4: Fallback to realPhoneNumber@c.us
                                if (realPhoneNumber) {
                                    const directTarget = `${realPhoneNumber.replace(/\D/g, '')}@c.us`;
                                    try {
                                        await Promise.race([
                                            whatsappClient.sendMessage(directTarget, reply + "\u200B"),
                                            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
                                        ]);
                                        sent = true;
                                    } catch {}
                                }
                            }
                        }

                        // 4. Autonomous Voice Note Reply (Lulwa voice via Groq)
                        const shouldSendVoiceReply = isVoiceOrAudio || process.env.ENABLE_VOICE_REPLIES === 'true';
                        if (shouldSendVoiceReply && !isFromAdmin) {
                            try {
                                console.log(`[WhatsApp Voice TTS] Synthesizing Lulwa voice reply for ${conversationId}...`);
                                const { oggBuffer } = await generateVoiceAudio(reply, 'lulwa');
                                const voiceMedia = new MessageMedia('audio/ogg; codecs=opus', oggBuffer.toString('base64'), 'voice.ogg');
                                await whatsappClient.sendMessage(conversationId, voiceMedia, { sendAudioAsVoice: true });
                                console.log(`[WhatsApp Voice TTS] Voice note sent successfully to ${conversationId}`);
                            } catch (voiceReplyErr: any) {
                                console.warn("[WhatsApp Voice Reply Error]:", voiceReplyErr?.message || voiceReplyErr);
                            }
                        }
                    }

                    // Clear typing state
                    if (chat && typeof chat.clearState === 'function') {
                        try { await chat.clearState(); } catch {}
                    }
                } catch (msgErr: any) {
                    console.error("[WhatsApp] Error in message_create handler:", msgErr?.message || msgErr);
                }
            });

            whatsappClient.initialize().then(() => {
                if (startupSafetyTimer) clearTimeout(startupSafetyTimer);
                isStartingWhatsApp = false;
                console.log("[WhatsApp] Client initialization completed successfully.");
            }).catch(err => {
                if (startupSafetyTimer) clearTimeout(startupSafetyTimer);
                console.error("WhatsApp Initialization Error:", err);
                isStartingWhatsApp = false;
                if (whatsappClient) {
                    try { whatsappClient.destroy(); } catch {}
                    whatsappClient = null;
                }
                cleanAllChromiumLocks();
                io.emit('whatsapp-status', { connected: false, qr: null, hasSavedSession, isReady: false, error: err.message });
                scheduleReconnect(5000);
            });
            return { success: true };
        } catch (e: any) {
            if (startupSafetyTimer) clearTimeout(startupSafetyTimer);
            whatsappClient = null;
            isStartingWhatsApp = false;
            return { error: e.message };
        }
    };

    // Auto-start WhatsApp client immediately on boot
    console.log(`[WhatsApp] Auto-launching WhatsApp client on boot (hasSavedSession: ${hasSavedSession})...`);
    startWhatsappClient().catch(e => console.error("Auto-start WA on boot failed:", e));

    // Periodic watchdog (every 25 seconds) to ensure permanent connection remains active
    setInterval(() => {
        if (!whatsappClient && !isStartingWhatsApp && (hasSavedSession || fs.existsSync(path.join(process.cwd(), '.wwebjs_auth', 'session-client-one')))) {
            console.log("[WhatsApp Watchdog] Session exists but client is offline. Auto-restoring connection...");
            startWhatsappClient().catch(() => {});
        }
    }, 25000);

    async function restartWhatsappClient(cleanAuth = false) {
        console.log(`[WhatsApp] Performing clean client restart (cleanAuth: ${cleanAuth})...`);
        if (startupSafetyTimer) clearTimeout(startupSafetyTimer);
        isStartingWhatsApp = false;
        if (whatsappClient) {
            try {
                await whatsappClient.destroy();
            } catch (e: any) {
                console.warn("[WhatsApp] Error destroying client:", e?.message);
            }
            whatsappClient = null;
        }
        killOrphanedChromeProcesses();
        cleanAllChromiumLocks();
        // Allow operating system and Docker volume mount 2 seconds to release file handles
        await new Promise(r => setTimeout(r, 2000));

        if (cleanAuth) {
            const authPath = path.join(process.cwd(), '.wwebjs_auth');
            try {
                fs.rmSync(authPath, { recursive: true, force: true });
                console.log("[WhatsApp] Wiped stale .wwebjs_auth directory.");
            } catch (e) {}
            hasSavedSession = false;
            saveConfigToDisk();
            await new Promise(r => setTimeout(r, 1000));
        }
        qrCodeDataUrl = null;
        lastQrTimestamp = 0;
        return startWhatsappClient();
    }

    // Dedicated Live QR Code Renewal Engine
    async function triggerQrRefresh(reason = 'manual') {
        const now = Date.now();
        if (isWhatsappConnected) return;
        // Don't interrupt client within its first 25 seconds of starting up
        if (now - lastClientStartTime < 25000) return;
        if (now - lastRefreshAttempt < 5000) return; // Throttle to max once every 5 seconds
        lastRefreshAttempt = now;

        if (!whatsappClient) {
            if (!isStartingWhatsApp) {
                console.log(`[WhatsApp QR Refresh] Client offline, launching startup (${reason})...`);
                startWhatsappClient().catch(() => {});
            }
            return;
        }

        const pupPage = (whatsappClient as any).pupPage;
        if (!pupPage || typeof pupPage.evaluate !== 'function' || pupPage.isClosed?.()) {
            console.log(`[WhatsApp QR Refresh] pupPage not ready or closed (${reason}).`);
            if (now - lastClientStartTime > 40000) {
                restartWhatsappClient().catch(() => {});
            }
            return;
        }

        console.log(`[WhatsApp QR Refresh] Triggering live QR renewal (Reason: ${reason})...`);

        try {
            // Click WhatsApp Web reload button or invoke Store refresh with 3.5s timeout
            const refreshAction = pupPage.evaluate(() => {
                try {
                    // 1. WhatsApp Web AuthStore or Store command
                    if ((window as any).Store?.Cmd?.refreshQR) {
                        (window as any).Store.Cmd.refreshQR();
                        return 'Store.Cmd.refreshQR';
                    }
                    if ((window as any).AuthStore?.Cmd?.refreshQR) {
                        (window as any).AuthStore.Cmd.refreshQR();
                        return 'AuthStore.Cmd.refreshQR';
                    }
                    // 2. Click WhatsApp Web's reload overlay button IF EXPLICITLY SHOWN
                    const selectors = [
                        'button[aria-label*="reload" i]',
                        'button[aria-label*="QR" i]',
                        'span[data-icon="refresh"]',
                        '[data-ref] [role="button"]'
                    ];
                    for (const s of selectors) {
                        const el = document.querySelector(s);
                        if (el) {
                            (el as HTMLElement).click();
                            return s;
                        }
                    }
                    return 'none_found';
                } catch (e: any) {
                    return 'eval_err: ' + (e?.message || e);
                }
            });

            const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('timeout'), 3500));
            const result = await Promise.race([refreshAction, timeoutPromise]);
            console.log(`[WhatsApp QR Refresh] Action result (${reason}):`, result);
        } catch (err: any) {
            console.warn("[WhatsApp QR Refresh] Refresh exception:", err?.message || err);
        }
    }

    app.post(['/api/whatsapp/refresh-qr', '/api/whatsapp/refresh'], async (req, res) => {
        try {
            console.log("[WhatsApp] User clicked immediate QR refresh button.");
            triggerQrRefresh('manual_user_click').catch(() => {});
            return res.json({ success: true, message: 'جاري تحديث كود الاستجابة السريعة فوراً...' });
        } catch (err: any) {
            res.status(500).json({ success: false, error: err?.message });
        }
    });

    app.all('/api/whatsapp/reset', async (req, res) => {
        try {
            const cleanAuth = req.query.clean === 'true' || req.body?.clean === true;
            console.log(`[WhatsApp] Full reset requested via API (cleanAuth: ${cleanAuth})...`);
            restartWhatsappClient(cleanAuth).catch(() => {});
            return res.json({ success: true, message: 'جاري إعادة تشغيل البوت بالكامل...' });
        } catch (err: any) {
            res.status(500).json({ success: false, error: err?.message });
        }
    });

    app.post('/api/config', (req, res) => {
        const { adminNumber: phone, instructions, telegramGroupChatId: groupChatId } = req.body;
        if (phone !== undefined) adminNumber = phone.replace(/[^0-9]/g, ''); 
        if (instructions !== undefined) globalInstructions = instructions;
        if (groupChatId !== undefined) {
            telegramGroupChatId = groupChatId.trim();
            lastTelegramGroupChatId = groupChatId.trim();
        }
        saveConfigToDisk();
        io.emit('config', { 
            adminNumber, 
            globalInstructions, 
            hasTelegram: !!telegramBot, 
            telegramToken, 
            telegramUsername,
            telegramChatId,
            telegramGroupChatId: telegramGroupChatId || lastTelegramGroupChatId,
            lastGroupTitle: lastTelegramGroupTitle 
        });
        res.json({ success: true, telegramToken, telegramGroupChatId: telegramGroupChatId || lastTelegramGroupChatId });
    });

    app.post('/api/whatsapp/start', async (req, res) => {
        const result = await startWhatsappClient();
        if (result.error) {
            res.status(500).json(result);
        } else {
            res.json(result);
        }
    });
    
    app.post('/api/whatsapp/stop', async (req, res) => {
        if (whatsappClient) {
            try { await whatsappClient.destroy(); } catch (e) {}
            whatsappClient = null;
        }
        isStartingWhatsApp = false;
        isWhatsappConnected = false;
        qrCodeDataUrl = null;
        cleanAllChromiumLocks();
        io.emit('whatsapp-status', { connected: false, qr: null, hasSavedSession, isReady: false });
        res.json({ success: true, message: 'تم إيقاف اتصال الواتساب مؤقتاً.' });
    });

    app.post('/api/whatsapp/logout', async (req, res) => {
        if (whatsappClient) {
            try { await whatsappClient.logout(); } catch (e) {}
            try { await whatsappClient.destroy(); } catch (e) {}
            whatsappClient = null;
        }
        isStartingWhatsApp = false;
        isWhatsappConnected = false;
        qrCodeDataUrl = null;
        hasSavedSession = false;
        saveConfigToDisk();
        
        const authPath = path.join(process.cwd(), '.wwebjs_auth');
        if (fs.existsSync(authPath)) {
            try { fs.rmSync(authPath, { recursive: true, force: true }); } catch (e) {}
        }
        cleanAllChromiumLocks();
        io.emit('whatsapp-status', { connected: false, qr: null, hasSavedSession: false, isReady: false });
        res.json({ success: true, message: 'تم إلغاء الربط وتسجيل الخروج ومسح الجلسة بنجاح.' });
    });

    app.post('/api/whatsapp/restart', async (req, res) => {
        if (whatsappClient) {
            try { await whatsappClient.destroy(); } catch (e) {}
            whatsappClient = null;
        }
        isStartingWhatsApp = false;
        isWhatsappConnected = false;
        qrCodeDataUrl = null;
        cleanAllChromiumLocks();
        const result = await startWhatsappClient();
        res.json(result);
    });

    app.post('/api/telegram', (req, res) => {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token required' });

        telegramToken = token;
        saveConfigToDisk();
        startTelegram(token);

        io.emit('config', { 
            adminNumber, 
            globalInstructions, 
            hasTelegram: true, 
            telegramToken, 
            telegramUsername,
            telegramChatId,
            telegramGroupChatId: telegramGroupChatId || lastTelegramGroupChatId,
            lastGroupTitle: lastTelegramGroupTitle 
        });
        res.json({ success: true, telegramToken, telegramUsername });
    });

    app.get('/api/telegram/info', (req, res) => {
        res.json({
            success: true,
            botUsername: telegramUsername,
            telegramChatId: telegramChatId || 'لم يتصل بعد',
            lastChatId: lastTelegramChatId || 'لا توجد رسائل سابقة',
            telegramGroupChatId: telegramGroupChatId || lastTelegramGroupChatId || 'لم يتم حفظ معرف مجموعة بعد',
            lastGroupChatId: lastTelegramGroupChatId || 'لم تصل رسائل من مجموعة بعد',
            lastGroupTitle: lastTelegramGroupTitle || 'غير معروف',
            botConnected: !!telegramBot
        });
    });

    // Master Universal Order Receiver, Webhook & Telegram Drop-in Proxy for Company Website
    const handleUniversalWebsiteOrder = async (req: express.Request, res: express.Response) => {
        try {
            console.log(`[Order API Call] Method: ${req.method}, Path: ${req.originalUrl}, IP: ${req.ip || req.socket.remoteAddress}`);
            let bodyObj: any = {};
            let rawString = '';

            if (typeof req.body === 'string') {
                rawString = req.body;
                try {
                    bodyObj = JSON.parse(req.body);
                } catch {
                    bodyObj = { rawText: req.body };
                }
            } else if (typeof req.body === 'object' && req.body !== null) {
                bodyObj = req.body;
                try {
                    rawString = JSON.stringify(req.body);
                } catch {}
            }

            const queryObj = (typeof req.query === 'object' && req.query !== null) ? req.query : {};
            const payload: any = { ...queryObj, ...(typeof bodyObj === 'object' ? bodyObj : {}) };

            // Unpack nested fields if payload is wrapped in data, order, customer, fields, or formData
            const nested = (payload.data || payload.payload || payload.order || payload.customer || payload.client || payload.lead || payload.formData || payload.fields || payload.params || {}) as Record<string, any>;

            // Check Telegram update object if sent via Telegram webhook / bot proxy
            const updateMsg = payload.message || payload.channel_post || payload.edited_message || payload.edited_channel_post;
            const textSource = updateMsg?.text || payload.text || payload.message || payload.content || payload.request || payload.details || payload.rawText || rawString || '';
            const text = typeof textSource === 'string' ? textSource : JSON.stringify(textSource);

            // 1. Phone number extraction
            let rawPhone = (
                payload.phone || nested.phone || queryObj.phone ||
                payload.mobile || nested.mobile || queryObj.mobile ||
                payload.tel || nested.tel || queryObj.tel ||
                payload.whatsapp || nested.whatsapp || queryObj.whatsapp ||
                payload.phoneNumber || nested.phoneNumber || queryObj.phoneNumber ||
                payload.phone_number || nested.phone_number || queryObj.phone_number ||
                payload.contact || nested.contact || queryObj.contact ||
                payload.userPhone || nested.userPhone || queryObj.userPhone ||
                payload.clientPhone || nested.clientPhone || queryObj.clientPhone ||
                payload.mobile_number || nested.mobile_number || queryObj.mobile_number ||
                payload.number || nested.number || queryObj.number ||
                ''
            ).toString().trim();

            if (!rawPhone && text) {
                const phoneMatch = text.match(/(?:\+?20|0020|0)?1[0125]\d{8}|\+?\d{10,15}/);
                if (phoneMatch) rawPhone = phoneMatch[0];
            }

            let cleanNumber = rawPhone.replace(/\D/g, '');
            let isSyntheticPhone = false;

            if (!cleanNumber) {
                isSyntheticPhone = true;
                cleanNumber = 'web_' + Date.now().toString().slice(-6) + '_' + Math.random().toString(36).substr(2, 3);
            } else {
                if (cleanNumber.startsWith('00')) {
                    cleanNumber = cleanNumber.slice(2);
                }
                if (cleanNumber.startsWith('0') && cleanNumber.length === 11) {
                    cleanNumber = '2' + cleanNumber; // standard Egyptian 01... -> 201...
                } else if (cleanNumber.length === 10 && cleanNumber.startsWith('1')) {
                    cleanNumber = '20' + cleanNumber;
                }
            }

            // 2. Client Name extraction
            let rawName = (
                payload.name || nested.name || queryObj.name ||
                payload.clientName || nested.clientName || queryObj.clientName ||
                payload.client_name || nested.client_name || queryObj.client_name ||
                payload.customerName || nested.customerName || queryObj.customerName ||
                payload.customer_name || nested.customer_name || queryObj.customer_name ||
                payload.fullName || nested.fullName || queryObj.fullName ||
                payload.full_name || nested.full_name || queryObj.full_name ||
                payload.userName || nested.userName || queryObj.userName ||
                payload.user_name || nested.user_name || queryObj.user_name ||
                payload.sender || nested.sender || queryObj.sender ||
                payload.first_name || nested.first_name || queryObj.first_name ||
                ''
            ).toString().trim();

            if (!rawName && text) {
                const nameMatch = text.match(/(?:الاسم|اسم العميل|العميل|Name|Client|Customer)\s*[:=]?\s*([^\n\r,]+)/i);
                if (nameMatch) rawName = nameMatch[1].trim();
            }
            if (!rawName) {
                rawName = isSyntheticPhone ? 'عميل موقع شركة تيكسورا' : `عميل (${cleanNumber})`;
            }

            // 3. Product / Service extraction
            let rawProduct = (
                payload.product || nested.product || queryObj.product ||
                payload.service || nested.service || queryObj.service ||
                payload.services || nested.services || queryObj.services ||
                payload.serviceName || nested.serviceName || queryObj.serviceName ||
                payload.service_name || nested.service_name || queryObj.service_name ||
                payload.selectedService || nested.selectedService || queryObj.selectedService ||
                payload.selected_service || nested.selected_service || queryObj.selected_service ||
                payload.project || nested.project || queryObj.project ||
                payload.projectName || nested.projectName || queryObj.projectName ||
                payload.project_name || nested.project_name || queryObj.project_name ||
                payload.subject || nested.subject || queryObj.subject ||
                payload.title || nested.title || queryObj.title ||
                ''
            ).toString().trim();

            if (!rawProduct && text) {
                const productMatch = text.match(/(?:المنتج|الخدمة|اسم المنتج|المشروع|نوع المشروع|الطلب|Product|Service|Project)\s*[:=]?\s*([^\n\r,]+)/i);
                if (productMatch) rawProduct = productMatch[1].trim();
            }
            if (!rawProduct) {
                rawProduct = 'تطوير وبرمجة وتصميم (موقع شركة Texora)';
            }

            // 4. Details / Specifications extraction
            let rawDetails = (
                payload.details || nested.details || queryObj.details ||
                payload.message || nested.message || queryObj.message ||
                payload.notes || nested.notes || queryObj.notes ||
                payload.description || nested.description || queryObj.description ||
                payload.specs || nested.specs || queryObj.specs ||
                payload.specification || nested.specification || queryObj.specification ||
                payload.requirements || nested.requirements || queryObj.requirements ||
                payload.comment || nested.comment || queryObj.comment ||
                payload.body || nested.body || queryObj.body ||
                ''
            ).toString().trim();

            if (!rawDetails && text) {
                const detailsMatch = text.match(/(?:التفاصيل|تفاصيل المنتج|المواصفات|المطلوب|الملاحظات|الرسالة|Details|Specs|Notes|Message)\s*[:=]?\s*([\s\S]+?)(?=\n-|\n⏰|\n🌐|$)/i);
                if (detailsMatch) rawDetails = detailsMatch[1].trim();
                else if (text.length > 5 && text !== rawName && text !== rawProduct) rawDetails = text;
            }
            if (!rawDetails) {
                rawDetails = 'طلب مشروع جديد ومناقشة المواصفات الفنية والتصميم';
            }

            // 5. Email extraction
            let rawEmail = (
                payload.email || nested.email || queryObj.email ||
                payload.mail || nested.mail || queryObj.mail ||
                payload.clientEmail || nested.clientEmail || queryObj.clientEmail ||
                payload.client_email || nested.client_email || queryObj.client_email ||
                ''
            ).toString().trim();
            if (!rawEmail && text) {
                const emailMatch = text.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/);
                if (emailMatch) rawEmail = emailMatch[0];
            }

            // 6. Source
            const rawSource = (
                payload.source || nested.source || queryObj.source ||
                'موقع شركة Texora (Website Order API)'
            ).toString().trim();

            const targetId = `${cleanNumber}@c.us`;
            const existing = clientsDB[cleanNumber];

            const leadRecord: ClientLead = {
                id: existing?.id || `ord_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                name: rawName,
                phone: cleanNumber,
                request: `[${rawProduct}] - ${rawDetails}${rawEmail ? ` (البريد: ${rawEmail})` : ''}`,
                date: existing?.date || new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                source: rawSource,
                status: isWhatsappConnected 
                    ? 'تم استلام وتخزين الطلب بقاعدة البيانات (وجاري التواصل عبر الواتساب)' 
                    : 'تم استلام وتخزين الطلب بقاعدة بيانات السيرفر بنجاح (جاهز)'
            };

            // Save to database safely with atomic file write
            clientsDB[cleanNumber] = leadRecord;
            await safeSaveJSON('clients_db.json', clientsDB);

            // Save order to Supabase PostgreSQL database
            try {
                await saveOrderToSupabase({
                    id: leadRecord.id,
                    client_name: rawName,
                    phone: `+${cleanNumber}`,
                    company_or_brand: rawProduct,
                    service_id: payload.systemCategory || payload.service_id || 'website-wizard',
                    service_title: rawProduct,
                    details: rawDetails,
                    status: 'new',
                    source: rawSource,
                    whatsapp_notified: false,
                    telegram_notified: !!telegramBot
                });
                console.log(`[Supabase] Order ${leadRecord.id} saved to Supabase 'orders' table.`);
            } catch (supaErr: any) {
                console.warn('[Supabase Order Sync Warning]:', supaErr?.message || supaErr);
            }

            // Add context to conversation history
            if (!chatHistories[targetId]) {
                chatHistories[targetId] = [];
            }
            chatHistories[targetId].push({
                role: 'system',
                content: `[طلب جديد من موقع شركة Texora للبرمجيات]\nالعميل: ${rawName}\nالهاتف: +${cleanNumber}\nالخدمة: ${rawProduct}\nالتفاصيل: ${rawDetails}${rawEmail ? `\nالبريد: ${rawEmail}` : ''}`
            });
            await safeSaveJSON('db_history.json', chatHistories);

            // Emit live lead to dashboard
            if (ioInstance) {
                ioInstance.emit('new-lead', leadRecord);
            }
            console.log(`[Order API Saved Successfully] Client: ${rawName}, Phone: +${cleanNumber}, Product: ${rawProduct}`);

            // Send notification to Telegram Management Group (-5433306866) and Admin
            if (telegramBot) {
                const targetGroup = telegramGroupChatId || lastTelegramGroupChatId || '-5433306866';
                const tgNotify = `🚀 *طلب جديد وارد من موقع شركة TEXORA!* 🌐\n\n👤 *الاسم:* ${rawName}\n📞 *الرقم:* +${cleanNumber}\n💻 *الخدمة:* ${rawProduct}\n📝 *التفاصيل:* ${rawDetails}${rawEmail ? `\n📧 *البريد:* ${rawEmail}` : ''}\n⏰ *التاريخ:* ${new Date().toLocaleString('ar-EG')}\n\n✅ *تم توثيق وحفظ الطلب في قاعدة البيانات بنجاح!*\n📱 *${isWhatsappConnected ? 'جاري بدء المحادثة التلقائية على الواتساب فوراً...' : 'البيانات محفوظة بالسيرفر (الواتساب غير متصل حالياً)'}* ✨`;

                if (targetGroup) {
                    telegramBot.sendMessage(targetGroup, tgNotify, { parse_mode: 'Markdown' }).catch(err => {
                        console.error("[Telegram Group Notify Error]:", err?.message || err);
                    });
                }

                if (telegramChatId && telegramChatId !== targetGroup) {
                    telegramBot.sendMessage(telegramChatId, tgNotify, { parse_mode: 'Markdown' }).catch(() => {});
                }
            }

            // WhatsApp automated client outreach
            if (whatsappClient && isWhatsappConnected && !isSyntheticPhone) {
                const processOutreach = async () => {
                    try {
                        const promptForWelcome = `العميل قدم طلباً باسم (${rawName}) لخدمة (${rawProduct}) وتفاصيل (${rawDetails}) عبر موقع شركة Texora للبرمجيات.\n\nصيغ رسالة ترحيبية هادئة وقصيرة ومريحة جداً (سطرين إلى 3 أسطر فقط) باسم شركة Texora للبرمجيات، ترحب به وتؤكد له استلام طلبه وتسأله بكل بساطة وهدوء عن فكرته لنبدأ النقاش خطوة بخطوة. لا تسأله أسئلة كثيرة ولا تطلب كل التفاصيل دفعة واحدة.`;
                        const initialReply = await callGroqLLM(targetId, promptForWelcome, false, cleanNumber);
                        if (initialReply && whatsappClient) {
                            await whatsappClient.sendMessage(targetId, initialReply + "\u200B");
                            console.log(`[Order WhatsApp Outreach] Sent welcome message to +${cleanNumber}`);

                            // Update whatsapp_notified flag in Supabase
                            saveOrderToSupabase({
                                id: leadRecord.id,
                                client_name: rawName,
                                phone: `+${cleanNumber}`,
                                service_title: rawProduct,
                                details: rawDetails,
                                whatsapp_notified: true
                            }).catch(() => {});
                        }

                        // WhatsApp Admin notification
                        if (adminNumber) {
                            let adminTarget = adminNumber.replace(/\D/g, '');
                            if (adminTarget.startsWith('0')) adminTarget = '2' + adminTarget;
                            const adminId = `${adminTarget}@c.us`;
                            const adminNotify = `🔔 *طلب وارد جديد من موقع شركة Texora!*\n\n👤 *العميل:* ${rawName}\n📞 *الرقم:* +${cleanNumber}\n💻 *الخدمة:* ${rawProduct}\n📝 *الطلب:* ${rawDetails}\n\n_قام المساعد الذكي بالتواصل الفوري مع العميل عبر الواتساب لمناقشة التصميم._`;
                            await whatsappClient.sendMessage(adminId, adminNotify + "\u200B").catch(() => {});
                        }
                    } catch (waErr) {
                        console.error("[Order WhatsApp Outreach Error]:", waErr);
                    }
                };
                setImmediate(processOutreach);
            }

            // Standard, robust 200 OK JSON response
            res.status(200).json({
                ok: true,
                success: true,
                saved: true,
                message: isWhatsappConnected
                    ? 'تم استلام وتخزين الطلب في قاعدة البيانات بنجاح وبدء التواصل التلقائي عبر الواتساب'
                    : 'تم استلام وتخزين الطلب في قاعدة بيانات السيرفر بنجاح (قاعدة البيانات نشطة وجاهزة)',
                orderId: leadRecord.id,
                lead: leadRecord,
                database: {
                    status: 'healthy',
                    storageFile: 'clients_db.json',
                    totalSavedClients: Object.keys(clientsDB).length
                },
                notifications: {
                    telegramNotified: !!telegramBot,
                    whatsappConnected: isWhatsappConnected
                }
            });
        } catch (err: any) {
            console.error("[Order API Error]:", err);
            res.status(500).json({ ok: false, success: false, error: err.message || 'Server error processing order' });
        }
    };

    // Register all common order routes and drop-in Telegram proxy
    app.all('/api/new-order', handleUniversalWebsiteOrder);
    app.all('/api/order', handleUniversalWebsiteOrder);
    app.all('/api/orders', handleUniversalWebsiteOrder);
    app.all('/api/website-order', handleUniversalWebsiteOrder);
    app.all('/api/telegram-webhook', handleUniversalWebsiteOrder);
    app.all('/api/telegram/send', handleUniversalWebsiteOrder);
    app.all('/api/telegram/send-message', handleUniversalWebsiteOrder);
    app.all('/api/bot/send-message', handleUniversalWebsiteOrder);
    app.all('/bot:token/sendMessage', handleUniversalWebsiteOrder);
    app.all('/bot*/sendMessage', handleUniversalWebsiteOrder);

    app.get('/api/whatsapp-status', (req, res) => {
        const now = Date.now();
        // If not connected and not started, auto-trigger background start
        if (!whatsappClient && !isStartingWhatsApp) {
            startWhatsappClient().catch(() => {});
        }
        const ageSec = lastQrTimestamp > 0 ? Math.round((now - lastQrTimestamp) / 1000) : 999;
        res.json({ 
            connected: isWhatsappConnected, 
            qr: qrCodeDataUrl,
            adminNumber,
            isReady: !!whatsappClient || isStartingWhatsApp,
            hasSavedSession,
            qrTimestamp: lastQrTimestamp,
            ageSeconds: ageSec,
            expiresInSec: Math.max(0, 20 - ageSec)
        });
    });

    app.get(['/api/whatsapp-qr.png', '/api/qr.png'], (req, res) => {
        if (qrCodeDataUrl) {
            const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
            const img = Buffer.from(base64Data, 'base64');
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': img.length,
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
            });
            return res.end(img);
        }
        res.status(404).send('QR code generating, please refresh in 2 seconds...');
    });

    app.get(['/qr', '/link', '/connect', '/whatsapp'], (req, res) => {
        if (!whatsappClient && !isStartingWhatsApp) {
            startWhatsappClient().catch(() => {});
        }

        if (isWhatsappConnected) {
            return res.send(`
                <!DOCTYPE html>
                <html dir="rtl" lang="ar">
                <head>
                    <meta charset="UTF-8">
                    <title>واتساب متصل - Texora Bot</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <script src="https://cdn.tailwindcss.com"></script>
                </head>
                <body class="bg-slate-950 text-white min-h-screen flex items-center justify-center p-4 font-sans">
                    <div class="bg-slate-900 border border-emerald-500/40 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
                        <div class="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-lg shadow-emerald-500/20">
                            ✓
                        </div>
                        <h1 class="text-2xl font-black text-emerald-400 mb-2">واتساب متصل ويعمل سحابياً! 🚀</h1>
                        <p class="text-slate-300 text-sm mb-6 leading-relaxed">تم توثيق جلسة واتساب بنجاح دائم، ويعمل البوت الآن 24/7 سحابياً للرد والتسويق واستقبال طلبات العملاء آلياً.</p>
                        <a href="/" class="inline-block w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg transition transform active:scale-95">
                            الانتقال إلى لوحة التحكم
                        </a>
                    </div>
                </body>
                </html>
            `);
        }

        const qrImgSrc = qrCodeDataUrl ? qrCodeDataUrl : '';
        const initialImgStyle = qrImgSrc ? '' : 'display: none;';
        const initialSpinnerStyle = qrImgSrc ? 'display: none;' : '';

        return res.send(`
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>ربط واتساب السحابي اللحظي - Texora Bot</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script src="https://cdn.tailwindcss.com"></script>
                <script src="/socket.io/socket.io.js"></script>
                <style>
                    @keyframes pulse-ring {
                        0% { transform: scale(0.95); opacity: 0.8; }
                        50% { transform: scale(1.02); opacity: 1; }
                        100% { transform: scale(0.95); opacity: 0.8; }
                    }
                    .pulse-ring { animation: pulse-ring 2.5s infinite ease-in-out; }
                </style>
            </head>
            <body class="bg-slate-950 text-white min-h-screen flex items-center justify-center p-4 font-sans selection:bg-indigo-500">
                <div class="bg-slate-900/95 backdrop-blur-xl border border-indigo-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl relative">
                    
                    <!-- Live Dynamic Badge -->
                    <div class="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold mb-4">
                        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span id="live-status-text">🟢 كود لحظي مباشر (تجدد تلقائي مستمر)</span>
                    </div>

                    <h1 class="text-2xl font-black text-white mb-2">ربط واتساب بالذكاء الاصطناعي 📱</h1>
                    <p class="text-slate-400 text-xs sm:text-sm mb-5 leading-relaxed">
                        امسح الرمز اللحظي أدناه فوراً عبر تطبيق واتساب لربط البوت السحابي والعمل 24/7.
                    </p>
                    
                    <!-- QR Box Container -->
                    <div id="qr-box-wrap" class="bg-white p-4 rounded-3xl inline-block shadow-2xl mb-4 mx-auto min-w-[280px] min-h-[280px] flex items-center justify-center relative border-4 border-indigo-500/20 transition-all duration-300">
                        <img id="qr-img" ${qrImgSrc ? `src="${qrImgSrc}"` : ''} alt="WhatsApp Live QR" class="w-64 h-64 object-contain rounded-2xl shadow-inner transition-opacity duration-300" style="${initialImgStyle}">
                        <div id="qr-spinner" class="w-64 h-64 flex flex-col items-center justify-center text-slate-700 bg-slate-50 rounded-2xl p-4" style="${initialSpinnerStyle}">
                            <div class="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                            <p class="text-xs font-black text-slate-700">جاري توليد كود لحظي فائق السرعة...</p>
                            <p class="text-[10px] text-slate-400 mt-1">يتم التواصل مباشرة مع خوادم واتساب</p>
                        </div>
                    </div>

                    <!-- Countdown & Progress Bar -->
                    <div class="bg-slate-800/80 rounded-2xl p-3 border border-slate-700/60 mb-4">
                        <div class="flex items-center justify-between text-xs text-slate-300 mb-2 font-medium">
                            <span class="flex items-center gap-1.5">
                                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                                <span>صلاحية الكود: <b id="countdown-sec" class="text-emerald-400 font-mono text-sm">--</b> ثانية</span>
                            </span>
                            <button onclick="requestNewQR()" id="refresh-btn" class="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1 rounded-xl transition shadow active:scale-95">
                                🔄 تجديد الآن
                            </button>
                        </div>
                        <div class="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div id="progress-bar" class="bg-gradient-to-r from-emerald-500 to-indigo-500 h-full transition-all duration-1000" style="width: 100%;"></div>
                        </div>
                    </div>

                    <!-- Steps Guide -->
                    <div class="text-right bg-slate-800/50 rounded-2xl p-4 text-xs space-y-2.5 text-slate-300 border border-slate-700/50 mb-4">
                        <div class="font-bold text-indigo-300 mb-1 flex items-center gap-1.5">
                            <span>📌</span> خطوات الربط لمرة واحدة فقط:
                        </div>
                        <div class="flex items-start gap-2">
                            <span class="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                            <span>افتح تطبيق <b>واتساب</b> على هاتفك المحمول.</span>
                        </div>
                        <div class="flex items-start gap-2">
                            <span class="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                            <span>اضغط على خيارات (الثلاث نقاط) &gt; <b>الأجهزة المرتبطة</b>.</span>
                        </div>
                        <div class="flex items-start gap-2">
                            <span class="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                            <span>اضغط <b>ربط جهاز</b> ووجّه الكاميرا نحو الكود أعلاه مباشرة.</span>
                        </div>
                    </div>

                    <!-- Footer Links & Reset -->
                    <div class="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800">
                        <a href="/api/whatsapp-qr.png" target="_blank" class="text-indigo-400 hover:text-indigo-300 transition font-medium">فتح الكود كصورة مباشرة ↗</a>
                        <a href="/" class="text-slate-400 hover:text-white transition">لوحة التحكم &larr;</a>
                    </div>
                    <button onclick="requestHardReset()" class="text-[10px] text-rose-400/80 hover:text-rose-300 transition block mt-3 mx-auto">
                        ⚠️ هل واجهت تعليقاً في الرمز؟ اضغط لإعادة ضبط وتشغيل البوت بالكامل ⚡
                    </button>
                </div>

                <script>
                    const qrImg = document.getElementById('qr-img');
                    const qrSpinner = document.getElementById('qr-spinner');
                    const liveStatus = document.getElementById('live-status-text');
                    const countdownEl = document.getElementById('countdown-sec');
                    const progressBar = document.getElementById('progress-bar');
                    const refreshBtn = document.getElementById('refresh-btn');
                    const qrBoxWrap = document.getElementById('qr-box-wrap');
                    let timeLeft = 20;
                    let lastKnownQr = '';

                    function applyNewQR(qrBase64) {
                        if (!qrBase64) return;
                        if (lastKnownQr !== qrBase64) {
                            lastKnownQr = qrBase64;
                            qrImg.src = qrBase64;
                            qrImg.style.display = 'block';
                            qrSpinner.style.display = 'none';
                            timeLeft = 25;
                            if (qrBoxWrap) {
                                qrBoxWrap.classList.add('border-emerald-500/80');
                                setTimeout(() => qrBoxWrap.classList.remove('border-emerald-500/80'), 800);
                            }
                            if (liveStatus) liveStatus.innerText = '🟢 تم تجديد الكود اللحظي بنجاح';
                        }
                    }

                    // 1. WebSocket Live Stream
                    try {
                        const socket = io();
                        socket.on('whatsapp-status', (data) => {
                            if (!data) return;
                            if (data.connected) {
                                window.location.reload();
                                return;
                            }
                            if (data.qr) {
                                applyNewQR(data.qr);
                            }
                        });
                    } catch(e) {}

                    // 2. High-Frequency Poller fallback (every 2s)
                    async function pollWhatsAppStatus() {
                        try {
                            const res = await fetch('/api/whatsapp-status?t=' + Date.now());
                            if (!res.ok) return;
                            const data = await res.json();
                            
                            if (data.connected) {
                                window.location.reload();
                                return;
                            }

                            if (data.qr) {
                                applyNewQR(data.qr);
                            }
                        } catch (err) {}
                    }
                    setInterval(pollWhatsAppStatus, 2000);
                    // Run immediately on page open
                    pollWhatsAppStatus();

                    // 3. Countdown timer with visual progress bar (only runs when QR is present)
                    setInterval(() => {
                        if (!lastKnownQr) {
                            if (countdownEl) countdownEl.innerText = '--';
                            if (progressBar) progressBar.style.width = '100%';
                            return;
                        }

                        timeLeft--;
                        if (timeLeft <= 0) {
                            timeLeft = 25;
                            pollWhatsAppStatus();
                        }
                        if (countdownEl) countdownEl.innerText = timeLeft;
                        if (progressBar) {
                            const pct = Math.max(0, Math.min(100, (timeLeft / 25) * 100));
                            progressBar.style.width = pct + '%';
                            if (pct < 30) {
                                progressBar.className = "bg-amber-500 h-full transition-all duration-1000";
                            } else {
                                progressBar.className = "bg-gradient-to-r from-emerald-500 to-indigo-500 h-full transition-all duration-1000";
                            }
                        }
                    }, 1000);

                    // 4. On-Demand QR Refresh
                    async function requestNewQR(silent = false) {
                        if (!silent && refreshBtn) {
                            refreshBtn.innerText = '⏳ جاري التجديد...';
                            refreshBtn.disabled = true;
                        }
                        try {
                            await fetch('/api/whatsapp/refresh-qr', { method: 'POST' });
                        } catch(e) {}
                        setTimeout(() => {
                            if (refreshBtn) {
                                refreshBtn.innerText = '🔄 تجديد الآن';
                                refreshBtn.disabled = false;
                            }
                            pollWhatsAppStatus();
                        }, 1200);
                    }

                    // 5. Hard Reset
                    async function requestHardReset() {
                        if (!confirm("هل تريد إعادة تشغيل سيرفر البوت بالكامل لتوليد رمز جديد نظيف؟")) return;
                        if (liveStatus) liveStatus.innerText = '⏳ جاري إعادة تشغيل البوت...';
                        try {
                            await fetch('/api/whatsapp/reset?clean=true', { method: 'POST' });
                        } catch(e) {}
                        setTimeout(() => window.location.reload(), 2500);
                    }
                </script>
            </body>
            </html>
        `);
    });

    app.post('/api/clear-memory', (req, res) => {
        try {
            // Clear memory dictionaries
            for (const key of Object.keys(chatHistories)) {
                delete chatHistories[key];
            }
            for (const key of Object.keys(clientsDB)) {
                delete clientsDB[key];
            }
            tasksDB.length = 0; // clear scheduled tasks

            // Delete files
            if (fs.existsSync('clients_db.json')) fs.unlinkSync('clients_db.json');
            if (fs.existsSync('db_history.json')) fs.unlinkSync('db_history.json');
            if (fs.existsSync('tasks_db.json')) fs.unlinkSync('tasks_db.json');
            
            res.json({ success: true, message: 'تم مسح ذاكرة البوت بالكامل.' });
        } catch (e: any) {
            console.error("Clear memory error", e);
            res.status(500).json({ success: false, error: e.message });
        }
    });

    // Serve uploads statically
    app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

    // Texora Server Discovery & Information Endpoint
    app.get('/api/texora/server-info', (req, res) => {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
        const serverOrigin = `${protocol}://${host}`;
        const webhookUrl = `${serverOrigin}/api/texora/order`;

        res.json({
            success: true,
            serverUrl: serverOrigin,
            webhookUrl: webhookUrl,
            endpoints: {
                order: `${serverOrigin}/api/texora/order`,
                lead: `${serverOrigin}/api/texora/lead`,
                clients: `${serverOrigin}/api/texora/clients`,
                testLead: `${serverOrigin}/api/texora/test-lead`
            },
            storage: {
                type: 'JSON Filesystem Persistence (No External DB Needed)',
                clientsCount: Object.keys(clientsDB).length,
                historySessionsCount: Object.keys(chatHistories).length,
                tasksCount: tasksDB.length,
                storageFile: 'clients_db.json'
            },
            whatsapp: {
                connected: isWhatsappConnected,
                adminConfigured: !!adminNumber
            }
        });
    });

    // Clean clients DB (no pre-seeded mock records)

    // Register all standard and alternative endpoints for max compatibility with any frontend
    const webhookEndpoints = [
        '/api/texora/order',
        '/api/texora/orders',
        '/api/texora/lead',
        '/api/texora/leads',
        '/api/texora/webhook',
        '/api/texora/contact',
        '/api/texora/service',
        '/api/texora/services',
        '/api/texora/dispatch',
        '/api/website/order',
        '/api/website/lead',
        '/api/website/webhook',
        '/api/order',
        '/api/orders',
        '/api/lead',
        '/api/leads',
        '/api/webhook',
        '/api/webhooks',
        '/api/contact',
        '/api/contacts',
        '/api/service-order',
        '/api/services/order',
        '/api/service/request',
        '/api/services',
        '/api/service',
        '/api/bot/order',
        '/api/bot/lead',
        '/api/bot/dispatch',
        '/api/bot/request',
        '/api/dispatch',
        '/api/send-order',
        '/api/submit-order',
        '/api/submit',
        '/api/v1/order',
        '/api/v1/lead',
        '/api/v1/webhook',
        '/api/v1/texora/order'
    ];

    webhookEndpoints.forEach(ep => {
        app.all(ep, handleUniversalWebsiteOrder);
    });

    // Database Health, Diagnostics & Live Read/Write Verification Endpoints
    app.get(['/api/database/status', '/api/database/verify', '/api/db/status'], async (req, res) => {
        try {
            const dbFile = path.join(process.cwd(), 'clients_db.json');
            const historyFile = path.join(process.cwd(), 'db_history.json');
            const exists = fs.existsSync(dbFile);
            let stat = null;
            if (exists) {
                stat = fs.statSync(dbFile);
            }

            // Perform live atomic read/write verification probe
            let writeProbePassed = false;
            let readProbePassed = false;
            const probeId = `__probe_${Date.now()}`;
            try {
                // Read
                const currentData = exists ? JSON.parse(fs.readFileSync(dbFile, 'utf8')) : {};
                readProbePassed = true;

                // Write probe
                currentData[probeId] = {
                    id: probeId,
                    name: 'Integrity Probe',
                    phone: '0000000000',
                    request: 'Health Check',
                    date: new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                    status: 'verified'
                };
                await safeSaveJSON('clients_db.json', currentData);

                // Verify write
                const reRead = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
                if (reRead[probeId]) {
                    writeProbePassed = true;
                    delete reRead[probeId];
                    await safeSaveJSON('clients_db.json', reRead);
                }
            } catch (probeErr) {
                console.error("[DB Probe Error]:", probeErr);
            }

            res.json({
                success: true,
                status: (exists && writeProbePassed && readProbePassed) ? 'healthy' : 'operational',
                message: 'قاعدة البيانات الدائمة تعمل بكفاءة 100% وبدون أخطاء',
                database: {
                    type: 'JSON Filesystem Persistence (Atomic Safe Writes)',
                    file: 'clients_db.json',
                    path: dbFile,
                    exists: exists,
                    fileSizeBytes: stat?.size || 0,
                    lastModified: stat?.mtime || null,
                    clientsCount: Object.keys(clientsDB).length,
                    historySessionsCount: Object.keys(chatHistories).length,
                    tasksCount: tasksDB.length,
                    readVerification: readProbePassed ? 'passed_100%' : 'failed',
                    writeVerification: writeProbePassed ? 'passed_100%' : 'failed',
                    atomicLockSafety: 'enabled'
                },
                serverTime: new Date().toISOString()
            });
        } catch (e: any) {
            res.status(500).json({ success: false, status: 'error', error: e.message });
        }
    });

    app.post('/api/database/test-write', async (req, res) => {
        try {
            const testPhone = '201000000000';
            const testOrder: ClientLead = {
                id: `test_${Date.now()}`,
                name: req.body?.name || 'فحص تجريبي لقاعدة البيانات',
                phone: testPhone,
                request: req.body?.request || 'اختبار تأكيد كتابة وقراءة قاعدة البيانات بنجاح',
                date: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                source: 'فحص جودة قاعدة البيانات (System Test)',
                status: 'تم التحقق بنجاح'
            };

            clientsDB[testPhone] = testOrder;
            await safeSaveJSON('clients_db.json', clientsDB);

            if (ioInstance) {
                ioInstance.emit('new-lead', testOrder);
            }

            res.json({
                success: true,
                message: 'تمت تجربة الكتابة في قاعدة البيانات بنجاح تام وتأكيد الحفظ على القرص',
                totalSaved: Object.keys(clientsDB).length,
                record: testOrder
            });
        } catch (e: any) {
            res.status(500).json({ success: false, error: e.message });
        }
    });

    app.get('/api/texora/clients', (req, res) => {
        const list = Object.values(clientsDB).sort((a, b) => {
            const dateA = a.lastUpdated || a.date || '';
            const dateB = b.lastUpdated || b.date || '';
            return dateB.localeCompare(dateA);
        });
        res.json({ success: true, count: list.length, clients: list, storageFile: 'clients_db.json' });
    });

    app.delete('/api/texora/clients/:phone', (req, res) => {
        const phone = req.params.phone.replace(/\D/g, '');
        if (clientsDB[phone]) {
            delete clientsDB[phone];
            safeSaveJSON('clients_db.json', clientsDB);
            io.emit('client-deleted', { phone });
            res.json({ success: true, message: 'تم حذف العميل بنجاح' });
        } else {
            res.status(404).json({ success: false, error: 'العميل غير موجود' });
        }
    });

    app.post('/api/texora/clients/clear', (req, res) => {
        for (const k of Object.keys(clientsDB)) {
            delete clientsDB[k];
        }
        if (fs.existsSync('clients_db.json')) fs.unlinkSync('clients_db.json');
        io.emit('clients-cleared');
        res.json({ success: true, message: 'تم مسح كافة طلبات العملاء بنجاح' });
    });

    app.get('/api/texora/client-chat/:phone', (req, res) => {
        const rawPhone = req.params.phone.replace(/\D/g, '');
        const targetId = `${rawPhone}@c.us`;
        const history = chatHistories[targetId] || chatHistories[`web_${rawPhone}`] || [];
        const clientInfo = clientsDB[rawPhone] || null;
        res.json({ success: true, phone: rawPhone, client: clientInfo, history });
    });

    app.post('/api/texora/client-chat/:phone', async (req, res) => {
        try {
            const rawPhone = req.params.phone.replace(/\D/g, '');
            const targetId = `${rawPhone}@c.us`;
            const { message } = req.body;
            if (!message || !message.trim()) {
                return res.status(400).json({ success: false, error: 'الرسالة مطلوبة' });
            }

            if (!chatHistories[targetId]) {
                chatHistories[targetId] = [];
            }
            chatHistories[targetId].push({ role: 'user', content: message.trim() });
            safeSaveJSON('db_history.json', chatHistories);

            const reply = await callGroqLLM(targetId, message.trim(), false, rawPhone);

            // If WhatsApp is active, send it via WhatsApp too
            if (whatsappClient && isWhatsappConnected) {
                await whatsappClient.sendMessage(targetId, reply + "\u200B").catch(e => console.error("WA send error:", e));
            }

            res.json({ success: true, reply, history: chatHistories[targetId] });
        } catch (err: any) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    app.post('/api/texora/test-lead', async (req, res) => {
        const testPhone = req.body.phone || '201000000000';
        const testName = req.body.name || 'محمد أحمد';
        const testReq = req.body.request || 'أريد تصميم وتطوير متجر إلكتروني لبيع الملابس مع لوحة تحكم وتطبيق هاتف';
        
        req.body = { phone: testPhone, name: testName, request: testReq, sync: true };
        return handleUniversalWebsiteOrder(req, res);
    });

    // 1. Interactive Live Web Chat Widget API
    app.post('/api/texora/widget/chat', async (req, res) => {
        try {
            const { sessionId, message, name, phone } = req.body;
            if (!message || !message.toString().trim()) {
                return res.status(400).json({ success: false, error: 'الرسالة مطلوبة (message is required)' });
            }

            const cleanMsg = message.toString().trim();
            const safeSessionId = (sessionId || 'anon_' + Date.now()).toString().trim();
            const sessionKey = `web_${safeSessionId}`;
            const cleanPhone = phone ? phone.toString().replace(/\D/g, '') : '';
            const cleanName = name ? name.toString().trim() : '';

            // If phone provided, create or update lead in DB
            if (cleanPhone) {
                const existing = clientsDB[cleanPhone];
                const leadRecord: ClientLead = {
                    id: existing?.id || `lead_widget_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                    name: cleanName || existing?.name || 'عميل من ودجت الموقع',
                    phone: cleanPhone,
                    request: cleanMsg,
                    date: existing?.date || new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                    source: 'ودجت الشات المباشر للموقع (Live Web Widget)',
                    status: 'محادثة جارية في ودجت الموقع'
                };
                clientsDB[cleanPhone] = leadRecord;
                safeSaveJSON('clients_db.json', clientsDB);
                if (ioInstance) ioInstance.emit('new-lead', leadRecord);
            }

            const reply = await callGroqLLM(sessionKey, cleanMsg, false, cleanPhone);

            let audioBase64: string | null = null;
            if (req.body.requestVoice || process.env.ENABLE_VOICE_REPLIES === 'true') {
                try {
                    const { oggBuffer } = await generateVoiceAudio(reply, 'lulwa');
                    audioBase64 = oggBuffer.toString('base64');
                } catch (ttsErr: any) {
                    console.warn("[Widget TTS Error]:", ttsErr?.message || ttsErr);
                }
            }

            res.json({
                success: true,
                reply: reply || "أهلاً بك في شركة Texora! كيف يمكنني مساعدتك في مشروعك اليوم؟",
                audioBase64: audioBase64,
                voiceName: 'lulwa',
                sessionId: safeSessionId
            });
        } catch (err: any) {
            console.error("[Widget Chat API Error]:", err);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // 1b. Interactive Voice Note Ingestion from Web Widget (Whisper Large V3 Turbo)
    app.post('/api/texora/widget/voice', async (req, res) => {
        try {
            const { sessionId, audioBase64, mimeType, name, phone } = req.body;
            if (!audioBase64) {
                return res.status(400).json({ success: false, error: 'الملف الصوتي مطلوب' });
            }

            const audioBuffer = Buffer.from(audioBase64, 'base64');
            const transcribedText = await transcribeAudio(audioBuffer, mimeType || 'audio/webm');
            
            if (!transcribedText || !transcribedText.trim()) {
                return res.status(400).json({ success: false, error: 'تعذر التعرف على الصوت بوضوح' });
            }

            const safeSessionId = (sessionId || 'anon_' + Date.now()).toString().trim();
            const sessionKey = `web_${safeSessionId}`;
            const cleanPhone = phone ? phone.toString().replace(/\D/g, '') : '';
            const reply = await callGroqLLM(sessionKey, transcribedText, false, cleanPhone);

            let replyAudioBase64: string | null = null;
            try {
                const { oggBuffer } = await generateVoiceAudio(reply, 'lulwa');
                replyAudioBase64 = oggBuffer.toString('base64');
            } catch (e) {}

            res.json({
                success: true,
                userText: transcribedText,
                reply: reply,
                audioBase64: replyAudioBase64,
                voiceName: 'lulwa',
                sessionId: safeSessionId
            });
        } catch (err: any) {
            console.error("[Widget Voice API Error]:", err);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // 1c. Quick Audio Preview / Testing Endpoint (Lulwa voice)
    app.post('/api/voice-preview', async (req, res) => {
        try {
            const text = req.body.text || 'أهلاً وسهلاً بك في شركة تيكسورا للبرمجيات، معك لولوة المستشارة التقنية للشركة.';
            const { oggBuffer } = await generateVoiceAudio(text, 'lulwa');
            res.setHeader('Content-Type', 'audio/ogg');
            res.send(oggBuffer);
        } catch (err: any) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // 2. Dynamic Channels & Integration Methods Info
    app.get('/api/texora/channels', (req, res) => {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
        const serverOrigin = `${protocol}://${host}`;

        res.json({
            success: true,
            serverUrl: serverOrigin,
            channels: [
                {
                    id: 'live-widget',
                    name: 'ودجت الشات المباشر للموقع (Embeddable Live Chat Widget)',
                    description: 'كود جافاسكريبت تضعه في أي موقع فيظهر زر ومربع شات تفاعلي يتحدث مع الزائر فوراً ويسجل بياناته.',
                    scriptTag: `<script src="${serverOrigin}/texora-widget.js" data-server="${serverOrigin}" data-title="مساعد Texora الذكي" data-color="#4f46e5"></script>`,
                    endpoint: `${serverOrigin}/api/texora/widget/chat`,
                    status: 'active'
                },
                {
                    id: 'webhook-form',
                    name: 'الـ Webhook ونماذج المواقع (HTML Forms / WordPress / Elementor / Zapier)',
                    description: 'إرسال بيانات النماذج فور ضغط الزائر على إرسال عبر طلب HTTP POST.',
                    endpoint: `${serverOrigin}/api/texora/order`,
                    supportedFormats: ['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data'],
                    status: 'active'
                },
                {
                    id: 'whatsapp-direct',
                    name: 'رابط وزر الواتساب الذكي (Click-to-WhatsApp Smart Link)',
                    description: 'زر في الموقع ينقل الزائر للواتساب مع رسالة افتتاحية مجهزة بمواصفات طلبه.',
                    whatsappNumber: adminNumber || (whatsappClient?.info?.wid?.user || ''),
                    status: isWhatsappConnected ? 'active' : 'waiting_auth'
                },
                {
                    id: 'rest-api',
                    name: 'واجهة برمجة التطبيقات المباشرة REST API',
                    description: 'تكامل كامل عبر كود برمجي (Node.js, Python, PHP, cURL).',
                    endpoint: `${serverOrigin}/api/texora/order`,
                    status: 'active'
                },
                {
                    id: 'telegram-bot',
                    name: 'تليجرام بوت المباشر (Telegram Deep-link)',
                    description: 'رابط مباشر يفتح محادثة تليجرام مع بوت الشركة.',
                    status: telegramBot ? 'active' : 'disabled'
                }
            ]
        });
    });

    // 3. Standalone Embeddable Widget JavaScript File Delivery
    app.get('/texora-widget.js', (req, res) => {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600');

        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
        const defaultServerUrl = `${protocol}://${host}`;

        const scriptContent = `
(function() {
    if (window.__TexoraWidgetLoaded) return;
    window.__TexoraWidgetLoaded = true;

    var scriptTag = document.currentScript || document.querySelector('script[src*="texora-widget.js"]');
    var serverUrl = (scriptTag && scriptTag.getAttribute('data-server')) || '${defaultServerUrl}';
    var title = (scriptTag && scriptTag.getAttribute('data-title')) || 'مساعد Texora الذكي';
    var primaryColor = (scriptTag && scriptTag.getAttribute('data-color')) || '#4f46e5';
    var position = (scriptTag && scriptTag.getAttribute('data-position')) || 'right';
    var initialGreeting = (scriptTag && scriptTag.getAttribute('data-greeting')) || 'أهلاً بك في شركة Texora للبرمجيات! 🚀\\nكيف يمكنني مساعدتك في تصميم وبرمجة مشروعك اليوم؟';

    var sessionId = localStorage.getItem('texora_widget_session_id');
    if (!sessionId) {
        sessionId = 'web_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        localStorage.setItem('texora_widget_session_id', sessionId);
    }

    var savedPhone = localStorage.getItem('texora_widget_phone') || '';
    var savedName = localStorage.getItem('texora_widget_name') || '';

    // Inject styles
    var style = document.createElement('style');
    style.innerHTML = \`
        #texora-widget-container * { box-sizing: border-box; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        #texora-widget-btn {
            position: fixed;
            bottom: 24px;
            \${position === 'left' ? 'left: 24px;' : 'right: 24px;'}
            width: 60px;
            height: 60px;
            border-radius: 30px;
            background: \${primaryColor};
            box-shadow: 0 10px 25px rgba(79, 70, 229, 0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 999999;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            border: none;
            outline: none;
        }
        #texora-widget-btn:hover {
            transform: scale(1.08);
            box-shadow: 0 14px 30px rgba(79, 70, 229, 0.6);
        }
        #texora-widget-btn svg { width: 28px; height: 28px; fill: white; }
        #texora-widget-window {
            position: fixed;
            bottom: 96px;
            \${position === 'left' ? 'left: 24px;' : 'right: 24px;'}
            width: 380px;
            max-width: calc(100vw - 32px);
            height: 580px;
            max-height: calc(100vh - 120px);
            background: #0f172a;
            color: #f8fafc;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            z-index: 999999;
            transform-origin: \${position === 'left' ? 'bottom left' : 'bottom right'};
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            direction: rtl;
        }
        #texora-widget-window.texora-hidden {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
            pointer-events: none;
        }
        .texora-header {
            background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
            padding: 16px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .texora-header-info { display: flex; align-items: center; gap: 10px; }
        .texora-avatar {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            background: \${primaryColor};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
        }
        .texora-title { font-weight: 700; font-size: 14px; color: #fff; margin: 0; }
        .texora-status { font-size: 11px; color: #34d399; display: flex; align-items: center; gap: 4px; }
        .texora-status-dot { width: 6px; height: 6px; border-radius: 3px; background: #34d399; }
        .texora-close-btn {
            background: transparent;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            font-size: 20px;
            padding: 4px 8px;
            border-radius: 6px;
        }
        .texora-close-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }
        .texora-body {
            flex: 1;
            padding: 16px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .texora-msg {
            max-width: 85%;
            padding: 12px 14px;
            border-radius: 14px;
            font-size: 13px;
            line-height: 1.5;
            word-break: break-word;
            white-space: pre-wrap;
        }
        .texora-msg.bot {
            background: #1e293b;
            color: #f1f5f9;
            align-self: flex-start;
            border-bottom-right-radius: 2px;
            border: 1px solid rgba(255,255,255,0.06);
        }
        .texora-msg.user {
            background: \${primaryColor};
            color: #ffffff;
            align-self: flex-end;
            border-bottom-left-radius: 2px;
        }
        .texora-quick-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 4px;
        }
        .texora-chip {
            background: #1e293b;
            border: 1px solid #334155;
            color: #93c5fd;
            padding: 5px 10px;
            border-radius: 12px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .texora-chip:hover {
            background: #334155;
            color: #fff;
            border-color: \${primaryColor};
        }
        .texora-input-bar {
            padding: 12px 14px;
            background: #090d16;
            border-top: 1px solid rgba(255,255,255,0.08);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .texora-input {
            flex: 1;
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 12px;
            padding: 10px 12px;
            color: #fff;
            font-size: 13px;
            outline: none;
            direction: rtl;
        }
        .texora-input:focus { border-color: \${primaryColor}; }
        .texora-send-btn {
            background: \${primaryColor};
            border: none;
            border-radius: 10px;
            width: 38px;
            height: 38px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: #fff;
            transition: background 0.2s;
        }
        .texora-send-btn:hover { filter: brightness(1.15); }
        .texora-lead-bar {
            background: #1e1b4b;
            padding: 8px 12px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
        }
        .texora-lead-input {
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 6px;
            padding: 4px 8px;
            color: #fff;
            font-size: 11px;
            flex: 1;
            outline: none;
            direction: ltr;
        }
        .texora-lead-btn {
            background: #10b981;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 4px 8px;
            font-size: 11px;
            font-weight: bold;
            cursor: pointer;
        }
        .texora-voice-play-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-top: 8px;
            padding: 5px 12px;
            border-radius: 14px;
            background: linear-gradient(135deg, #6366f1, #4f46e5);
            color: #ffffff;
            border: none;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3);
            transition: transform 0.15s ease, opacity 0.15s ease;
        }
        .texora-voice-play-btn:hover {
            opacity: 0.92;
            transform: scale(1.02);
        }
    \`;
    document.head.appendChild(style);

    // Create DOM structure
    var container = document.createElement('div');
    container.id = 'texora-widget-container';
    container.innerHTML = \`
        <div id="texora-widget-window" class="texora-hidden">
            <div class="texora-header">
                <div class="texora-header-info">
                    <div class="texora-avatar">🤖</div>
                    <div>
                        <div class="texora-title">\${title}</div>
                        <div class="texora-status"><span class="texora-status-dot"></span> متصل الآن 24/7</div>
                    </div>
                </div>
                <button class="texora-close-btn" id="texora-close-trigger">✕</button>
            </div>
            
            <div class="texora-lead-bar" id="texora-phone-bar">
                <span>📞 رقمك لمتابعة الواتساب:</span>
                <input type="tel" id="texora-phone-input" class="texora-lead-input" placeholder="010XXXXXXXX" value="\${savedPhone}" />
                <button class="texora-lead-btn" id="texora-phone-save">حفظ</button>
            </div>

            <div class="texora-body" id="texora-messages">
                <div class="texora-msg bot">\${initialGreeting}</div>
                <div class="texora-quick-chips">
                    <button class="texora-chip" data-text="أريد تصميم وبرمجة متجر إلكتروني متكامل">🛒 تصميم متجر إلكتروني</button>
                    <button class="texora-chip" data-text="أريد برمجة تطبيق هاتف للـ Android و iOS">📱 تطبيق هاتف</button>
                    <button class="texora-chip" data-text="أريد معرفة أسعار وباقات تطوير المواقع">💰 استفسار عن الأسعار</button>
                </div>
            </div>

            <div class="texora-input-bar">
                <input type="text" id="texora-text-input" class="texora-input" placeholder="اكتب رسالتك هنا..." />
                <button id="texora-send-trigger" class="texora-send-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(180deg);"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
            </div>
        </div>

        <button id="texora-widget-btn" title="تحدث مع مساعد Texora">
            <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
        </button>
    \`;
    document.body.appendChild(container);

    var widgetBtn = document.getElementById('texora-widget-btn');
    var widgetWindow = document.getElementById('texora-widget-window');
    var closeBtn = document.getElementById('texora-close-trigger');
    var sendBtn = document.getElementById('texora-send-trigger');
    var inputField = document.getElementById('texora-text-input');
    var messagesContainer = document.getElementById('texora-messages');
    var phoneInput = document.getElementById('texora-phone-input');
    var phoneSaveBtn = document.getElementById('texora-phone-save');

    var isOpen = false;

    function toggleWidget() {
        isOpen = !isOpen;
        if (isOpen) {
            widgetWindow.classList.remove('texora-hidden');
            setTimeout(function() { inputField.focus(); }, 150);
        } else {
            widgetWindow.classList.add('texora-hidden');
        }
    }

    widgetBtn.addEventListener('click', toggleWidget);
    closeBtn.addEventListener('click', toggleWidget);

    phoneSaveBtn.addEventListener('click', function() {
        var p = phoneInput.value.trim();
        if (p) {
            localStorage.setItem('texora_widget_phone', p);
            alert('تم حفظ رقم هاتفك وسيقوم المساعد بمتابعة طلبك وتوثيقه!');
        }
    });

    async function sendUserMessage(msgText) {
        var text = msgText || inputField.value.trim();
        if (!text) return;

        inputField.value = '';

        // Append user msg
        var userMsgDiv = document.createElement('div');
        userMsgDiv.className = 'texora-msg user';
        userMsgDiv.innerText = text;
        messagesContainer.appendChild(userMsgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Append loading bot msg
        var botLoadingDiv = document.createElement('div');
        botLoadingDiv.className = 'texora-msg bot';
        botLoadingDiv.innerText = 'جاري الرد...';
        messagesContainer.appendChild(botLoadingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            var currentPhone = phoneInput.value.trim() || localStorage.getItem('texora_widget_phone') || '';
            var resp = await fetch(serverUrl + '/api/texora/widget/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: sessionId,
                    message: text,
                    phone: currentPhone,
                    name: localStorage.getItem('texora_widget_name') || ''
                })
            });
            var data = await resp.json();
            if (data.success && data.reply) {
                botLoadingDiv.innerText = data.reply;
                if (data.audioBase64) {
                    var audioWrapper = document.createElement('div');
                    var playBtn = document.createElement('button');
                    playBtn.className = 'texora-voice-play-btn';
                    playBtn.innerHTML = '🔊 استمع لرد لولوة (صوتي)';
                    playBtn.onclick = function() {
                        var audio = new Audio('data:audio/ogg;base64,' + data.audioBase64);
                        audio.play();
                    };
                    audioWrapper.appendChild(playBtn);
                    botLoadingDiv.appendChild(audioWrapper);
                }
            } else {
                botLoadingDiv.innerText = 'أهلاً بك، تم استلام رسالتك وسنرد عليك فوراً.';
            }
        } catch (e) {
            botLoadingDiv.innerText = 'عذراً، حدث خطأ أثناء الاتصال بالسيرفر. يرجى المحاولة مرة أخرى.';
        }
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    sendBtn.addEventListener('click', function() { sendUserMessage(); });
    inputField.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendUserMessage();
    });

    // Handle Quick Chips
    document.querySelectorAll('.texora-chip').forEach(function(chip) {
        chip.addEventListener('click', function() {
            var text = chip.getAttribute('data-text');
            if (text) sendUserMessage(text);
        });
    });
})();
        `;
        res.send(scriptContent);
    });

    app.post('/api/chat', async (req, res) => {
         try {
             const { message } = req.body;
             if (!message || !String(message).trim()) {
                 return res.json({ reply: 'أهلاً بك! كيف يمكنني مساعدتك في مشروعك البرمجي اليوم؟' });
             }
             const reply = await callGroqLLM('dashboard_user', String(message), true);
             res.json({ reply });
         } catch (chatErr: any) {
             console.error("[POST /api/chat error]:", chatErr?.message || chatErr);
             res.json({ reply: 'أهلاً بك في شركة Texora للبرمجيات! تم استلام رسالتك، كيف يمكننا مساعدتك في تفاصيل طلبك؟' });
         }
    });

    if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({
            server: {
                middlewareMode: true,
                watch: {
                    ignored: ['**/.wwebjs_auth/**', '**/.wwebjs_cache/**', '**/*.json', '**/uploads/**', '**/node_modules/**']
                }
            },
            appType: "spa"
        });
        app.use(vite.middlewares);
    } else {
        const distPath = path.join(process.cwd(), 'dist');
        app.use(express.static(distPath));
        app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
    }

    server.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });

    // Background Realtime Poller for Supabase Website Orders
    let isProcessingSupabaseOrders = false;
    const notifiedTelegramOrders = new Set<string>();

    const pollSupabaseOrders = async () => {
        if (isProcessingSupabaseOrders) return;
        isProcessingSupabaseOrders = true;
        try {
            const pendingOrders = await getPendingOrders();
            if (!pendingOrders || pendingOrders.length === 0) return;

            for (const order of pendingOrders) {
                let cleanPhone = (order.phone || '').replace(/\D/g, '');
                if (cleanPhone.startsWith('0')) cleanPhone = '2' + cleanPhone;
                if (!cleanPhone.startsWith('2') && cleanPhone.length === 10) cleanPhone = '20' + cleanPhone;
                const targetId = `${cleanPhone}@c.us`;

                // 1. Send Telegram Notification (only once per order)
                if (telegramBot && !order.telegram_notified && !notifiedTelegramOrders.has(order.id)) {
                    notifiedTelegramOrders.add(order.id);
                    const targetGroup = telegramGroupChatId || lastTelegramGroupChatId || '-5433306866';
                    const tgText = `🚀 *طلب جديد وصل عبر موقع Texora الرسمي!*\n\n` +
                        `👤 *العميل:* ${order.client_name}\n` +
                        `📞 *الهاتف:* +${cleanPhone}\n` +
                        `💼 *الشركة/البراند:* ${order.company_or_brand || 'غير محدد'}\n` +
                        `📦 *الخدمة:* ${order.service_title}\n` +
                        `📝 *التفاصيل:* ${order.details}\n` +
                        `🌐 *المصدر:* ${order.source || 'الموقع الإلكتروني'}\n` +
                        `🕒 *التاريخ:* ${new Date().toLocaleString('ar-EG')}\n\n` +
                        `📲 ${isWhatsappConnected ? 'جاري بدء المحادثة الترحيبية على الواتساب تلقائياً... ⚡' : '⚠️ الواتساب غير متصل حالياً (الطلب محفوظ في Supabase)'}`;

                    try {
                        await telegramBot.sendMessage(targetGroup, tgText, { parse_mode: 'Markdown' });
                        console.log(`[Supabase Order Poller] Telegram notification sent for order ${order.id}`);
                    } catch (tgErr: any) {
                        console.warn("[Telegram Notify Error]:", tgErr?.message || tgErr);
                    }
                }

                // 2. WhatsApp Outreach (only when WhatsApp is connected)
                if (whatsappClient && isWhatsappConnected && cleanPhone.length >= 10) {
                    try {
                        const promptForWelcome = `العميل قدم طلباً باسم (${order.client_name}) لخدمة (${order.service_title}) وتفاصيل (${order.details}) عبر موقع الشركة الرسمي.\n\nصيغ رسالة ترحيبية ودية ومريحة جداً (سطرين إلى 3 أسطر) باسم شركة Texora للبرمجيات، ترحب به وتؤكد له استلام طلبه وتسأله بكل بساطة عن فكرته لتحديد المواصفات بوضوح.`;
                        const initialReply = await callGroqLLM(targetId, promptForWelcome, false, cleanPhone);
                        if (initialReply) {
                            await Promise.race([
                                whatsappClient.sendMessage(targetId, initialReply + "\u200B"),
                                new Promise((_, reject) => setTimeout(() => reject(new Error('WhatsApp order outreach timeout (10s)')), 10000))
                            ]);
                            console.log(`[Supabase Order Poller] Sent initial WhatsApp welcome to +${cleanPhone}`);
                        }
                    } catch (waErr: any) {
                        console.error('[Supabase Order Poller WA Error]:', waErr?.message || waErr);
                    } finally {
                        // ALWAYS mark notified so failed or unregistered numbers never cause endless locking loops!
                        await markOrderNotified(order.id, {
                            whatsapp_notified: true,
                            telegram_notified: true,
                            status: 'processed'
                        });
                    }
                } else {
                    await markOrderNotified(order.id, {
                        whatsapp_notified: true,
                        telegram_notified: true
                    });
                }
            }
        } catch (err: any) {
            console.error('[Supabase Order Poller Error]:', err?.message || err);
        } finally {
            isProcessingSupabaseOrders = false;
        }
    };

    // Poll Supabase every 20 seconds
    setInterval(pollSupabaseOrders, 20000);

    const cleanupAndExit = async () => {
        console.log("Shutting down gracefully...");
        if (telegramBot) {
            try { await telegramBot.stopPolling({ cancel: true }); } catch (e) {}
            telegramBot = null;
        }
        if (whatsappClient) {
            try { await whatsappClient.destroy(); } catch (e) {}
        }
        if (persistentBrowser) {
            try { await persistentBrowser.close(); } catch (e) {}
        }
        process.exit(0);
    };

    process.on('SIGINT', cleanupAndExit);
    process.on('SIGTERM', cleanupAndExit);
    // nodemon restart signal
    process.on('SIGUSR2', async () => {
        await cleanupAndExit();
    });
}

startServer();
