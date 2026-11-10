import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Settings, 
  MessageSquare, 
  Send, 
  ScanLine, 
  Bot, 
  RefreshCw, 
  Smartphone, 
  Users, 
  Globe, 
  Sparkles, 
  Code2, 
  CheckCircle2, 
  Trash2,
  Copy,
  Check,
  Server,
  HelpCircle,
  ArrowRight,
  Download,
  Search,
  ExternalLink,
  Clock,
  Database,
  ShieldCheck,
  Activity,
  MessageCircle,
  Layers,
  Zap,
  Share2,
  Sliders,
  Palette,
  Layout,
  Play,
  FileCode,
  Link,
  QrCode,
  Terminal,
  SendHorizontal,
  X
} from 'lucide-react';
import './index.css';

if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
  window.location.replace('https://bot-service-production-712e.up.railway.app' + window.location.pathname + window.location.search);
}

const socket = io('/', { transports: ['polling', 'websocket'] });

interface Config {
  adminNumber: string;
  globalInstructions: string;
  hasTelegram: boolean;
  telegramToken?: string;
  telegramUsername?: string;
  telegramGroupChatId?: string;
  lastGroupTitle?: string;
}

interface ClientLead {
  id?: string;
  name: string;
  phone: string;
  request: string;
  date?: string;
  lastUpdated?: string;
  source?: string;
  status?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'clients' | 'api-guide' | 'settings'>('api-guide');
  const [selectedIntegrationMethod, setSelectedIntegrationMethod] = useState<'whatsapp' | 'telegram'>('telegram');

  // Telegram Bot & Order State
  const [telegramTokenInput, setTelegramTokenInput] = useState('8831146675:AAE4LyAjvKbNgO_CpHsHmvofL25ogRsSfbg');
  const [telegramChatIdInput, setTelegramChatIdInput] = useState('');
  const [telegramGroupChatIdInput, setTelegramGroupChatIdInput] = useState('');
  const [telegramSaving, setTelegramSaving] = useState(false);
  const [telegramSaveMessage, setTelegramSaveMessage] = useState('');

  const [telegramOrderForm, setTelegramOrderForm] = useState({
    name: '',
    phone: '',
    product: '',
    details: ''
  });
  const [telegramOrderSubmitting, setTelegramOrderSubmitting] = useState(false);
  const [telegramOrderResult, setTelegramOrderResult] = useState<any>(null);
  const [tgCodeSnippetLang, setTgCodeSnippetLang] = useState<'curl' | 'js' | 'php'>('js');

  // Widget Configurator State
  const [widgetTitle, setWidgetTitle] = useState('مساعد Texora الذكي');
  const [widgetColor, setWidgetColor] = useState('#4f46e5');
  const [widgetPosition, setWidgetPosition] = useState<'right' | 'left'>('right');
  const [widgetGreeting, setWidgetGreeting] = useState('أهلاً بك في شركة Texora للبرمجيات! 🚀\nكيف يمكنني مساعدتك في تصميم وتطوير مشروعك اليوم؟');
  const [widgetSimulatorOpen, setWidgetSimulatorOpen] = useState(true);
  const [widgetSimMessages, setWidgetSimMessages] = useState<{ role: 'bot' | 'user'; text: string }[]>([
    { role: 'bot', text: 'أهلاً بك في شركة Texora للبرمجيات! 🚀\nكيف يمكنني مساعدتك في تصميم وتطوير مشروعك اليوم؟' }
  ]);
  const [widgetSimInput, setWidgetSimInput] = useState('');
  const [widgetSimPhone, setWidgetSimPhone] = useState('');
  const [widgetSimLoading, setWidgetSimLoading] = useState(false);
  const [copiedWidgetScript, setCopiedWidgetScript] = useState(false);
  const [copiedWidgetReact, setCopiedWidgetReact] = useState(false);

  // WhatsApp Direct Link Generator State
  const [waLinkPhone, setWaLinkPhone] = useState('201012345678');
  const [waLinkMsg, setWaLinkMsg] = useState('مرحباً، زرت موقع شركة Texora وأريد تفاصيل تصميم وبرمجة مشروع متجر وتطبيق.');
  const [copiedWaLink, setCopiedWaLink] = useState(false);
  const [copiedWaButtonCode, setCopiedWaButtonCode] = useState(false);

  // Webhook Live Ping Test State
  const [pingSubmitting, setPingSubmitting] = useState(false);
  const [pingResult, setPingResult] = useState<{
    status: number;
    latency: number;
    response: any;
    time: string;
  } | null>(null);

  // Telegram Direct Link
  const [telegramUsername, setTelegramUsername] = useState('TexoraOfficialBot');
  const [copiedTelegramLink, setCopiedTelegramLink] = useState(false);
  
  // Statuses
  const [waConnected, setWaConnected] = useState(false);
  const [playingVoice, setPlayingVoice] = useState(false);

