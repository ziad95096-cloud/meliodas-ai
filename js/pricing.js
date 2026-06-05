const API_BASE = '/api';

async function subscribe(tier) {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Please login first. Use any email/password in chat page.');
    window.location.href = '/chat.html';
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/payment/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tier }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else alert('Failed to start checkout');
  } catch (err) {
    alert('Error creating session');
  }
}

document.querySelectorAll('.subscribe-btn').forEach(btn => {
  btn.addEventListener('click', () => subscribe(btn.dataset.tier));
});
document.getElementById('freeBtn')?.addEventListener('click', () => alert('You are on free tier. Upgrade anytime.'));