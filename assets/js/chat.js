const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws) => {
    console.log('لاعب جديد اتصل بالشات');

    ws.on('message', (data) => {
        // تحويل الرسالة المستلمة إلى نص
        const message = data.toString();
        
        // توزيع الرسالة على كل اللاعبين المتصلين حالياً
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });
});

console.log(`سيرفر الشات يعمل على المنفذ ${PORT}`);