  const playLulwaVoice = async () => {
    try {
      setPlayingVoice(true);
      const res = await fetch('/api/voice-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'أهلاً وسهلاً بك في شركة تيكسورا للحلول البرمجية، يسعدنا جداً تواصلك معنا، معك لولوة المستشارة التقنية للشركة.'
        })
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => setPlayingVoice(false);
      audio.onerror = () => setPlayingVoice(false);
      await audio.play();
    } catch (e) {
      setPlayingVoice(false);
    }
  };
  const [waLoading, setWaLoading] = useState(false);
  const [waQr, setWaQr] = useState<string | null>(null);
  const [qrExpiresIn, setQrExpiresIn] = useState<number>(25);
  const [isRefreshingQr, setIsRefreshingQr] = useState<boolean>(false);
  
  const [config, setConfig] = useState<Config>({ 
    adminNumber: '', 
    globalInstructions: '', 
    hasTelegram: false 
  });
  
  // Server Discovery & Endpoints State
  const [detectedHost, setDetectedHost] = useState(typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const [customHost, setCustomHost] = useState('');
  const [serverStats, setServerStats] = useState<{
    clientsCount: number;
    historySessionsCount: number;
    tasksCount: number;
    storageType: string;
  }>({
    clientsCount: 0,
    historySessionsCount: 0,
    tasksCount: 0,
    storageType: 'JSON Filesystem Persistence'
  });

  const effectiveHost = (customHost.trim() || detectedHost).replace(/\/+$/, '');
  const webhookEndpoint = `${effectiveHost}/api/texora/order`;

  // Leads & Clients
  const [clients, setClients] = useState<ClientLead[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [selectedClientForChat, setSelectedClientForChat] = useState<ClientLead | null>(null);
  const [clientChatHistory, setClientChatHistory] = useState<{ role: string; content?: string; text?: string }[]>([]);
  const [clientChatLoading, setClientChatLoading] = useState(false);
  const [clientChatInput, setClientChatInput] = useState('');
  const [lastServerLog, setLastServerLog] = useState<{
    time: string;
    status: number;
    message: string;
    clientPhone: string;
    source: string;
    isWhatsappConnected: boolean;
    latency?: number;
  } | null>(null);

  const [testLeadForm, setTestLeadForm] = useState({
    name: 'عبدالله الشمري',
    phone: '01012345678',
    request: 'أريد تصميم وتطوير متجر إلكتروني متكامل لبيع العطور مع تطبيق للهاتف وبوابة دفع إلكترونية'
  });
  const [testLeadSubmitting, setTestLeadSubmitting] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedHost, setCopiedHost] = useState(false);
  const [codeSnippetLang, setCodeSnippetLang] = useState<'js' | 'php' | 'curl' | 'python' | 'html'>('js');

  // Chat
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', text: string}[]>([
    {
      role: 'assistant',
      text: 'مرحباً بك! أنا المساعد الذكي الرسمي لشركة Texora للبرمجيات 🚀\nأنا جاهز لاستقبال طلبات العملاء من موقع الشركة، ومناقشة تفاصيل التصميم والبرمجة، وتأكيد طلباتهم وإرسال التقارير للإدارة.'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchServerInfo = async () => {
    try {
      const res = await fetch('/api/texora/server-info');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        if (data.serverUrl && !customHost) {
          setDetectedHost(data.serverUrl);
        }
        if (data.storage) {
          setServerStats({
            clientsCount: data.storage.clientsCount || 0,
            historySessionsCount: data.storage.historySessionsCount || 0,
            tasksCount: data.storage.tasksCount || 0,
            storageType: data.storage.type || 'JSON Filesystem Persistence'
          });
        }
      }
    } catch {
      // Graceful fallback during server startup/restart
    }
  };

  const fetchClients = async () => {
    setClientsLoading(true);
    try {
      const res = await fetch('/api/texora/clients');
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.success) {
        setClients(data.clients || []);
      }
    } catch {
      // Graceful fallback during server startup/restart
    } finally {
      setClientsLoading(false);
    }
  };

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp-status?t=' + Date.now());
      if (!res.ok) return;
      const data = await res.json();
      if (data) {
        setWaConnected(!!data.connected);
        setWaQr(data.qr || null);
        if (typeof data.expiresInSec === 'number') {
          setQrExpiresIn(data.expiresInSec);
        }
        if (data.isReady && !data.connected && !data.qr) {
          setWaLoading(true);
        } else {
          setWaLoading(false);
        }
      }
    } catch {
      // Graceful fallback during server startup/restart
    }
  };

  const refreshQrCode = async () => {
    setIsRefreshingQr(true);
    try {
      await fetch('/api/whatsapp/refresh-qr', { method: 'POST' });
      await checkStatus();
    } catch {
      // Graceful fallback
    } finally {
      setTimeout(() => setIsRefreshingQr(false), 1200);
    }
  };

  useEffect(() => {
    checkStatus();
    fetchClients();
    fetchServerInfo();

    socket.on('whatsapp-status', (data) => {
      setWaConnected(!!data.connected);
      setWaQr(data.qr);
      if (data.connected || data.qr || data.error) {
        setWaLoading(false);
      }
      if (data.error) {
        console.warn("WhatsApp status notice:", data.error);
      }
    });

    socket.on('config', (data) => {
      setConfig(prev => ({ ...prev, ...data }));
      if (data.telegramToken) {
        setTelegramTokenInput(data.telegramToken);
      }
      if (data.telegramUsername) {
        setTelegramUsername(data.telegramUsername);
      }
      if (data.telegramGroupChatId) {
        setTelegramGroupChatIdInput(data.telegramGroupChatId);
      }
    });

    socket.on('new-lead', (leadData: ClientLead) => {
      setClients(prev => {
        const filtered = prev.filter(c => c.phone !== leadData.phone);
        return [leadData, ...filtered];
      });
      fetchServerInfo();
      setLastServerLog({
        time: new Date().toLocaleTimeString('ar-EG'),
        status: 200,
        message: 'تم استقبال وتخزين طلب جديد في قاعدة بيانات السيرفر بنجاح (clients_db.json)',
        clientPhone: leadData.phone,
        source: leadData.source || 'طلب موقع Texora (API Webhook)',
        isWhatsappConnected: true
      });
    });

    socket.on('client-deleted', ({ phone }: { phone: string }) => {
      setClients(prev => prev.filter(c => c.phone !== phone));
      fetchServerInfo();
    });

    socket.on('clients-cleared', () => {
      setClients([]);
      fetchServerInfo();
    });

    // Background poll every 2.5 seconds to keep UI & QR synced in real-time even without WebSockets
    const statusInterval = setInterval(() => {
      checkStatus();
      fetchClients();
      fetchServerInfo();
    }, 2500);

    // Smooth UI countdown ticker
    const countdownInterval = setInterval(() => {
      setQrExpiresIn(prev => (prev > 1 ? prev - 1 : 25));
    }, 1000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(countdownInterval);
      socket.off('whatsapp-status');
      socket.off('config');
      socket.off('new-lead');
      socket.off('client-deleted');
      socket.off('clients-cleared');
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveConfig = async () => {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          adminNumber: config.adminNumber, 
          instructions: config.globalInstructions,
          telegramGroupChatId: telegramGroupChatIdInput.trim() || config.telegramGroupChatId
        })
      });
      alert('تم حفظ إعدادات شركة Texora ومعرف مجموعة التليجرام بنجاح');
    } catch {
      alert('حدث خطأ أثناء حفظ الإعدادات');
    }
  };

  const saveTelegramConfig = async () => {
    if (!telegramTokenInput.trim()) {
      alert('يرجى إدخال كود Bot Token الخاص بفرام التليجرام');
      return;
    }
    setTelegramSaving(true);
    setTelegramSaveMessage('');
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: telegramTokenInput.trim(),
          chatId: telegramChatIdInput.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setTelegramSaveMessage('✅ تم حفظ وتفعيل بوت التليجرام بنجاح! البوت يعمل الآن ويستقبل الرسائل من الموقع والتليجرام.');
        fetchServerInfo();
      } else {
        setTelegramSaveMessage('❌ ' + (data.error || 'فشل حفظ إعدادات التليجرام'));
      }
    } catch (e: any) {
      setTelegramSaveMessage('❌ خطأ في الاتصال بالسيرفر: ' + e.message);
    } finally {
      setTelegramSaving(false);
    }
  };

  const sendTelegramOrderTest = async () => {
    if (!telegramOrderForm.phone.trim()) {
      alert('يرجى كتابة رقم هاتف العميل');
      return;
    }
    setTelegramOrderSubmitting(true);
    setTelegramOrderResult(null);
    try {
      const res = await fetch('/api/telegram/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: telegramOrderForm.name,
          phone: telegramOrderForm.phone,
          product: telegramOrderForm.product,
          details: telegramOrderForm.details,
          sync: true
        })
      });
      const data = await res.json();
      setTelegramOrderResult(data);
      fetchClients();
    } catch (e: any) {
      setTelegramOrderResult({ success: false, error: e.message || 'خطأ في الاتصال' });
    } finally {
      setTelegramOrderSubmitting(false);
    }
  };

  const getTelegramOrderCodeSnippet = () => {
    if (tgCodeSnippetLang === 'js') {
      return `// 1. JavaScript / Fetch (لأي نموذج بموقع الشركة)
async function sendOrderToTelegramAndWhatsapp(name, phone, product, details) {
  try {
    const res = await fetch('${effectiveHost}/api/telegram/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,        // اسم العميل
        phone: phone,      // رقم العميل (مثال: 01012345678)
        product: product,  // اسم المنتج أو الخدمة
        details: details   // تفاصيل ورغبات العميل
      })
    });
    const result = await res.json();
    console.log('وصل الطلب للبوت والتليجرام وتم بدء الدردشة بالواتساب:', result);
  } catch (err) {
    console.error('خطأ في إرسال الطلب:', err);
  }
}`;
    } else if (tgCodeSnippetLang === 'php') {
      return `<?php
// 2. PHP (WordPress / WooCommerce / Laravel)
$url = '${effectiveHost}/api/telegram/order';
$orderData = array(
  'name' => 'أحمد محمود',
  'phone' => '01012345678',
  'product' => 'تصميم متجر وتطبيق هاتف',
  'details' => 'تفاصيل ورغبات العميل في موقع الشركة'
);

$options = array(
  'http' => array(
    'header'  => "Content-type: application/json\r\n",
    'method'  => 'POST',
    'content' => json_encode($orderData)
  )
);
$context  = stream_context_create($options);
$response = file_get_contents($url, false, $context);
echo $response;
?>`;
    } else {
      return `curl -X POST "${effectiveHost}/api/telegram/order" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "أحمد محمود",
    "phone": "01012345678",
    "product": "متجر إلكتروني وتطبيق هاتف",
    "details": "طلب تصميم وتطوير متجر إلكتروني لبيع الملابس مع نظام دفع وشحن"
  }'`;
    }
  };

  const clearMemory = async () => {
    if (!confirm('هل أنت متأكد من رغبتك في مسح كافة ذاكرة البوت والعملاء والمهام المجدولة؟ هذا إجراء لا رجعة فيه!')) return;
    try {
      const res = await fetch('/api/clear-memory', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMessages([]);
        setClients([]);
        alert(data.message);
      } else {
        alert('خطأ في مسح الذاكرة.');
      }
    } catch(e) {
      alert('حدث خطأ في الاتصال بالخادم.');
    }
  };

  const startWhatsapp = async () => {
    setWaLoading(true);
    try {
      const resp = await fetch('/api/whatsapp/start', { method: 'POST' });
      const data = await resp.json();
      if (data.message === 'Already starting/started') {
         setWaLoading(false);
         if (waConnected) {
           alert('الواتساب متصل ويعمل بالفعل وجلسته محفوظة دائماً.');
         }
      }
    } catch(e) {
      setWaLoading(false);
      alert('فشل الاتصال بالخادم، يرجى المحاولة مرة أخرى.');
    }
  };

  const restartWhatsapp = async () => {
    setWaLoading(true);
    try {
      await fetch('/api/whatsapp/restart', { method: 'POST' });
    } catch(e) {
      alert('فشل إعادة التشغيل.');
    } finally {
      setTimeout(() => setWaLoading(false), 2000);
    }
  };

  const logoutWhatsapp = async () => {
    if (!confirm('هل أنت متأكد من رغبتك في إلغاء ربط الحساب وتسجيل الخروج ومسح الجلسة لربط رقم آخر؟')) return;
    setWaLoading(true);
    try {
      await fetch('/api/whatsapp/logout', { method: 'POST' });
      setWaQr(null);
      setWaConnected(false);
      alert('تم إلغاء الربط ومسح الجلسة بنجاح.');
    } catch(e) {
      alert('خطأ أثناء تسجيل الخروج.');
    } finally {
      setWaLoading(false);
    }
  };

  const sendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isChatLoading) return;
    
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
      fetchClients();
      fetchServerInfo();
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'حدث خطأ في الاتصال.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const sendWebsiteTestLead = async () => {
    if (!testLeadForm.phone || !testLeadForm.name) {
      alert('يرجى كتابة اسم العميل ورقم الهاتف');
      return;
    }
    setTestLeadSubmitting(true);
    const startTime = performance.now();
    try {
      const res = await fetch('/api/texora/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testLeadForm)
      });
      const data = await res.json();
      const elapsedMs = Math.round(performance.now() - startTime);
      setLastLatencyMs(elapsedMs);

      if (data.success) {
        setLastServerLog({
          time: new Date().toLocaleTimeString('ar-EG'),
          status: 200,
          message: data.message || 'تم تخزين طلب الموقع في السيرفر بنجاح (clients_db.json)',
          clientPhone: data.clientPhone || testLeadForm.phone,
          source: 'طلب موقع Texora (API Webhook)',
          isWhatsappConnected: data.isWhatsappConnected,
          latency: elapsedMs
        });
        fetchClients();
        fetchServerInfo();
        alert(`✅ تم استلام الطلب وتخزينه في السيرفر بنجاح في غضون ${elapsedMs}ms!`);
        if (data.initialReply) {
          setMessages(prev => [
            ...prev,
            { role: 'user', text: `[طلب جديد وارد من موقع شركة Texora]\n👤 العميل: ${testLeadForm.name}\n📞 الهاتف: ${testLeadForm.phone}\n📝 الطلب: ${testLeadForm.request}` },
            { role: 'assistant', text: data.initialReply }
          ]);
        }
      } else {
        alert('خطأ: ' + data.error);
      }
    } catch(e) {
      alert('فشل في إرسال طلب الاختبار إلى السيرفر');
    } finally {
      setTestLeadSubmitting(false);
    }
  };

  const runWebhookPingTest = async (customTestName?: string) => {
    setPingSubmitting(true);
    const startTime = performance.now();
    try {
      const payload = {
        name: customTestName || 'مهندس فهد (فحص اتصال الموقع)',
        phone: '01099998888',
        request: 'طلب تصميم متجر إلكتروني وتطبيق تجريبي لفحص الاتصال والتخزين في السيرفر بدون الحاجة للواتساب',
        source: 'اختبار فحص اتصال الـ Webhook المباشر'
      };

      const res = await fetch('/api/texora/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      const elapsedMs = Math.round(performance.now() - startTime);

      setPingResult({
        status: res.status,
        latency: elapsedMs,
        response: data,
        time: new Date().toLocaleTimeString('ar-EG')
      });

      fetchClients();
      fetchServerInfo();
    } catch (e: any) {
      setPingResult({
        status: 500,
        latency: Math.round(performance.now() - startTime),
        response: { success: false, error: e.message || 'خطأ في الاتصال بالسيرفر' },
        time: new Date().toLocaleTimeString('ar-EG')
      });
    } finally {
      setPingSubmitting(false);
    }
  };

  const deleteClient = async (phone: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف بيانات العميل "${name}" من السيرفر؟`)) return;
    try {
      const res = await fetch(`/api/texora/clients/${phone}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setClients(prev => prev.filter(c => c.phone !== phone));
        fetchServerInfo();
      } else {
        alert(data.error || 'فشل حذف العميل');
      }
    } catch (e) {
      alert('خطأ في الاتصال بالسيرفر');
    }
  };

  const clearAllClients = async () => {
    if (!confirm('هل أنت متأكد من رغبتك في مسح كافة طلبات وعملاء الموقع من السيرفر؟ هذا الإجراء لا يمكن التراجع عنه.')) return;
    try {
      const res = await fetch('/api/texora/clients/clear', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setClients([]);
        fetchServerInfo();
        alert('تم مسح كافة طلبات العملاء من السيرفر بنجاح.');
      }
    } catch (e) {
      alert('خطأ في الاتصال بالسيرفر');
    }
  };

  const openClientChat = async (client: ClientLead) => {
    setSelectedClientForChat(client);
    setClientChatLoading(true);
    try {
      const res = await fetch(`/api/texora/client-chat/${client.phone}`);
      const data = await res.json();
      if (data && data.success) {
        setClientChatHistory(data.history || []);
      }
    } catch (e) {
      console.error("Failed to load client chat:", e);
    } finally {
      setClientChatLoading(false);
    }
  };

  const sendClientChatMessage = async () => {
    if (!clientChatInput.trim() || !selectedClientForChat || clientChatLoading) return;
    const msg = clientChatInput.trim();
    setClientChatInput('');
    setClientChatHistory(prev => [...prev, { role: 'user', content: msg }]);
    setClientChatLoading(true);
    try {
      const res = await fetch(`/api/texora/client-chat/${selectedClientForChat.phone}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
      const data = await res.json();
      if (data && data.success) {
        setClientChatHistory(data.history || [...clientChatHistory, { role: 'user', content: msg }, { role: 'assistant', content: data.reply }]);
      }
      fetchClients();
      fetchServerInfo();
    } catch (e) {
      console.error("Failed to send client chat message:", e);
    } finally {
      setClientChatLoading(false);
    }
  };

  const copyText = (text: string, type: 'url' | 'host' | 'code' = 'code') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else if (type === 'host') {
      setCopiedHost(true);
      setTimeout(() => setCopiedHost(false), 2000);
    } else {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  };

  const exportClientsCSV = () => {
    if (clients.length === 0) {
      alert('لا توجد بيانات عملاء للتصدير حالياً.');
      return;
    }
    const headers = ['اسم العميل', 'رقم الهاتف', 'تفاصيل ومواصفات المشروع', 'تاريخ ووقت الطلب', 'مصدر الطلب', 'حالة الطلب'];
    const rows = clients.map(c => [
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.phone || '').replace(/"/g, '""')}"`,
      `"${(c.request || '').replace(/"/g, '""')}"`,
      `"${(c.date ? new Date(c.date).toLocaleString('ar-EG') : 'غير محدد').replace(/"/g, '""')}"`,
      `"${(c.source || 'طلب موقع Texora').replace(/"/g, '""')}"`,
      `"${(c.status || 'تم الاستلام والتخزين').replace(/"/g, '""')}"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `texora_clients_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const sendWidgetSimulatorMessage = async (customText?: string) => {
    const text = (customText || widgetSimInput).trim();
    if (!text || widgetSimLoading) return;

    setWidgetSimInput('');
    setWidgetSimMessages(prev => [...prev, { role: 'user', text }]);
    setWidgetSimLoading(true);

    try {
      const res = await fetch('/api/texora/widget/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'sim_' + (widgetSimPhone || 'guest_demo'),
          message: text,
          phone: widgetSimPhone,
          name: 'زائر تجريبي للموقع'
        })
      });
      const data = await res.json();
      if (data.success && data.reply) {
        setWidgetSimMessages(prev => [...prev, { role: 'bot', text: data.reply }]);
      } else {
        setWidgetSimMessages(prev => [...prev, { role: 'bot', text: 'أهلاً بك! تم استلام رسالتك.' }]);
      }
      fetchClients();
      fetchServerInfo();
    } catch (e) {
      setWidgetSimMessages(prev => [...prev, { role: 'bot', text: 'حدث خطأ في الاتصال بالسيرفر.' }]);
    } finally {
      setWidgetSimLoading(false);
    }
  };

  const getWidgetScriptCode = () => {
    return `<!-- 1. كود ودجت الشات الذكي لشركة Texora (ضعه قبل </body> في أي صفحة بموقعك) -->
<script 
  src="${effectiveHost}/texora-widget.js" 
  data-server="${effectiveHost}" 
  data-title="${widgetTitle}" 
  data-color="${widgetColor}" 
  data-position="${widgetPosition}"
  data-greeting="${widgetGreeting.replace(/"/g, '&quot;')}"
  async>
</script>`;
  };

  const getWidgetReactCode = () => {
    return `// 2. React / Next.js Component (مكون جاهز للاستخدام)
import { useEffect } from 'react';

export function TexoraChatWidget() {
  useEffect(() => {
    const existing = document.querySelector('script[src*="texora-widget.js"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = '${effectiveHost}/texora-widget.js';
      script.setAttribute('data-server', '${effectiveHost}');
      script.setAttribute('data-title', '${widgetTitle}');
      script.setAttribute('data-color', '${widgetColor}');
      script.setAttribute('data-position', '${widgetPosition}');
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return null; // يقوم بحقن زر الشات والنافذة التفاعلية تلقائياً
}`;
  };

  const getWhatsAppDirectLink = () => {
    const cleanNumber = (waLinkPhone || config.adminNumber || '201012345678').replace(/\D/g, '');
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(waLinkMsg)}`;
  };

  const getWhatsAppFloatingButtonHTML = () => {
    const directLink = getWhatsAppDirectLink();
    return `<!-- زر واتساب عائم للموقع مع نص مجهز يربط الزائر بالبوت مباشرة -->
