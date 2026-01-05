function toggleForms(formId) {
    document.querySelectorAll('.form-container').forEach(form => form.classList.remove('active'));
    document.getElementById(formId).classList.add('active');
}

// Helper function to show messages
function showMessage(message, type = 'error') {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6'
    };
    
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${colors[type] || colors.error};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.remove();
    }, 4000);
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Login Form Handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.querySelector('#loginForm form');
    const signupForm = document.querySelector('#signupForm form');

    // Handle Login
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const submitBtn = document.getElementById('loginSubmit');

            // Basic validation
            if (!email || !password) {
                showMessage('Please fill in all fields', 'error');
                return;
            }

            // Disable button and show loading
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (data.success) {
                    // Show success message
                    showMessage(data.message, 'success');
                    
                    // Update UI
                    if (document.getElementById('h1')) {
                        document.getElementById('h1').textContent = 'Success!';
                    }
                    if (document.getElementById('lead')) {
                        document.getElementById('lead').textContent = 'Redirecting to homepage...';
                    }
                    
                    // Redirect to homepage
                    setTimeout(() => {
                        window.location.href = data.redirectUrl;
                    }, 1000);
                } else {
                    // Show error message
                    showMessage(data.message || 'Login failed', 'error');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Login';
                }
            } catch (error) {
                console.error('Error:', error);
                showMessage('Network error. Please check your connection.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
            }
        });
    }

    // Handle Signup
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const fullName = document.getElementById('signupName').value.trim();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const submitBtn = document.getElementById('SignUpSubmit');

            // Validation
            if (!fullName || !email || !password) {
                showMessage('Please fill in all fields', 'error');
                return;
            }

            if (password.length < 6) {
                showMessage('Password must be at least 6 characters', 'error');
                return;
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showMessage('Please enter a valid email address', 'error');
                return;
            }

            // Disable button and show loading
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating Account...';

            try {
                const response = await fetch('/api/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ fullName, email, password })
                });

                const data = await response.json();

                if (data.success) {
                    // Show success message
                    showMessage(data.message, 'success');
                    
                    // Update UI
                    if (document.getElementById('h1')) {
                        document.getElementById('h1').textContent = 'Welcome to ACQUA!';
                    }
                    if (document.getElementById('lead')) {
                        document.getElementById('lead').textContent = 'Account created successfully!';
                    }
                    
                    // Redirect to homepage
                    setTimeout(() => {
                        window.location.href = data.redirectUrl;
                    }, 1000);
                } else {
                    // Show error message
                    showMessage(data.message || 'Signup failed', 'error');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Sign Up';
                }
            } catch (error) {
                console.error('Error:', error);
                showMessage('Network error. Please check your connection.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign Up';
            }
        });
    }
});

// Handle Forgot Password
function handleForgotPassword(e) {
  e.preventDefault();
  
  const email = prompt('Enter your email address:');
  
  if (!email) return;
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showMessage('Please enter a valid email address', 'error');
    return;
  }

  // Show loading message
  showMessage('Sending reset email...', 'info');

  fetch('/api/forgot-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showMessage('✓ Password reset email sent! Check your inbox.', 'success');
    } else {
      showMessage(data.message || 'Failed to send reset email', 'error');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    showMessage('Network error. Please try again.', 'error');
  });
}

// Add event listener for forgot password link
document.addEventListener('DOMContentLoaded', function() {
  // ... existing code ...
  
  // Add this at the end of DOMContentLoaded
  const forgotPasswordLink = document.querySelector('.remeber-forgot a');
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', handleForgotPassword);
  }
});