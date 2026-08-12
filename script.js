const menu = document.querySelector('.menu');
const nav = document.querySelector('.header nav');
menu.addEventListener('click', () => nav.classList.toggle('open'));

const leadForm = document.getElementById('lead-form');
const submitButton = leadForm.querySelector('button[type="submit"]');
const WEBHOOK_URL = 'https://n8n.vbn8n.online/webhook/orion-lead';

leadForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const form = e.currentTarget;
  const data = new FormData(form);
  const originalButtonText = submitButton.textContent;

  const payload = {
    name: (data.get('name') || '').trim(),
    company: (data.get('company') || '').trim(),
    contact: (data.get('contact') || '').trim(),
    task: (data.get('task') || '').trim(),
    page: window.location.href
  };

  submitButton.disabled = true;
  submitButton.textContent = 'Отправляем…';

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    form.reset();
    submitButton.textContent = 'Заявка отправлена ✓';
    setTimeout(() => {
      submitButton.textContent = originalButtonText;
      submitButton.disabled = false;
    }, 3000);
  } catch (error) {
    console.error('Lead form error:', error);
    submitButton.textContent = 'Ошибка. Попробуйте ещё раз';
    setTimeout(() => {
      submitButton.textContent = originalButtonText;
      submitButton.disabled = false;
    }, 4000);
  }
});



/* Orion AI chat
 * ВСТАВЬТЕ PRODUCTION URL n8n ТОЛЬКО В СЛЕДУЮЩУЮ КОНСТАНТУ.
 * Не размещайте здесь ключи OpenAI, Google или другие секреты.
 */
const N8N_CHAT_WEBHOOK_URL = '';

const chatLauncher = document.getElementById('ai-chat-launcher');
const chatPanel = document.getElementById('ai-chat-panel');
const chatClose = document.getElementById('ai-chat-close');
const chatMessages = document.getElementById('ai-chat-messages');
const chatTyping = document.getElementById('ai-chat-typing');
const chatQuick = document.getElementById('ai-chat-quick');
const chatForm = document.getElementById('ai-chat-form');
const chatInput = document.getElementById('ai-chat-input');
const chatSend = document.getElementById('ai-chat-send');
const chatCounter = document.getElementById('ai-chat-counter');
const CHAT_SESSION_KEY = 'orionChatSessionId';
const CHAT_WELCOME = 'Здравствуйте! 👋 Я ИИ-консультант Орион. Расскажите, что вы хотели бы автоматизировать, или задайте вопрос о чат-ботах и автоматизации.';
let chatWaiting = false;

function createSessionId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
  return 'orion-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
}

function getChatSessionId() {
  let id = localStorage.getItem(CHAT_SESSION_KEY);
  if (!id) {
    id = createSessionId();
    localStorage.setItem(CHAT_SESSION_KEY, id);
  }
  return id;
}

const chatSessionId = getChatSessionId();

function addChatMessage(text, role, isError = false) {
  const message = document.createElement('div');
  message.className = 'ai-message ' + role + (isError ? ' error' : '');
  message.textContent = String(text);
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function openChat() {
  chatPanel.classList.add('open');
  chatPanel.setAttribute('aria-hidden', 'false');
  chatLauncher.setAttribute('aria-expanded', 'true');
  if (!chatMessages.children.length) addChatMessage(CHAT_WELCOME, 'assistant');
  window.setTimeout(() => chatInput.focus(), 220);
}

function closeChat() {
  chatPanel.classList.remove('open');
  chatPanel.setAttribute('aria-hidden', 'true');
  chatLauncher.setAttribute('aria-expanded', 'false');
  chatLauncher.focus();
}

function setChatWaiting(waiting) {
  chatWaiting = waiting;
  chatInput.disabled = waiting;
  chatSend.disabled = waiting;
  chatTyping.hidden = !waiting;
  if (waiting) chatMessages.scrollTop = chatMessages.scrollHeight;
}

function extractChatReply(data) {
  if (typeof data === 'string') return data;
  if (!data || typeof data !== 'object') return '';
  return data.output || data.text || data.message || data.response || data.answer || '';
}

async function sendChatMessage(rawText) {
  const text = String(rawText || '').trim();
  if (!text || chatWaiting) return;
  if (text.length > 2000) {
    addChatMessage('Сообщение не должно превышать 2000 символов.', 'assistant', true);
    return;
  }

  addChatMessage(text, 'user');
  chatInput.value = '';
  chatCounter.textContent = '0 / 2000';
  chatQuick.hidden = true;
  setChatWaiting(true);

  try {
    if (!N8N_CHAT_WEBHOOK_URL) throw new Error('Chat webhook is not configured');

    const response = await fetch(N8N_CHAT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sendMessage',
        chatInput: text,
        sessionId: chatSessionId,
        source: 'ИИ-чат сайта',
        page: window.location.href
      })
    });

    if (!response.ok) throw new Error('Chat request failed');

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : await response.text();
    const reply = extractChatReply(data);
    if (!reply) throw new Error('Empty chat response');
    addChatMessage(reply, 'assistant');
  } catch (error) {
    console.warn('Orion chat request was not completed.');
    addChatMessage('Не удалось получить ответ. Попробуйте ещё раз через несколько секунд.', 'assistant', true);
  } finally {
    setChatWaiting(false);
    chatInput.focus();
  }
}

chatLauncher.addEventListener('click', () => chatPanel.classList.contains('open') ? closeChat() : openChat());
chatClose.addEventListener('click', closeChat);
chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  sendChatMessage(chatInput.value);
});
chatInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});
chatInput.addEventListener('input', () => {
  chatCounter.textContent = chatInput.value.length + ' / 2000';
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
});
chatQuick.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (button) sendChatMessage(button.textContent);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && chatPanel.classList.contains('open')) closeChat();
});
