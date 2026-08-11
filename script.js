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
