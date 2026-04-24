const API_BASE = "https://rmucadvisor-production.up.railway.app";

// ── Helpers ──────────────────────────────────────────────────────────────
 
  function escHtml(str) {
    return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }
 
  function appendMsg(container, role, text) {
    const emptyState = container.querySelector(".empty-state");
    if (emptyState) emptyState.remove();
 
    const msg = document.createElement("div");
    msg.className = `msg ${role}`;
    const initials = role === "user" ? "YOU" : "AI";
    msg.innerHTML = `
      <div class="msg-avatar">${initials}</div>
      <div class="msg-bubble">${escHtml(text)}</div>`;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    return msg;
  }
 
  function showTyping(container) {
    const msg = document.createElement("div");
    msg.className = "msg assistant";
    msg.id = "typing-indicator";
    msg.innerHTML = `<div class="msg-avatar">AI</div>
      <div class="msg-bubble"><div class="typing"><span></span><span></span><span></span></div></div>`;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
  }
 
  function removeTyping(container) {
    const t = container.querySelector("#typing-indicator");
    if (t) t.remove();
  }
 
  async function callApi(endpoint, messages) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()).reply;
  }
 
  // ── Tabs ─────────────────────────────────────────────────────────────────
 
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    });
  });
 
  // ── Tab 1: Chat ───────────────────────────────────────────────────────────
 
  const chatHistory = [];
  const chatMsgs    = document.getElementById("chat-messages");
  const chatInput   = document.getElementById("chat-input");
  const chatSend    = document.getElementById("chat-send");
  const chatChips   = document.getElementById("chat-chips");
 
  async function sendChat(text) {
    text = text || chatInput.value.trim();
    if (!text) return;
    chatInput.value = "";
    chatChips.style.display = "none";
    chatHistory.push({ role: "user", content: text });
    appendMsg(chatMsgs, "user", text);
    showTyping(chatMsgs);
    chatInput.disabled = chatSend.disabled = true;
    try {
      const reply = await callApi(`${API_BASE}/api/chat`, chatHistory);
      removeTyping(chatMsgs);
      chatHistory.push({ role: "assistant", content: reply });
      appendMsg(chatMsgs, "assistant", reply);
    } catch (e) {
      removeTyping(chatMsgs);
      appendMsg(chatMsgs, "assistant", "⚠️ Something went wrong. Please try again.");
    } finally {
      chatInput.disabled = chatSend.disabled = false;
      chatInput.focus();
    }
  }
 
  chatSend.addEventListener("click", () => sendChat());
  chatInput.addEventListener("keydown", e => { if (e.key === "Enter") sendChat(); });
  chatChips.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => sendChat(chip.dataset.q));
  });
 
  // ── Tab 2: Match ──────────────────────────────────────────────────────────
 
  const matchHistory  = [];
  const matchResults  = document.getElementById("match-results");
  const matchMsgs     = document.getElementById("match-messages");
  const matchInput    = document.getElementById("match-input");
  const matchSend     = document.getElementById("match-send");
  const matchGo       = document.getElementById("match-go");
  const matchWarn     = document.getElementById("match-warn");
 
  matchGo.addEventListener("click", async () => {
    const interests = document.getElementById("match-interests").value.trim();
    const goal      = document.getElementById("match-goal").value;
    if (!interests) { matchWarn.style.display = "block"; return; }
    matchWarn.style.display = "none";
    matchGo.disabled = true;
 
    const userMsg  = `My interests are: ${interests}. My goal is: ${goal}.`;
    const fullMsg  = userMsg + " Please find and rank my best matches from the attendee list.";
 
    matchResults.classList.add("visible");
    matchHistory.push({ role: "user", content: fullMsg });
    appendMsg(matchMsgs, "user", userMsg);
    showTyping(matchMsgs);
 
    try {
      const reply = await callApi(`${API_BASE}/api/match`, matchHistory);
      removeTyping(matchMsgs);
      matchHistory.push({ role: "assistant", content: reply });
      appendMsg(matchMsgs, "assistant", reply);
    } catch (e) {
      removeTyping(matchMsgs);
      appendMsg(matchMsgs, "assistant", "⚠️ Something went wrong. Please try again.");
    }
  });
 
  async function sendMatch() {
    const text = matchInput.value.trim();
    if (!text) return;
    matchInput.value = "";
    matchHistory.push({ role: "user", content: text });
    appendMsg(matchMsgs, "user", text);
    showTyping(matchMsgs);
    matchInput.disabled = matchSend.disabled = true;
    try {
      const reply = await callApi("/api/match", matchHistory);
      removeTyping(matchMsgs);
      matchHistory.push({ role: "assistant", content: reply });
      appendMsg(matchMsgs, "assistant", reply);
    } catch (e) {
      removeTyping(matchMsgs);
      appendMsg(matchMsgs, "assistant", "⚠️ Something went wrong. Please try again.");
    } finally {
      matchInput.disabled = matchSend.disabled = false;
      matchInput.focus();
    }
  }
 
  matchSend.addEventListener("click", sendMatch);
  matchInput.addEventListener("keydown", e => { if (e.key === "Enter") sendMatch(); });