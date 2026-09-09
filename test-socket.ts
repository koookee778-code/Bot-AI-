import { io } from "socket.io-client";
const socket = io("http://localhost:3000");

socket.on('connect', () => {
    console.log("Connected to server!");
});

socket.on('whatsapp-status', (data) => {
    console.log("Received status:", data);
    if (data.qr) {
        console.log("QR received! Exiting.");
        process.exit(0);
    }
    if (data.error) {
        console.error("Error received:", data.error);
        process.exit(1);
    }
});

// Wait up to 15 seconds
setTimeout(() => {
    console.log("Timeout waiting for QR.");
    process.exit(1);
}, 15000);
