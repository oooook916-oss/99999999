const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// تشغيل ملفات اللعبة (الواجهة) من المجلد الرئيسي
app.use(express.static(__dirname));

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        // توزيع الرسائل على الكل
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Game is running on port ${PORT}`));
