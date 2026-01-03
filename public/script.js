document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logout');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            // Show confirmation
            if (!confirm('Are you sure you want to logout?')) {
                return;
            }

            try {
                const response = await fetch('/api/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                const data = await response.json();

                if (data.success) {
                    // Redirect to login page
                    window.location.href = data.redirectUrl;
                }
            } catch (error) {
                console.error('Error:', error);
                // Even if there's an error, redirect to login
                window.location.href = '/';
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
  const privacyOverlay = document.getElementById('privacyOverlay');
  const privacyAccept = document.getElementById('privacyAccept');
  const acceptBtn = document.getElementById('acceptBtn');
  const declineBtn = document.getElementById('declineBtn');

  // Check if user has already accepted privacy policy
  const hasAccepted = localStorage.getItem('privacyAccepted');

  if (!hasAccepted) {
    // Show popup after a short delay
    setTimeout(() => {
      privacyOverlay.classList.add('active');
    }, 500);
  }

  // Enable accept button only when checkbox is checked
  privacyAccept.addEventListener('change', function() {
    if (this.checked) {
      acceptBtn.classList.add('enabled');
    } else {
      acceptBtn.classList.remove('enabled');
    }
  });

  // Accept button handler
  acceptBtn.addEventListener('click', function() {
    if (privacyAccept.checked) {
      localStorage.setItem('privacyAccepted', 'true');
      localStorage.setItem('privacyAcceptedDate', new Date().toISOString());
      privacyOverlay.classList.remove('active');
    }
  });

  // Decline button handler
  declineBtn.addEventListener('click', function() {
    if (confirm('You must accept the Data Privacy Notice to use ACQUA. Would you like to return to the login page?')) {
      window.location.href = '/combo.html';
    }
  });

  // Prevent closing popup by clicking outside
  privacyOverlay.addEventListener('click', function(e) {
    if (e.target === privacyOverlay) {
      alert('Please read and accept the Data Privacy Notice to continue.');
    }
  });
});