<a 
  href="${directLink}" 
  target="_blank" 
  rel="noopener noreferrer"
  class="texora-wa-btn"
  style="position:fixed;bottom:24px;left:24px;background:#25D366;color:#ffffff;border-radius:50px;padding:12px 22px;font-family:system-ui,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;display:inline-flex;align-items:center;gap:10px;box-shadow:0 10px 25px rgba(37,211,102,0.4);z-index:99999;transition:transform 0.2s;"
  onmouseover="this.style.transform='scale(1.06)'"
  onmouseout="this.style.transform='scale(1)'"
>
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.074-2.126-.516-1.83-1.026-3.003-2.909-3.094-3.031-.09-.123-.746-.991-.746-1.89 0-.9.472-1.342.64-1.524.168-.182.37-.228.494-.228.123 0 .247.001.355.006.113.006.264-.043.413.315.153.367.525 1.282.571 1.376.046.093.077.202.015.326-.061.123-.092.2-.183.308-.091.107-.191.24-.273.322-.092.091-.188.19-.081.373.107.182.476.786 1.022 1.272.704.627 1.298.822 1.482.914.184.091.292.076.4-.046.108-.123.463-.538.586-.723.123-.184.246-.153.413-.092.169.061 1.077.507 1.262.599.184.092.308.138.354.215.045.077.045.452-.099.857z"/>
  </svg>
  <span>تحدث مع فريق مبيعات Texora</span>
