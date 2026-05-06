document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.querySelector('.login-btn');
  const btnText = loginBtn.querySelector('span');
  const btnIcon = loginBtn.querySelector('i');

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // UI Loading state
    btnText.textContent = 'Authenticating...';
    btnIcon.className = 'fas fa-spinner fa-spin';
    loginBtn.style.opacity = '0.8';
    loginBtn.disabled = true;

    // Mock authentication delay
    setTimeout(() => {
      // Simulate success
      btnIcon.className = 'fas fa-check-circle';
      btnText.textContent = 'Success!';
      loginBtn.style.backgroundColor = '#10b981'; // Green color for success
      
      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 600);
    }, 1500);
  });
});
