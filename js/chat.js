const API_BASE = '/api';
let currentChatId = null;
let currentMessages = [];

const token = localStorage.getItem('token');
if (!token) {
  const fakeEmail = prompt('Demo mode: enter email (any)') || 'guest@example.com';
  const fakePass = prompt('Enter password (any)') || '123456';
  (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fakeEmail, password: fakePass }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      location.reload();
    } catch {
      alert('Auto-login failed, try manual refresh');
    }
  })();
}

const sendBtn = document.getElementById('sendBtn');
const input = document.getElementById('messageInput');
const messagesDiv = document.getElementById('messagesArea');
const historyDiv = document.getElementById('chatHistoryList');
const newChatBtn = document.getElementById('newChatBtn');
const voiceBtn = document.getElementById('voiceBtn');
const fileBtn = document.getElementById('fileBtn');
const fileInput = document.getElementById('fileInput');

let mediaRecorder;
let audioChunks = [];

async function loadChats() {
  const res = await fetch(`${API_BASE}/chat/chats`, { headers: { Authorization: `Bearer ${token}` } });
  const chats = await res.json();
  historyDiv.innerHTML = chats.map(chat => `<div class="chat-history-item p-2 rounded cursor-pointer hover:bg-gold/20" data-id="${chat._id}">${chat.title || 'Chat'}</div>`).join('');
  document.querySelectorAll('.chat-history-item').forEach(el => {
    el.addEventListener('click', () => loadChat(el.dataset.id));
  });
}

async function loadChat(chatId) {
  currentChatId = chatId;
  const res = await fetch(`${API_BASE}/chat/chats/${chatId}`, { headers: { Authorization: `Bearer ${token}` } });
  const msgs = await res.json();
  currentMessages = msgs;
  messagesDiv.innerHTML = '';
  msgs.forEach(msg => appendMessage(msg.role, msg.content, false));
}

function appendMessage(role, content, saveToHistory = true) {
  const div = document.createElement('div');
  div.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'}`;
  const bubble = document.createElement('div');
  bubble.className = `max-w-[70%] rounded-2xl p-3 ${role === 'user' ? 'bg-gold text-black' : 'bg-gray-800'} whitespace-pre-wrap`;
  if (role === 'assistant') {
    const formatted = formatCodeBlocks(content);
    bubble.innerHTML = formatted;
    attachCopyListeners(bubble);
  } else {
    bubble.innerText = content;
  }
  div.appendChild(bubble);
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  if (saveToHistory && role === 'user') currentMessages.push({ role, content });
}

function formatCodeBlocks(text) {
  return text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre><code class="language-${lang}">${escapeHtml(code)}</code><button class="copy-btn">Copy</button></pre>`;
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function attachCopyListeners(container) {
  container.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.previousElementSibling.innerText;
      navigator.clipboard.writeText(code);
      btn.innerText = 'Copied!';
      setTimeout(() => btn.innerText = 'Copy', 1500);
    });
  });
}

async function sendMessage() {
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  appendMessage('user', msg, true);
  const tempAssistantDiv = document.createElement('div');
  tempAssistantDiv.className = 'flex justify-start';
  const bubble = document.createElement('div');
  bubble.className = 'max-w-[70%] rounded-2xl p-3 bg-gray-800 whitespace-pre-wrap';
  tempAssistantDiv.appendChild(bubble);
  messagesDiv.appendChild(tempAssistantDiv);
  let streamText = '';
  try {
    const res = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ chatId: currentChatId, message: msg }),
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.chunk) {
            streamText += data.chunk;
            bubble.innerHTML = formatCodeBlocks(streamText);
            attachCopyListeners(bubble);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
          } else if (data.done) {
            currentChatId = data.chatId;
            currentMessages.push({ role: 'assistant', content: streamText });
          }
        }
      }
    }
  } catch (err) {
    bubble.innerText = 'Meliodas is sleeping. Daneh! Try again.';
  }
}

newChatBtn.addEventListener('click', async () => {
  const res = await fetch(`${API_BASE}/chat/new`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  const chat = await res.json();
  currentChatId = chat._id;
  currentMessages = [];
  messagesDiv.innerHTML = '';
  loadChats();
});

voiceBtn.addEventListener('click', () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return alert('No speech recognition');
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.start();
  recognition.onresult = (event) => {
    input.value = event.results[0][0].transcript;
  };
});

fileBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  input.value = `[File: ${file.name}]\n${text.slice(0, 2000)}`;
});

sendBtn.addEventListener('click', sendMessage);
input.addEventListener('keypress', (e) => e.key === 'Enter' && !e.shiftKey && sendMessage());

loadChats();