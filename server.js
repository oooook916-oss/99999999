const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// تشغيل ملفات اللعبة (الواجهة)
app.use(express.static(path.join(__dirname, '/')));

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        let data = JSON.parse(message);
        // نظام الأدمن ROSH
        if (data.nick === "ROSH") { data.isAdmin = true; }

        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(data));
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Game and Server running on port ${PORT}`));