</a>`;
  };

  const getCodeSnippet = () => {
    if (codeSnippetLang === 'js') {
      return `// 1. JavaScript (Frontend / React / Next.js / Vue / Vanilla JS)
async function sendOrderToTexoraBot(clientName, clientPhone, projectDetails) {
  try {
    const response = await fetch('${webhookEndpoint}', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: clientName,        // اسم العميل
        phone: clientPhone,      // رقم هاتف العميل مع كود الدولة مثل: 201000000000
        request: projectDetails  // تفاصيل المشروع ومواصفات التصميم المطلوبة
      })
    });
    
    const result = await response.json();
    console.log('تم إرسال الطلب وحفظه في السيرفر بنجاح:', result);
    return result;
  } catch (error) {
    console.error('خطأ في إرسال الطلب:', error);
  }
}

// مثال للاستخدام:
// sendOrderToTexoraBot("أحمد علي", "201012345678", "طلب تصميم وبرمجة موقع وتطبيق متجر إلكتروني");`;
    } else if (codeSnippetLang === 'php') {
      return `<?php
// 2. PHP (WordPress / WooCommerce / Laravel / Custom PHP Backend)
$clientName = $_POST['name'] ?? 'محمد أحمد';
$clientPhone = $_POST['phone'] ?? '201000000000';
$projectDetails = $_POST['request'] ?? 'طلب تصميم وتطوير متجر إلكتروني لبيع العطور';

$url = '${webhookEndpoint}';

$data = array(
    'name' => $clientName,
    'phone' => $clientPhone,
    'request' => $projectDetails
);

$options = array(
    'http' => array(
        'header'  => "Content-type: application/json\r\n",
        'method'  => 'POST',
        'content' => json_encode($data),
        'timeout' => 5
    )
);

$context  = stream_context_create($options);
$result = file_get_contents($url, false, $context);
$response = json_decode($result, true);

if ($response && $response['success']) {
    echo "تم استلام الطلب وتخزينه في السيرفر وبدأ تواصل البوت الذكي عبر الواتساب فوراً!";
} else {
    echo "حدث خطأ في استقبال الطلب.";
}
?>`;
    } else if (codeSnippetLang === 'html') {
      return `<!-- 3. HTML Form بسيط يوضع في موقع Texora مباشرة -->
<form id="texoraOrderForm" class="texora-form">
  <input type="text" id="cName" placeholder="اسمك الكامل" required />
  <input type="tel" id="cPhone" placeholder="رقم الواتساب مع كود الدولة (مثال: 201000000000)" required />
  <textarea id="cDetails" placeholder="تفاصيل ومواصفات المشروع والتصميم المطلوب..." required></textarea>
  <button type="submit" id="cSubmitBtn">إرسال الطلب وبدء التصميم</button>
</form>

<script>
document.getElementById('texoraOrderForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('cSubmitBtn');
  btn.disabled = true;
  btn.innerText = 'جاري الإرسال والتخزين...';

  const payload = {
    name: document.getElementById('cName').value,
    phone: document.getElementById('cPhone').value,
    request: document.getElementById('cDetails').value
  };

  try {
    const res = await fetch('${webhookEndpoint}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ تم استلام طلبك وتخزينه بنجاح! سيتواصل معك المساعد الذكي لشركة Texora عبر الواتساب فوراً.');
      document.getElementById('texoraOrderForm').reset();
    } else {
      alert('خطأ: ' + (data.error || 'فشل إرسال الطلب'));
    }
  } catch (err) {
    alert('فشل الاتصال بسيرفر البوت، تأكد من تشغيل السيرفر.');
  } finally {
    btn.disabled = false;
    btn.innerText = 'إرسال الطلب وبدء التصميم';
  }
});
</script>`;
    } else if (codeSnippetLang === 'python') {
      return `# 4. Python (Django / Flask / FastAPI / Requests)
import requests

def send_order_to_texora(name: str, phone: str, details: str):
    url = "${webhookEndpoint}"
    payload = {
        "name": name,
        "phone": phone,
        "request": details
    }
    
    try:
        response = requests.post(url, json=payload, timeout=5)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error sending lead to Texora server: {e}")
        return None

# تجربة الإرسال
res = send_order_to_texora(
    name="م. فهد العتيبي", 
    phone="201000000000", 
    details="طلب برمجة تطبيق توصيل وتصميم واجهة مستخدم داكنة"
)
print("Server Response:", res)`;
    } else if (codeSnippetLang === 'curl') {
      return `# 5. cURL (Terminal / Postman / Cron / Shell Script)
curl -X POST "${webhookEndpoint}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "أحمد سامي",
    "phone": "201012345678",
    "request": "طلب تصميم وتطوير موقع شركة برمجيات مع لوحة تحكم ذكية"
  }'`;
    } else {
      return `// 6. Node.js / Express Backend (Server-to-Server Webhook)
const axios = require('axios'); // أو استخدام fetch في Node 18+

async function notifyTexoraBot(lead) {
  try {
    const res = await axios.post('${webhookEndpoint}', {
      name: lead.name,
      phone: lead.phone,
      request: lead.request
    }, { timeout: 5000 });

    console.log('Texora Server Lead Confirmed:', res.data);
    return res.data;
  } catch (error) {
    console.error('Failed to notify Texora Bot:', error.message);
  }
}

// تشغيل تجريبي
notifyTexoraBot({
  name: "سارة محمود",
  phone: "201000000000",
  request: "طلب برمجة تطبيق عيادات وحجوزات أطباء"
});`;
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-950 flex flex-col pt-6 border-l border-slate-800 shrink-0">
        {/* Brand Header */}
        <div className="px-6 mb-6 flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
            <Code2 className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
              Texora Software
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-400"></span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">مساعد شركة تيكسورا البرمجية</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 px-4 space-y-1.5">
          <button 
            id="nav-chat-btn"
            onClick={() => setActiveTab('chat')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'chat' ? 'bg-indigo-600/20 text-indigo-400 font-bold border border-indigo-500/30' : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'}`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-sm">المحادثة والتجربة</span>
          </button>
          
          <button 
            id="nav-clients-btn"
            onClick={() => { setActiveTab('clients'); fetchClients(); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === 'clients' ? 'bg-indigo-600/20 text-indigo-400 font-bold border border-indigo-500/30' : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'}`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5" />
              <span className="text-sm">طلبات الموقع والعملاء</span>
            </div>
            {clients.length > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-bold bg-indigo-500 text-white rounded-full">
                {clients.length}
              </span>
            )}
          </button>

          <button 
            id="nav-api-guide-btn"
            onClick={() => setActiveTab('api-guide')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'api-guide' ? 'bg-cyan-600/20 text-cyan-400 font-bold border border-cyan-500/30' : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'}`}
          >
            <Code2 className="w-5 h-5" />
            <span className="text-sm">دليل ربط الموقع (API)</span>
          </button>

          <button 
            id="nav-settings-btn"
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-indigo-600/20 text-indigo-400 font-bold border border-indigo-500/30' : 'hover:bg-slate-900 text-slate-400 hover:text-slate-200'}`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm">الربط والإعدادات</span>
          </button>
        </nav>
        
        {/* Connection Status Box */}
        <div className="p-5 border-t border-slate-800/80 bg-slate-950/60">
          <p className="text-[10px] font-bold text-slate-500 mb-3 uppercase tracking-wider">حالة الاتصال الفوري</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-300">واتساب Texora</span>
              </div>
              <div className="flex items-center gap-1.5">
                {waConnected ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    متصل
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                    مفصول
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-300">نقطة الربط Webhook</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                جاهزة
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 bg-slate-950/40">
          <div>
            <h2 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              {activeTab === 'chat' && 'محادثة المساعد الذكي لشركة Texora'}
              {activeTab === 'clients' && 'إدارة طلبات الموقع وتصاميم العملاء'}
              {activeTab === 'api-guide' && 'شرح وطريقة ربط موقع الشركة بالـ API ورابط الاستضافة'}
              {activeTab === 'settings' && 'إعدادات البوت وتوجيهات الذكاء الاصطناعي'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeTab === 'chat' && 'مناقشة المشاريع والتصاميم وإرسال التقارير للإدارة'}
              {activeTab === 'clients' && 'الطلبات المسجلة من الموقع والمحادثات المكتملة'}
              {activeTab === 'api-guide' && 'كيف يرسل موقعك رقم العميل وتفاصيل طلبه للبوت مباشرة'}
              {activeTab === 'settings' && 'توجيهات الذكاء الاصطناعي وربط الواتساب'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800/60 text-[11px] font-bold rounded-full flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Llama-3.3 70B
            </span>
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <div className="flex-1 overflow-y-auto relative">
          
          {/* TAB 1: LIVE CHAT */}
          {activeTab === 'chat' && (
            <div className="h-full flex flex-col justify-between">
              {/* WhatsApp & Order Status Banner */}
              <div className="px-6 py-2.5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${waConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`}></span>
                  <span className="text-slate-300 font-medium">
                    حالة الواتساب: {waConnected ? <strong className="text-emerald-400">متصل وجاهز للإرسال الفعلي</strong> : <strong className="text-amber-400">بانتظار مسح رمز QR من الإعدادات</strong>}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('clients')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg border border-slate-700 text-[11px] font-bold flex items-center gap-1 transition"
                  >
                    <Users className="w-3 h-3" />
                    طلبات الموقع المسجلة بالسيرفر ({clients.length})
                  </button>
                  {!waConnected && (
                    <button
                      onClick={() => setActiveTab('settings')}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                    >
                      <ScanLine className="w-3 h-3" />
                      ربط الواتساب بكود QR
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Scenarios Bar */}
              <div className="px-6 py-2.5 bg-slate-950/70 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
                <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">تجربة سيناريوهات العميل:</span>
                <button
                  id="btn-quick-order"
                  onClick={() => sendMessage('مرحباً، طلبت من موقع تيكسورا تصميم وبرمجة موقع وتطبيق متجر لبيع الملابس، اسمي أحمد سامي ورقمي 01012345678')}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-full border border-slate-700 transition whitespace-nowrap"
                >
                  🛒 طلب متجر وملابس (أحمد سامي)
                </button>
                <button
                  id="btn-quick-design"
                  onClick={() => sendMessage('نريد ألوان داكنة Dark Mode مع درجات الأزرق السماوي وتصميم بسيط Minimalist')}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-full border border-slate-700 transition whitespace-nowrap"
                >
                  🎨 مناقشة التصميم والألوان
                </button>
                <button
                  id="btn-quick-finish"
                  onClick={() => sendMessage('تمام اتفقنا على التصميم والميزات كاملة، احفظ الطلب وأرسل التقرير للإدارة')}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-full border border-slate-700 transition whitespace-nowrap"
                >
                  ✅ تأكيد الطلب والإنهاء
                </button>
              </div>

              {/* Chat Flow */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-3.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold shadow-sm ${
                      m.role === 'user' 
                        ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white' 
                        : 'bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 text-indigo-400'
                    }`}>
                      {m.role === 'user' ? 'أنت' : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`p-4 max-w-[85%] text-sm rounded-2xl ${
                      m.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-md' 
                        : 'bg-slate-800/90 text-slate-100 rounded-tl-none border border-slate-700/80 shadow-sm'
                    }`}>
                      <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex gap-3.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex-shrink-0 flex items-center justify-center text-indigo-400">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="p-4 bg-slate-800 rounded-2xl rounded-tl-none border border-slate-700 flex items-center gap-2">
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></span>
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-slate-950 border-t border-slate-800">
                <form 
                  onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                  className="flex items-center bg-slate-900 border border-slate-800 focus-within:border-indigo-500/80 rounded-xl px-4 py-2 transition"
                >
                  <input
                    id="chat-input-field"
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="اكتب رسالة أو استفسار للمساعد الذكي..."
                    className="bg-transparent flex-1 text-sm outline-none w-full text-slate-100 h-10 placeholder:text-slate-500"
                    disabled={isChatLoading}
                  />
                  <button
                    id="chat-send-btn"
                    disabled={isChatLoading || !inputText.trim()}
                    className="text-indigo-400 hover:text-indigo-300 disabled:opacity-30 transition p-2"
                  >
                    <Send className="w-5 h-5 rtl:rotate-180" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: CLIENTS & LEADS */}
          {activeTab === 'clients' && (
            <div className="max-w-5xl mx-auto p-8 space-y-8">
              {/* Server Storage Verification Banner */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/50 border border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">تخزين طلبات الموقع والعملاء الدائم (Server Persistence)</h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          مفعل ويعمل بالسيرفر
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        يتم حفظ أي طلب يصل من موقع شركة Texora أو البوت فوراً في ملف <code className="text-cyan-300 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">clients_db.json</code> في السيرفر لضمان عدم ضياع أي بيانات.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-indigo-400" />
                      إجمالي الطلبات المحفوظة: <strong className="text-white">{clients.length}</strong>
                    </span>
                  </div>
                </div>

                {/* Last Server Activity Alert */}
                {lastServerLog && (
                  <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-emerald-900/30">
                    <div className="flex items-center gap-2 text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{lastServerLog.message}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                      <span>الرقم: <strong className="text-slate-200" dir="ltr">+{lastServerLog.clientPhone}</strong></span>
                      <span>الوقت: <strong className="text-slate-200">{lastServerLog.time}</strong></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Test Lead Submission Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-base font-bold text-white">محاكاة استقبال طلب جديد من موقع Texora</h3>
                  </div>
                  <span className="text-xs text-indigo-400 bg-indigo-950/60 border border-indigo-800/50 px-3 py-1 rounded-full">
                    تجربة فورية وتخزين بالسيرفر
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                  عند قيام العميل بتعبئة نموذج الطلب في موقع شركتك (الاسم، الرقم، وتفاصيل مشروعه)، سيقوم هذا الزر بإرسال الطلب للسيرفر لتخزينه في <code className="text-cyan-300 font-mono">clients_db.json</code> ثم يبدأ البوت التواصل ومناقشة متطلبات وتصميم المشروع عبر الواتساب فوراً.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم العميل</label>
                    <input 
                      id="input-lead-name"
                      type="text"
                      value={testLeadForm.name}
                      onChange={e => setTestLeadForm({ ...testLeadForm, name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                      placeholder="مثال: م. فهد العتيبي"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">رقم هاتف العميل (واتساب)</label>
                    <input 
                      id="input-lead-phone"
                      type="text"
                      value={testLeadForm.phone}
                      onChange={e => setTestLeadForm({ ...testLeadForm, phone: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                      dir="ltr"
                      placeholder="201000000000 أو 0500000000"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">تفاصيل طلب المشروع من الموقع</label>
                    <textarea 
                      id="input-lead-request"
                      value={testLeadForm.request}
                      onChange={e => setTestLeadForm({ ...testLeadForm, request: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500 outline-none h-20 resize-none"
                      placeholder="أريد تصميم موقع وتطبيق..."
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    id="btn-submit-test-lead"
                    onClick={sendWebsiteTestLead}
                    disabled={testLeadSubmitting}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 px-6 rounded-xl transition flex items-center gap-2"
                  >
                    {testLeadSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        جاري الحفظ في السيرفر وبدء المعالجة...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        إرسال الطلب للسيرفر وتخزينه
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Clients & Leads List */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-cyan-400" />
                      قائمة العملاء والطلبات المحفوظة بالسيرفر ({clients.length})
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">العملاء الذين تم استلام طلباتهم من موقع Texora أو عبر المحادثات المباشرة</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {clients.length > 0 && (
                      <>
                        <button 
                          id="btn-export-csv"
                          onClick={exportClientsCSV} 
                          className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg border border-indigo-500/40 text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          تصدير كـ CSV
                        </button>
                        <button 
                          id="btn-clear-clients"
                          onClick={clearAllClients} 
                          className="px-3 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-300 rounded-lg border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          مسح الكل
                        </button>
                      </>
                    )}
                    <button 
                      id="btn-refresh-clients"
                      onClick={fetchClients} 
                      className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 text-xs flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${clientsLoading ? 'animate-spin' : ''}`} />
                      تحديث
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                {clients.length > 0 && (
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                      <input 
                        id="input-search-clients"
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="ابحث عن عميل بالاسم، الرقم، أو تفاصيل المشروع..."
                        className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                )}

                {clients.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    <Users className="w-12 h-12 mb-3 text-slate-600" />
                    <p className="text-sm font-semibold">لا توجد طلبات محفوظة في السيرفر حتى الآن</p>
                    <p className="text-xs text-slate-600 mt-1">قم بإرسال طلب تجريبي أعلاه أو إرسال طلب من موقعك ليتم حفظه بالسيرفر تلقائياً</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {clients
                      .filter(c => {
                        if (!searchQuery.trim()) return true;
                        const q = searchQuery.toLowerCase();
                        return (
                          (c.name || '').toLowerCase().includes(q) ||
                          (c.phone || '').includes(q) ||
                          (c.request || '').toLowerCase().includes(q)
                        );
                      })
                      .map((c, idx) => (
                        <div key={c.id || idx} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <h4 className="font-bold text-white text-sm">{c.name || 'عميل'}</h4>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  {c.date ? new Date(c.date).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : 'غير محدد'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-mono bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-900" dir="ltr">
                                  +{c.phone}
                                </span>
                                <button
                                  onClick={() => deleteClient(c.phone, c.name)}
                                  title="حذف من السيرفر"
                                  className="text-slate-500 hover:text-rose-400 p-1 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 mb-3">
                              <p className="text-xs text-slate-300 leading-relaxed">{c.request || 'طلب تصميم وتطوير برمجي'}</p>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                            <button
                              onClick={() => openClientChat(c)}
                              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg border border-indigo-500/40 text-xs font-bold flex items-center gap-1.5 transition"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              عرض محادثة العميل والرد الذكي
                            </button>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                {c.source || 'موقع Texora'}
                              </span>
                              <a
                                href={`https://wa.me/${c.phone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 text-[10px] font-bold"
                              >
                                واتساب
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Client Conversation Modal */}
              {selectedClientForChat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                    {/* Modal Header */}
                    <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm flex items-center gap-2">
                            محادثة العميل: {selectedClientForChat.name || 'عميل'}
                            <span className="text-xs font-mono text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800" dir="ltr">
                              +{selectedClientForChat.phone}
                            </span>
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            سجل ذاكرة البوت الذكي والرسائل المتبادلة
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedClientForChat(null)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Client Request Context Card */}
                    <div className="p-3 bg-slate-950/60 border-b border-slate-800 text-xs">
                      <div className="text-slate-400 font-medium mb-1">تفاصيل طلب المشروع المسجل من الموقع:</div>
                      <div className="p-2.5 bg-slate-900 rounded-lg text-slate-200 border border-slate-800/80 leading-relaxed">
                        {selectedClientForChat.request || 'طلب خدمة برمجية'}
                      </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/50">
                      {clientChatLoading && clientChatHistory.length === 0 ? (
                        <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                          <span className="text-xs">جاري تحميل سجل المحادثة...</span>
                        </div>
                      ) : clientChatHistory.length === 0 ? (
                        <div className="py-8 text-center text-slate-500 text-xs">
                          لا توجد رسائل سابقة مسجلة لهذا العميل حتى الآن. يمكنك بدء المحادثة أدناه.
                        </div>
                      ) : (
                        clientChatHistory.map((m: any, idx: number) => {
                          const isUser = m.role === 'user' || m.role === 'client';
                          const isSystem = m.role === 'system';
                          const content = m.content || m.text || '';
                          if (isSystem) {
                            return (
                              <div key={idx} className="p-2 bg-indigo-950/40 border border-indigo-900/50 rounded-lg text-[11px] text-indigo-300">
                                <strong>[سياق النظام]:</strong> {content}
                              </div>
                            );
                          }
                          return (
                            <div key={idx} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                              <div
                                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                                  isUser
                                    ? 'bg-slate-800 text-slate-100 rounded-br-none border border-slate-700'
                                    : 'bg-indigo-600 text-white rounded-bl-none shadow-sm'
                                }`}
                              >
                                <div className="text-[10px] opacity-70 mb-1 font-bold">
                                  {isUser ? `👤 العميل (${selectedClientForChat.name})` : '🤖 بوت تيكسورا الذكي'}
                                </div>
                                <p className="whitespace-pre-wrap">{content}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                      {clientChatLoading && clientChatHistory.length > 0 && (
                        <div className="flex justify-end">
                          <div className="bg-indigo-600/50 text-indigo-200 rounded-2xl rounded-bl-none p-2.5 text-xs flex items-center gap-2">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>جاري معالجة وتوليد الرد...</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Chat Input Bar */}
                    <div className="p-3 bg-slate-950 border-t border-slate-800">
                      <form
                        onSubmit={e => {
                          e.preventDefault();
                          sendClientChatMessage();
                        }}
                        className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 focus-within:border-indigo-500"
                      >
                        <input
                          type="text"
                          value={clientChatInput}
                          onChange={e => setClientChatInput(e.target.value)}
                          placeholder="اكتب رسالة للتحدث باسم البوت أو العميل..."
                          className="flex-1 bg-transparent text-xs text-white outline-none py-1.5 placeholder:text-slate-500"
                          disabled={clientChatLoading}
                        />
                        <button
                          type="submit"
                          disabled={clientChatLoading || !clientChatInput.trim()}
                          className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          <Send className="w-3.5 h-3.5 rtl:rotate-180" />
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: THE TWO OFFICIAL INTEGRATION METHODS (WHATSAPP & TELEGRAM) */}
          {activeTab === 'api-guide' && (
            <div className="max-w-6xl mx-auto p-6 space-y-6">
              {/* Header Card */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  <div>
                    <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                      <Share2 className="w-5 h-5 text-indigo-400" />
                      طريقتي الربط المعتمدتان بمساعد Texora الذكي
                    </h3>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      1️⃣ <strong>ربط التلجرام والموقع (Telegram Bot & Auto WhatsApp Bridge):</strong> يقوم موقع الشركة بإرسال رسالة للبوت على التليجرام برقم العميل واسمه والمنتج، فيراها البوت ويبدأ الدردشة تلقائياً مع العميل على الواتساب!<br />
                      2️⃣ <strong>ربط الواتساب (WhatsApp Link):</strong> ربط رقم الواتساب عبر مسح كود QR لتأدية المحادثات وتواصل المساعد الذكي مع العملاء.
                    </p>
                  </div>

                  {/* Method Navigation Switcher */}
                  <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 shrink-0">
                    <button
                      onClick={() => setSelectedIntegrationMethod('telegram')}
                      className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                        selectedIntegrationMethod === 'telegram'
                          ? 'bg-sky-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Share2 className="w-4 h-4" />
                      <span>1. ربط التلجرام والموقع</span>
                    </button>
                    <button
                      onClick={() => setSelectedIntegrationMethod('whatsapp')}
                      className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                        selectedIntegrationMethod === 'whatsapp'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>2. ربط الواتساب (QR Code)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* METHOD 1: TELEGRAM BOT & WEBSITE BRIDGE */}
              {selectedIntegrationMethod === 'telegram' && (
                <div className="space-y-6">
                  {/* Step 1: Telegram Bot Token Config */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 font-bold">
                          <Share2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-base">إعدادات وتفعيل بوت التليجرام (Telegram Bot Token)</h4>
                          <p className="text-xs text-slate-400">أدخل توكن البوت الذي تم إنشاؤه من BotFather لتفعيله فوراً بالسيرفر</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${config.hasTelegram ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-amber-950 text-amber-300 border-amber-800'}`}>
                        {config.hasTelegram ? 'مفعل ويعمل حالياً 🟢' : 'غير مفعل حالياً ⚠️'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-8">
                        <label className="block text-xs font-bold text-slate-300 mb-1">كود توكن بوت التليجرام (Bot Token):</label>
                        <input
                          type="text"
                          value={telegramTokenInput}
                          onChange={e => setTelegramTokenInput(e.target.value)}
                          placeholder="مثال: 123456789:ABCdefGhIJKlmNoPQRstuVWXyz..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-sky-300 outline-none focus:border-sky-500"
                          dir="ltr"
                        />
                      </div>
                      <div className="md:col-span-4 flex items-end">
                        <button
                          onClick={saveTelegramConfig}
                          disabled={telegramSaving}
                          className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {telegramSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          <span>حفظ وتفعيل بوت التليجرام</span>
                        </button>
                      </div>
                    </div>

                    {telegramSaveMessage && (
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs font-medium text-slate-200">
                        {telegramSaveMessage}
                      </div>
                    )}

                    {/* Permanent Telegram Bot Direct Link Box */}
                    <div className="p-4 bg-sky-950/40 border border-sky-800/60 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                          <ExternalLink className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>رابط بوت التليجرام الأساسي والمعتمد:</span>
                            <span className="font-mono text-sky-300 text-xs bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              @{telegramUsername}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            يمكنك مراسلة البوت مباشرة عبر هذا الرابط أو ربطه بموقعك لإرسال الطلبات فوراً
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`https://t.me/${telegramUsername}`);
                            setCopiedTelegramLink(true);
                            setTimeout(() => setCopiedTelegramLink(false), 2000);
                          }}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                        >
                          {copiedTelegramLink ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedTelegramLink ? 'تم النسخ' : 'نسخ الرابط'}</span>
                        </button>

                        <a
                          href={`https://t.me/${telegramUsername}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-sky-600/20"
                        >
                          <Send className="w-3.5 h-3.5 rtl:rotate-180" />
                          <span>فتح البوت في التليجرام</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Live Test Form for Telegram Website Order */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="pb-3 border-b border-slate-800">
                      <h4 className="font-bold text-white text-base flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-400" />
                        تجربة حية: إرسال طلب من موقع الشركة إلى التليجرام والواتساب
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        جرب إرسال بيانات طلب عميل (اسم، هاتف، منتج، تفاصيل) لمعاينة وصولها إلى التليجرام وبدء محادثة الواتساب التلقائية فوراً!
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">اسم العميل:</label>
                        <input
                          type="text"
                          value={telegramOrderForm.name}
                          onChange={e => setTelegramOrderForm({ ...telegramOrderForm, name: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">رقم هاتف العميل (واتساب):</label>
                        <input
                          type="text"
                          value={telegramOrderForm.phone}
                          onChange={e => setTelegramOrderForm({ ...telegramOrderForm, phone: e.target.value })}
                          placeholder="مثال: 01012345678"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 outline-none focus:border-sky-500"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">المنتج / الخدمة المطلوب:</label>
                        <input
                          type="text"
                          value={telegramOrderForm.product}
                          onChange={e => setTelegramOrderForm({ ...telegramOrderForm, product: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">تفاصيل المنتج / الخدمة:</label>
                        <input
                          type="text"
                          value={telegramOrderForm.details}
                          onChange={e => setTelegramOrderForm({ ...telegramOrderForm, details: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    <button
                      onClick={sendTelegramOrderTest}
                      disabled={telegramOrderSubmitting}
                      className="w-full py-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {telegramOrderSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 rtl:rotate-180" />}
                      <span>إرسال الطلب فوراً للتليجرام والواتساب 🚀</span>
                    </button>

                    {telegramOrderResult && (
                      <div className="p-4 bg-slate-900 rounded-xl border border-sky-500/40 space-y-2 text-xs">
                        <div className="font-bold text-sky-300 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          نتيجة إرسال الطلب للبوت والسيرفر:
                        </div>
                        <pre className="p-3 bg-slate-950 rounded-lg text-slate-200 font-mono text-[11px] overflow-x-auto" dir="ltr">
                          {JSON.stringify(telegramOrderResult, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Step 3: Integration Code Snippets for Web Developer */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <h4 className="font-bold text-white text-base">كود ربط موقع الشركة ببوت التليجرام والواتساب</h4>
                        <p className="text-xs text-slate-400">يمكن لمبرمج موقع الشركة إرسال الطلبات مباشرة عبر هذا Endpoint</p>
                      </div>

                      <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                        <button
                          onClick={() => setTgCodeSnippetLang('js')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition ${tgCodeSnippetLang === 'js' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          JavaScript / Fetch
                        </button>
                        <button
                          onClick={() => setTgCodeSnippetLang('php')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition ${tgCodeSnippetLang === 'php' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          PHP (WordPress)
                        </button>
                        <button
                          onClick={() => setTgCodeSnippetLang('curl')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition ${tgCodeSnippetLang === 'curl' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          cURL
                        </button>
                      </div>
                    </div>

                    <div className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                          <code className="text-cyan-300 font-mono" dir="ltr">POST {effectiveHost}/api/telegram/order</code>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(getTelegramOrderCodeSnippet());
                            alert('تم نسخ الكود بنجاح!');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition text-[11px] font-bold"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ الكود</span>
                        </button>
                      </div>
                      <pre className="p-4 font-mono text-xs text-slate-200 leading-relaxed overflow-x-auto max-h-96 select-all" dir="ltr">
                        {getTelegramOrderCodeSnippet()}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* METHOD 2: WHATSAPP QR CODE LINK */}
              {selectedIntegrationMethod === 'whatsapp' && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base">حالة اتصال حساب الواتساب بالسيرفر</h4>
                        <p className="text-xs text-slate-400">افتح تطبيق الواتساب بهاتفك وقم بمسح كود QR للاتصال</p>
                      </div>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${waConnected ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-rose-950 text-rose-300 border-rose-800'}`}>
                      {waConnected ? 'متصل بنجاح 🟢' : 'غير متصل (بانتظار مسح الـ QR) 🔴'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    {/* QR Code Display */}
                    <div className="flex flex-col items-center justify-center p-6 bg-slate-900 border border-slate-800 rounded-2xl min-h-[260px]">
                      {waConnected ? (
                        <div className="text-center space-y-3 py-6">
                          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
                          <h5 className="font-bold text-white text-base">جلسة الواتساب متصلة وجاهزة!</h5>
                          <p className="text-xs text-slate-400 max-w-xs mx-auto">
                            البوت متصل برقمك، وسيستجيب آلياً لكافة طلبات العملاء الواردة من موقع الشركة والتليجرام.
                          </p>
                          <button
                            onClick={logoutWhatsapp}
                            className="mt-2 px-4 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl text-xs font-bold transition"
                          >
                            تسجيل الخروج ومسح الجلسة
                          </button>
                        </div>
                      ) : waQr ? (
                        <div className="text-center space-y-3">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[11px] font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>كود متجدد تلقائياً (تجديد خلال {qrExpiresIn} ثانية)</span>
                          </div>
                          <div className="p-3 bg-white rounded-xl inline-block shadow-xl">
                            <img src={waQr} alt="WhatsApp QR Code" className="w-48 h-48 object-contain" />
                          </div>
                          <div className="flex items-center justify-center gap-2 pt-1">
                            <button
                              onClick={refreshQrCode}
                              disabled={isRefreshingQr}
                              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded-xl transition shadow flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingQr ? 'animate-spin' : ''}`} />
                              تجديد الرمز فوراً
                            </button>
                            <a
                              href="/qr"
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-1.5 px-3 rounded-xl border border-slate-700 transition"
                            >
                              صفحة الربط السريعة ↗
                            </a>
                          </div>
                          <p className="text-xs text-amber-300 font-bold animate-pulse">
                            امسح الكود الآن باستخدام تطبيق الواتساب بهاتفك!
                          </p>
                        </div>
                      ) : (
                        <div className="text-center space-y-3 py-8 text-slate-400">
                          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400" />
                          <p className="text-xs">جاري تجهيز وتوليد كود QR للاتصال...</p>
                        </div>
                      )}
                    </div>

                    {/* Instructions */}
                    <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                      <h5 className="font-bold text-white text-sm">خطوات ربط الواتساب بالسيرفر:</h5>
                      <ol className="space-y-2.5 list-decimal list-inside text-slate-300">
                        <li>افتح تطبيق <strong>الواتساب (WhatsApp)</strong> على هاتفك المحمول.</li>
                        <li>انتقل إلى <strong>الإعدادات (Settings)</strong> ثم اختر <strong>الأجهزة المرتبطة (Linked Devices)</strong>.</li>
                        <li>اضغط على <strong>ربط جهاز (Link a Device)</strong> ووجه الكاميرا نحو كود QR المقابل.</li>
                        <li>بمجرد المسح، سيتم حفظ الجلسة بالسيرفر ويبدأ البوت للدردشة التلقائية فوراً!</li>
                      </ol>

                      <div className="pt-3 border-t border-slate-800 flex items-center gap-3">
                        <button
                          onClick={restartWhatsapp}
                          disabled={waLoading}
                          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl font-bold transition flex items-center gap-2"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${waLoading ? 'animate-spin' : ''}`} />
                          <span>إعادة تحديث محرك الواتساب</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SETTINGS & WHATSAPP */}
          {activeTab === 'settings' && (
            <div className="max-w-5xl mx-auto p-8 space-y-8">
              {/* Bot System Prompt & Admin Phone */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-bold text-white">إعدادات نظام شركة Texora</h3>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      رقم هاتف إدارة شركة Texora (Admin WhatsApp)
                    </label>
                    <p className="text-xs text-slate-400 mb-2">الرقم الذي سيستلم تقارير تفاصيل طلبات وتصاميم العملاء فور انتهائها</p>
                    <input 
                      id="input-admin-phone"
                      type="text"
                      value={config.adminNumber}
                      onChange={e => setConfig({ ...config, adminNumber: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl text-sm px-4 py-3 text-slate-100 focus:border-indigo-500 outline-none"
                      placeholder="مثال: 201153081709 أو 966500000000"
                      dir="ltr"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      تعليمات وهوية المساعد الذكي (System Prompt)
                    </label>
                    <p className="text-xs text-slate-400 mb-2">تعليمات النقاش مع العميل في التصاميم وإنهاء الطلب</p>
                    <textarea 
                      id="input-bot-prompt"
                      value={config.globalInstructions}
                      onChange={e => setConfig({ ...config, globalInstructions: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl text-xs px-4 py-3 text-slate-100 focus:border-indigo-500 outline-none h-44 resize-none leading-relaxed"
                    />
                  </div>
                  
                  <div>
                    <button 
                      id="btn-save-settings"
                      onClick={saveConfig} 
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl transition font-bold text-xs"
                    >
                      حفظ الإعدادات
                    </button>
                  </div>
                </div>
              </div>

              {/* Voice AI Intelligence Section (Lulwa Voice & Whisper V3 Turbo) */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-fuchsia-400" />
                    <div>
                      <h3 className="text-base font-bold text-white">نظام التفاعل الصوتي الذكي (Voice Agent Engine)</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        فهم الرسائل الصوتية وتفريغها تلقائياً عبر Whisper Large V3 Turbo والرد بصوت "لولوة" (Orpheus Arabic Saudi).
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-fuchsia-300 bg-fuchsia-950/80 border border-fuchsia-800 px-3 py-1 rounded-full flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse"></span>
                    نشط ومدعوم بالكامل 🎙️
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-fuchsia-400 font-bold text-xs">
                      <span>🎧 محرك التحدث (TTS):</span>
                    </div>
                    <p className="text-xs text-slate-300 font-mono">canopylabs/orpheus-arabic-saudi</p>
                    <p className="text-[11px] text-slate-400">
                      الصوت المعتمد: <span className="text-fuchsia-300 font-bold">Lulwa (صوت نسائي سعودي راقٍ)</span> بصيغة Opus و WAV لرسائل الواتساب والتيليجرام وودجت الموقع.
                    </p>
                    <button
                      onClick={playLulwaVoice}
                      disabled={playingVoice}
                      className="mt-3 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 shadow"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{playingVoice ? 'جاري تشغيل الصوت...' : '🔊 تجربة استماع صوت لولوة'}</span>
                    </button>
                  </div>

                  <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                      <span>🎙️ محرك السمع والتفريغ (STT):</span>
                    </div>
                    <p className="text-xs text-slate-300 font-mono">whisper-large-v3-turbo</p>
                    <p className="text-[11px] text-slate-400">
                      يتعرف فورياً وبدقة تامة على كافة اللهجات العربية (المصرية، الخليجية، الشامية، الفصحى) في رسائل الواتساب وتيليجرام وودجت الموقع.
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-800/60">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>تحويل تلقائي للفويسات 24/7</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Telegram Group Chat ID Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <Users className="w-5 h-5 text-sky-400" />
                    <div>
                      <h3 className="text-base font-bold text-white">معرف مجموعة التليجرام الإدارية (Telegram Group Chat ID)</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        خانة معرف المجموعة الإدارية المربوطة بالبوت. عند إرسال أي رسالة في المجموعة ورد البوت عليها، يتم حفظ المعرف هنا تلقائياً.
                      </p>
                    </div>
                  </div>
                  {config.telegramGroupChatId ? (
                    <span className="text-xs font-bold text-sky-300 bg-sky-950/80 border border-sky-800 px-3 py-1 rounded-full flex items-center gap-1.5 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
                      محفوظ ومربوط تلقائياً 🟢
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-300 bg-amber-950/80 border border-amber-800 px-3 py-1 rounded-full flex items-center gap-1.5 shrink-0">
                      بانتظار أول رسالة من المجموعة ⚠️
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-8">
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        معرف الشات الخاص بالمجموعة (Group Chat ID):
                      </label>
                      <input 
                        id="input-telegram-group-id"
                        type="text"
                        value={telegramGroupChatIdInput || config.telegramGroupChatId || ''}
                        onChange={e => setTelegramGroupChatIdInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono px-4 py-3 text-sky-300 focus:border-sky-500 outline-none"
                        placeholder="مثال: -1002345678901 (يتم الحفظ والتحديث آلياً فور رد البوت)"
                        dir="ltr"
                      />
                    </div>
                    <div className="md:col-span-4">
                      <button
                        id="btn-save-group-id"
                        onClick={saveConfig}
                        className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>حفظ معرف المجموعة</span>
                      </button>
                    </div>
                  </div>

                  {config.lastGroupTitle && (
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center justify-between flex-wrap gap-2">
                      <span className="text-slate-400">اسم آخر مجموعة تفاعل معها البوت وحفظ معرفها:</span>
                      <span className="font-bold text-sky-300 bg-sky-950 px-3 py-1 rounded-lg border border-sky-800/80">
                        👥 {config.lastGroupTitle}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* WhatsApp Connection */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-base font-bold text-white">ربط واتساب شركة Texora الدائم</h3>
                  </div>
                  {waConnected && (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-3 py-1 rounded-full flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      متصل دائم ومحفوظ
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  {waConnected ? (
                    <div className="bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 p-6 rounded-xl flex items-center justify-center flex-col gap-3 text-center">
                      <div className="w-12 h-12 bg-emerald-900/60 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">الواتساب متصل ويعمل بشكل دائم ومحفوظ على السيرفر</p>
                        <p className="text-xs opacity-85 mt-1 text-emerald-200">
                          جلسة الحساب محفوظة على السيرفر، ولن ينقطع الربط عند تحديث الصفحة أو إغلاق المتصفح.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <button 
                          id="btn-restart-whatsapp"
                          onClick={restartWhatsapp}
                          disabled={waLoading}
                          className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 py-2 px-4 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${waLoading ? 'animate-spin' : ''}`} />
                          تحديث الاتصال
                        </button>
                        <button 
                          id="btn-logout-whatsapp"
                          onClick={logoutWhatsapp}
                          disabled={waLoading}
                          className="bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 py-2 px-4 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          إلغاء الربط وتسجيل الخروج
                        </button>
                      </div>
                    </div>
                  ) : waQr ? (
                    <div className="flex flex-col items-center justify-center bg-slate-900 border-2 border-dashed border-slate-800 rounded-2xl p-6">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[11px] font-bold mb-3">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>كود لحظي متجدد تلقائياً (تجديد خلال {qrExpiresIn} ثانية)</span>
                      </div>
                      <div className="bg-white p-3 rounded-2xl mb-4 shadow-xl">
                        <img src={waQr} alt="WhatsApp QR Code" className="w-52 h-52" />
                      </div>
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <button
                          onClick={refreshQrCode}
                          disabled={isRefreshingQr}
                          className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded-xl transition shadow flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingQr ? 'animate-spin' : ''}`} />
                          تجديد الرمز فوراً
                        </button>
                        <a
                          href="/qr"
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-1.5 px-3 rounded-xl border border-slate-700 transition"
                        >
                          صفحة الربط السريعة ↗
                        </a>
                      </div>
                      <p className="text-xs font-bold text-slate-200">امسح رمز QR عبر تطبيق واتساب لربط الحساب وحفظ الجلسة دائماً</p>
                      <p className="text-[11px] text-slate-400 mt-1">بمجرد المسح لمرة واحدة، سيظل البوت متصلاً دائماً حتى بعد تحديث الصفحة</p>
                      <button onClick={logoutWhatsapp} className="mt-3 text-xs font-bold text-rose-400 hover:text-rose-300">
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 bg-slate-900 border-2 border-dashed border-slate-800 rounded-2xl p-6">
                      <button 
                        id="btn-start-whatsapp"
                        onClick={startWhatsapp}
                        disabled={waLoading}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white py-3 px-6 rounded-xl transition flex justify-center items-center gap-2 font-bold text-xs shadow-md"
                      >
                        {waLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            جاري تهيئة المتصفح وحفظ الجلسة الدائمة...
                          </>
                        ) : (
                          <>
                            <ScanLine className="w-4 h-4" />
                            توليد كود QR لربط الواتساب دائماً
                          </>
                        )}
                      </button>
                      <a 
                        href="/qr" 
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white py-3 px-6 rounded-xl transition flex justify-center items-center gap-2 font-bold text-xs shadow-md"
                      >
                        <ScanLine className="w-4 h-4" />
                        📱 فتح صفحة الربط اللحظي المباشرة (/qr)
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-rose-950/30 border border-rose-900/40 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-rose-400 mb-1 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    مسح ذاكرة البوت وسجل العملاء
                  </h3>
                  <p className="text-xs text-rose-400/80">سيتم مسح سجل المحادثات وقائمة العملاء المحفوظين والمهام المجدولة نهائياً.</p>
                </div>
                <button 
                  id="btn-clear-memory"
                  onClick={clearMemory}
                  className="bg-rose-600 hover:bg-rose-500 text-white py-2.5 px-5 rounded-xl font-bold text-xs whitespace-nowrap shadow-md"
                >
                  مسح كافة البيانات
                </button>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}
