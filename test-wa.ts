import whatsapp from 'whatsapp-web.js';
const { Client, LocalAuth } = whatsapp;

console.log("Starting client...");
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "test-client" }),
    puppeteer: { 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    }
});

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr.substring(0,20));
    process.exit(0);
});

client.on('ready', () => {
    console.log('Client is ready!');
    process.exit(0);
});

client.initialize().catch(err => {
    console.error("Init error:", err);
    process.exit(1);
});
