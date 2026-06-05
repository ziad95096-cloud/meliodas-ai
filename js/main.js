// Simple landing interactions
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (token) {
    document.querySelectorAll('.cta-btn, .nav-chat').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/chat.html';
      });
    });
  }
});