(function () {
  'use strict';

  const WS_CONFIG = { CHAT: '' };

  const qs = (s, r = document) => r.querySelector(s);
  const getText = e => (e && 'value' in e) ? String(e.value) : '';
  const normTag = s => String(s || '').trim().toUpperCase();
  const nowHHMM = () => new Date().toTimeString().slice(0, 5);

  function nicknameEl() { return qs('#nickname') || qs('input[name="nick"]') || qs('input[name="nickname"]') || qs('input[placeholder*="name" i]'); }
  function detectGameNick() { const e = nicknameEl(); return (e ? getText(e).trim() : '') || 'Anon'; }
  function tagEl() { return qs('#tag') || qs('input[placeholder*="tag" i]'); }
  function currentTag() { return normTag(getText(tagEl())); }

  function detectCategory() {
    const s = qs('#servers'); if (!s) return 'ffa';
    const o = s.options[s.selectedIndex];
    const l = (o?.textContent || '').toLowerCase(), v = (o?.value || '').toLowerCase();
    if (l.includes('macro') || v.includes('macro') || v.includes(':6001')) return 'macro';
    return 'ffa';
  }

  function composeRoom(cat, mode, tag) {
    if (mode === 'party') { const T = normTag(tag); return T ? `${cat}:party:${T}` : null; }
    return `${cat}:global`;
  }

  const css = `
  .ZYX-chat{position:fixed;left:10px;bottom:10px;width:300px;height:200px;display:flex;flex-direction:column;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#e6e6e6;font:11px/1.35 system-ui,-apple-system,Segoe UI,Roboto,Arial;z-index:2147483647}
  .ZYX-chat-header{display:flex;align-items:center;gap:6px;padding:5px 6px;border-bottom:1px solid rgba(255,255,255,.06)}
  .ZYX-chat-badge{font-weight:600;padding:3px 7px;border-radius:999px;background:rgba(255,255,255,.07)}
  .ZYX-chat-toggle{margin-left:auto;display:flex;gap:4px}
  .ZYX-chat-toggle button{padding:3px 7px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#ddd;cursor:pointer}
  .ZYX-chat-toggle button.active{background:rgba(255,255,255,.18)}
  .ZYX-chat-body{flex:1;overflow:auto;padding:6px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.18) transparent}
  .ZYX-chat-body::-webkit-scrollbar{width:6px}
  .ZYX-chat-body::-webkit-scrollbar-track{background:transparent}
  .ZYX-chat-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:6px}
  .ZYX-chat-body::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.28)}
  .ZYX-chat-msg{margin:3px 0}
  .ZYX-chat-time{opacity:.5;margin-right:4px}
  .ZYX-chat-name{font-weight:600;margin-right:4px}
  .ZYX-chat-foot{display:flex;gap:5px;padding:6px;border-top:1px solid rgba(255,255,255,.06)}
  .ZYX-chat-foot input{flex:1;padding:5px 7px;border-radius:6px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.35);color:#eee}
  .ZYX-chat-foot button{padding:5px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#eee;cursor:pointer}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const root = document.createElement('div');
  root.className = 'ZYX-chat';
  root.innerHTML = `
    <div class="ZYX-chat-header">
      <span class="ZYX-chat-badge" id="ZYXRoomLabel">…</span>
      <div class="ZYX-chat-toggle">
        <button id="ZYXBtnGlobal" class="active">G</button>
        <button id="ZYXBtnParty">P</button>
      </div>
    </div>
    <div class="ZYX-chat-body" id="ZYXLog"></div>
    <div class="ZYX-chat-foot">
      <input id="ZYXInput" maxlength="300" placeholder="Message">
      <button id="ZYXSend">›</button>
    </div>`;
  document.body.appendChild(root);

  const q = s => root.querySelector(s);
  const logEl = q('#ZYXLog'), inputEl = q('#ZYXInput'),
        sendBtn = q('#ZYXSend'), labelEl = q('#ZYXRoomLabel'),
        btnGlobal = q('#ZYXBtnGlobal'), btnParty = q('#ZYXBtnParty');

  function logLine(name, msg, sys) {
    const r = document.createElement('div'); r.className = 'ZYX-chat-msg';
    const safe = String(msg || '').replace(/[<>]/g, m => ({ '<': '&lt;', '>': '&gt;' }[m]));
    r.innerHTML = sys
      ? `<span class="ZYX-chat-time">[${nowHHMM()}]</span><em>${safe}</em>`
      : `<span class="ZYX-chat-time">[${nowHHMM()}]</span><span class="ZYX-chat-name">${name}</span>${safe}`;
    logEl.appendChild(r);
    logEl.scrollTop = logEl.scrollHeight;
  }

  const sockets = new Map(), logsByRoom = new Map();
  let myName = detectGameNick().slice(0, 24);
  let mode = 'global';
  let currentCategory = detectCategory();
  let currentTagSnapshot = currentTag();
  let chatOpen = false;
  let chatVisible = true;

  function activeRoom() { 
    return mode === 'party' && currentTagSnapshot ? `${currentCategory}:party:${currentTagSnapshot}` : `${currentCategory}:global`;
  }

  function append(room, from, text) {
    if (!logsByRoom.has(room)) logsByRoom.set(room, []);
    logsByRoom.get(room).push({ from, text });
    
    if (room === activeRoom() || from === '•') logLine(from, text);
  }

  function renderRoom(r) {
    logEl.innerHTML = '';
    const messages = logsByRoom.get(r) || [];
    messages.forEach(m => logLine(m.from, m.text));
    logEl.scrollTop = logEl.scrollHeight;
  }

  function ensureSocket(room) {
    if (!room) return;
    if (sockets.get(room)?.readyState === 1) return;

    const u = new URL(WS_CONFIG.CHAT);
    u.searchParams.set('room', room);
    u.searchParams.set('name', myName);

    const ws = new WebSocket(u);
    sockets.set(room, ws);

    ws.onopen = () => { 
      ws.send(JSON.stringify({ type: 'rename', name: myName })); 
      append(room, '•', `Connected to ${room}`);
    };
    
    ws.onmessage = e => {
      let d;
      try { d = JSON.parse(e.data); } catch { append(room, '??', String(e.data)); return; }
      
      if (d.type === 'msg') append(room, d.from || d.name || '??', d.text || '');
      else if (d.type === 'system') append(room, '•', d.text || 'system');
    };
    
    ws.onclose = () => { 
      append(room, '•', `Disconnected from ${room}`); 
      setTimeout(() => ensureSocket(room), 2000); 
    };
    
    ws.onerror = () => append(room, '•', `Error in ${room}`);
  }

  function connectCategory(cat) {
    ensureSocket(`${cat}:global`);
    if (mode === 'party' && currentTagSnapshot) ensureSocket(`${cat}:party:${currentTagSnapshot}`);
    renderRoom(activeRoom());
  }

  function updateHeader() {
    labelEl.textContent = mode === 'party' ? `${currentCategory.toUpperCase()} • PARTY • ${currentTagSnapshot || '—'}` : `${currentCategory.toUpperCase()} • GLOBAL`;
    renderRoom(activeRoom());
  }

  function send(text) {
    const r = activeRoom();
    ensureSocket(r);
    const ws = sockets.get(r);
    if (ws && ws.readyState === 1) { ws.send(JSON.stringify({ type: 'say', text })); append(r, myName, text); }
  }

  sendBtn.onclick = () => { const v = inputEl.value.trim(); if (v) send(v); inputEl.value = ''; chatOpen = false; };
  
  function toggleChatHUD() {
    chatVisible = !chatVisible;
    root.style.display = chatVisible ? 'flex' : 'none';
  }
  
  document.addEventListener('keydown', e => {
    const tag = e.target.tagName;
    const isChatInput = e.target === inputEl;
    const typing = isChatInput;
    if ((tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) && !isChatInput) return;
    
    const toggleKeyInput = document.getElementById('toggleChatHUDKey');
    if (toggleKeyInput && e.code === toggleKeyInput.value) {
      e.preventDefault();
      toggleChatHUD();
      return;
    }
    
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!chatOpen) { chatOpen = true; inputEl.focus(); return; }
      if (chatOpen && typing) { sendBtn.onclick(); }
    }
  });

  btnGlobal.onclick = () => { 
    mode = 'global'; 
    btnGlobal.classList.add('active'); 
    btnParty.classList.remove('active'); 
    updateHeader(); 
    connectCategory(currentCategory);
  };
  
  btnParty.onclick = () => {
    currentTagSnapshot = currentTag();
    if (!currentTagSnapshot) { append(activeRoom(), '•', 'Enter Tag for Party chat'); return; }
    mode = 'party'; 
    btnParty.classList.add('active'); 
    btnGlobal.classList.remove('active'); 
    updateHeader(); 
    connectCategory(currentCategory);
  };

  setTimeout(() => {
    myName = detectGameNick().slice(0, 24);
    currentTagSnapshot = currentTag();
    updateHeader();
    mode = 'global';
    btnGlobal.classList.add('active');
    btnParty.classList.remove('active');
    connectCategory(currentCategory);

    const tEl = tagEl();
    if (tEl) tEl.addEventListener('input', () => {
      const newTag = currentTag();
      if (mode === 'party' && newTag !== currentTagSnapshot) {
        currentTagSnapshot = newTag;
        updateHeader();
        connectCategory(currentCategory);
      }
    });
  }, 50);

})();
