// /public/loader.js — ultra-advanced WS key gate with persistent status overlay and auto-access
(async function () {
  if (window.__OVERLAY_LOADED__) return;
  window.__OVERLAY_LOADED__ = true;

  const WS_VERIFY_URL = "wss://chat--nextgen676.replit.app/chat";

  /* ===================== WAIT BODY ===================== */
  async function waitForBody() {
    if (document.body) return;
    if (document.readyState === "loading") {
      await new Promise(r =>
        document.addEventListener("DOMContentLoaded", r, { once: true })
      );
    }
    while (!document.body) {
      await new Promise(r => setTimeout(r, 10));
    }
  }
  await waitForBody();
  await loadClient();
  return;

  /* ===================== HARD BLOCK ===================== */
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";

  /* ===================== UI ===================== */
  const overlay = document.createElement("div");
  overlay.style = `
    position:fixed;inset:0;
    background:#000f;
    z-index:999999;
    display:flex;
    align-items:center;
    justify-content:center;
    font-family:monospace;
  `;

  overlay.innerHTML = `
    <div style="
      background:#0b0b0b;
      padding:22px;
      width:360px;
      border-radius:6px;
      box-shadow:0 0 30px #000;
      color:#ccc;
      text-align:left;
    ">
      <div style="color:#fff;font-size:14px;margin-bottom:6px">
        Secure Access Gateway
      </div>

      <div id="__status" style="font-size:12px;color:#888;margin-bottom:10px">
        Server: disconnected
      </div>

      <div style="position:relative;">
        <input id="__key" placeholder="Enter access key" style="
          width:100%;
          padding:10px;
          background:#111;
          border:1px solid #222;
          color:#fff;
          outline:none;
          padding-right:40px;
        ">
        <button id="__key_manager" onclick="window.open('key-manager.html', '_blank')" style="
          position:absolute;
          right:5px;
          top:50%;
          transform:translateY(-50%);
          background:transparent;
          border:none;
          color:#888;
          cursor:pointer;
          font-size:16px;
          padding:5px;
        ">🔑</button>
      </div>

      <div style="display:flex;gap:8px;margin-top:10px">
        <button id="__verify" style="
          flex:1;
          padding:10px;
          background:#2d3cff;
          color:#fff;
          border:none;
          cursor:pointer;
        ">Verify</button>

        <button id="__cancel" style="
          padding:10px;
          background:#400;
          color:#fff;
          border:none;
          cursor:pointer;
        ">Cancel</button>
      </div>

      <div id="__log" style="
        margin-top:12px;
        background:#060606;
        border:1px solid #111;
        padding:8px;
        height:120px;
        overflow:auto;
        font-size:11px;
      "></div>
    </div>
  `;

  document.body.appendChild(overlay);

  const status = overlay.querySelector("#__status");
  const logBox = overlay.querySelector("#__log");
  const input = overlay.querySelector("#__key");
  const verifyBtn = overlay.querySelector("#__verify");
  const cancelBtn = overlay.querySelector("#__cancel");

  function log(msg) {
    const t = new Date().toLocaleTimeString();
    logBox.innerHTML += `[${t}] ${msg}<br>`;
    logBox.scrollTop = logBox.scrollHeight;
  }

  cancelBtn.onclick = () => {
    window.location.replace("about:blank");
  };

  function verifyKey(key) {
    return new Promise((resolve, reject) => {
      log("Opening verification channel…");
      const ws = new WebSocket(WS_VERIFY_URL);

      ws.onopen = () => {
        status.textContent = "Server: connected";
        log("Sending key to server");
        ws.send(JSON.stringify({ type: "auth", key }));
      };

      ws.onmessage = e => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.ok) {
            log("Key accepted by server");
            ws.close();
            resolve(msg);
          } else {
            log("Key rejected by server");
            ws.close();
            reject();
          }
        } catch {
          ws.close();
          reject();
        }
      };

      ws.onerror = () => {
        status.textContent = "Server: error";
        log("WebSocket error");
        reject();
      };

      ws.onclose = () => {
        status.textContent = "Server: closed";
      };
    });
  }

  /* ===================== VERIFY FLOW ===================== */
  verifyBtn.onclick = async () => {
    const key = input.value.trim();
    if (!key) return;

    verifyBtn.disabled = true;
    input.disabled = true;
    log("Verification started");

    try {
      const keyInfo = await verifyKey(key);
      window.__ACCESS_KEY__ = key;
      localStorage.setItem("__ACCESS_KEY__", key);
      log("Access granted");
      overlay.remove();
      unlock();
      loadClient();
      showKeyStatusOverlay(keyInfo);
    } catch {
      log("Verification failed");
      verifyBtn.disabled = false;
      input.disabled = false;
      localStorage.removeItem("__ACCESS_KEY__");
    }
  };

  /* ===================== AUTO ACCESS ===================== */
  async function tryAutoAccess() {
    const savedKey = localStorage.getItem("__ACCESS_KEY__");
    if (!savedKey) return;

    input.value = savedKey;
    verifyBtn.disabled = true;
    input.disabled = true;
    log("Auto-verifying saved key…");

    try {
      const keyInfo = await verifyKey(savedKey);
      window.__ACCESS_KEY__ = savedKey;
      log("Access granted via saved key");
      overlay.remove();
      unlock();
      loadClient();
      showKeyStatusOverlay(keyInfo);
    } catch {
      log("Saved key invalid, please enter manually");
      verifyBtn.disabled = false;
      input.disabled = false;
      localStorage.removeItem("__ACCESS_KEY__");
    }
  }
  tryAutoAccess();

  /* ===================== UNLOCK ===================== */
  function unlock() {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

  /* ===================== CLIENT LOADER ===================== */
  async function loadClient() {
    const thirdPartyJS = [
      "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.js",
      "https://unpkg.com/gifler@latest/gifler.min.js"
    ];
    const thirdPartyCSS = [
      "https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.css"
    ];
    const bundles = [
      ["./assets/js/main.bundle.js", "/assets/js/main.bundle.js"],
      ["./assets/js/chat.js", "/assets/js/chat.js"]
    ];

    function css(h) {
      return new Promise(r => {
        const l = document.createElement("link");
        l.rel = "stylesheet";
        l.href = h;
        l.onload = r;
        document.head.appendChild(l);
      });
    }

    function js(s) {
      return new Promise(r => {
        const e = document.createElement("script");
        e.src = s;
        e.async = false;
        e.onload = () => r(true);
        e.onerror = () => r(false);
        document.head.appendChild(e);
      });
    }

    async function tryPair(p) {
      for (const s of p) if (await js(s)) return;
    }

    for (const c of thirdPartyCSS) await css(c);
    for (const j of thirdPartyJS) await js(j);
    for (const b of bundles) await tryPair(b);

    document.dispatchEvent(new Event("DOMContentLoaded"));
    window.dispatchEvent(new Event("load"));
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  }

  /* ===================== PERSISTENT STATUS OVERLAY ===================== */
  function showKeyStatusOverlay(keyInfo) {
    const box = document.createElement("div");
    box.id = "__key_status_overlay";
    box.style = `
      position:fixed;
      bottom:10px;
      right:10px;
      background:rgba(0,0,0,0.7);
      color:#fff;
      font-size:12px;
      padding:8px 12px;
      border-radius:6px;
      z-index:999999;
      font-family:monospace;
      pointer-events:none;
    `;
    document.body.appendChild(box);

    function update() {
      const now = new Date();
      const exp = keyInfo.expires ? new Date(keyInfo.expires) : null;
      const remaining = exp ? Math.max(0, exp - Date.now()) : null;
      const timeStr = now.toLocaleTimeString();
      const expStr = exp ? `${exp.toLocaleString()} (${Math.ceil(remaining / 1000)}s left)` : "Never";
      box.textContent = `Time: ${timeStr} | Key Type: ${keyInfo.type} | Expires: ${expStr} | Uses: ${keyInfo.uses}`;
    }

    update();
    setInterval(update, 1000);
  }
})();
