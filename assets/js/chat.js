(function () {
    'use strict';

    // السطر رقم 4: الرابط الصحيح لسيرفرك
    const WS_CONFIG = { CHAT: 'wss://atl-clan1.onrender.com' };

    const qs = (s, r = document) => r.querySelector(s);
    const getText = e => (e && 'value' in e) ? String(e.value) : '';
    const normTag = s => String(s || '').trim().toUpperCase();
    const nowHHMM = () => new Date().toTimeString().slice(0, 5);

    function nicknameEl() { return qs('#nickname') || qs('input[name="nick"]') || qs('input[placeholder*="nick" i]'); }
    function detectGameNick() { const e = nicknameEl(); return (e ? getText(e).trim() : '') || 'Anon'; }
    function tagEl() { return qs('#tag') || qs('input[placeholder*="tag" i]'); }
    function currentTag() { return normTag(getText(tagEl())); }

    // إنشاء اتصال الـ WebSocket
    let socket;
    function connect() {
        socket = new WebSocket(WS_CONFIG.CHAT);

        socket.onopen = () => console.log('Connected to Chat Server');
        
        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            addChatMessage(data);
        };

        socket.onclose = () => {
            console.log('Disconnected. Retrying...');
            setTimeout(connect, 3000); // إعادة اتصال تلقائي
        };
    }

 function addChatMessage(data) {
        const chatUI = qs('#chat-content') || qs('.chat-list') || qs('#messages');
        if (!chatUI) return;
        
        const msgEl = document.createElement('div');
        msgEl.style.color = data.color || '#fff';
        msgEl.innerHTML = `[${nowHHMM()}] <b>${data.nick}:</b> ${data.msg}`;
        chatUI.appendChild(msgEl);
        chatUI.scrollTop = chatUI.scrollHeight;
    }

    // إرسال الرسالة عند الضغط على Enter
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const input = qs('#chat-input') || qs('.chat-input');
            if (input && input.value.trim()) {
                const messageData = {
                    nick: detectGameNick(),
                    msg: input.value,
                    tag: currentTag()
                };
                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify(messageData));
                    input.value = '';
                }
            }
        }
    });

    connect();
})();
