const WebSocket = require('');
const PORT = process.env.PORT || 3000;

const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws) => {
    console.log('لاعب جديد اتصل بالشات');

    ws.on('message', (data) => {
        // توزيع الرسالة على كل اللاعبين المتصلين
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    });
});

console.log(`سيرفر الشات يعمل على المنفذ ${PORT}`);
