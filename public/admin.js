// Global variables
let allUsers = [];
let allFeedback = [];
let filteredFeedback = [];
let currentTab = 'users';

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  loadUsers();
  
  // Add search event listener
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', searchUsers);
  searchInput.addEventListener('keyup', searchUsers);

  // Logout handler
  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      if (confirm('Are you sure you want to logout?')) {
        try {
          const response = await fetch('/api/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          const data = await response.json();
          if (data.success) {
            window.location.href = data.redirectUrl;
          }
        } catch (error) {
          console.error('Error:', error);
          window.location.href = '/';
        }
      }
    });
  }
});

// ===== TAB SWITCHING =====

function switchTab(tab) {
  currentTab = tab;
  
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  if (tab === 'users') {
    document.getElementById('usersTab').classList.add('active');
  } else if (tab === 'feedback') {
    document.getElementById('feedbackTab').classList.add('active');
    // Load feedback if not already loaded
    if (allFeedback.length === 0) {
      loadFeedback();
      loadFeedbackStats();
    }
  }
}

// ===== USER MANAGEMENT FUNCTIONS =====

async function loadUsers() {
  const container = document.getElementById('tableContainer');
  container.innerHTML = '<div class="loading">📊 Loading users...</div>';
  
  try {
    const response = await fetch('/api/admin/users');
    const data = await response.json();

    if (data.success) {
      allUsers = data.users;
      displayUsers(allUsers);
      updateStats(allUsers);
    } else {
      showError('Failed to load users');
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3>Failed to Load Users</h3>
          <p>Please try refreshing the page</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading users:', error);
    showError('Error connecting to server');
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔌</div>
        <h3>Connection Error</h3>
        <p>Unable to connect to server. Please check your connection.</p>
      </div>
    `;
  }
}

function displayUsers(users) {
  const container = document.getElementById('tableContainer');
  
  if (users.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">👥</div>
        <h3>No Users Found</h3>
        <p>No users match your search criteria</p>
      </div>
    `;
    return;
  }

  let html = `
    <div class="table-wrapper">
      <table class="users-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Full Name</th>
            <th>Email</th>
            <th>Joined Date</th>
            <th>Total Tests</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
  `;

  users.forEach((user, index) => {
    const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    const totalTests = user.hydrationResults?.length || 0;
    
    html += `
      <tr>
        <td><strong>${index + 1}</strong></td>
        <td>${escapeHtml(user.fullName)}</td>
        <td>${escapeHtml(user.email)}</td>
        <td>${joinDate}</td>
        <td>${totalTests}</td>
        <td><span class="status-badge status-active">Active</span></td>
        <td>
          <button 
            class="action-btn" 
            onclick="resetPassword('${user._id}', '${escapeHtml(user.email)}')"
            title="Reset Password"
            style="margin-right: 5px;"
          >
            🔒 Reset
          </button>
          <button 
            class="action-btn" 
            onclick="sendEmailToUser('${user._id}', '${escapeHtml(user.email)}', '${escapeHtml(user.fullName)}')"
            title="Send Email"
            style="background: linear-gradient(135deg, #10b981, #059669);"
          >
            📧 Email
          </button>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function updateStats(users) {
  document.getElementById('totalUsers').textContent = users.length;
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const newUsers = users.filter(user => 
    new Date(user.createdAt) > sevenDaysAgo
  ).length;
  
  document.getElementById('newUsers').textContent = newUsers;
  
  const totalTests = users.reduce((sum, user) => 
    sum + (user.hydrationResults?.length || 0), 0
  );
  document.getElementById('totalTests').textContent = totalTests;
  
  document.getElementById('avgHydration').textContent = 'N/A';
}

function searchUsers() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
  
  if (!searchTerm) {
    displayUsers(allUsers);
    return;
  }
  
  const filtered = allUsers.filter(user => 
    user.fullName.toLowerCase().includes(searchTerm) ||
    user.email.toLowerCase().includes(searchTerm)
  );
  
  displayUsers(filtered);
}

async function resetPassword(userId, email) {
  const sendEmail = confirm(`Reset password for ${email}?\n\nSend email notification to user?`);
  
  if (!confirm('Are you sure you want to reset this password?')) return;

  const tempPassword = 'temp' + Math.random().toString(36).substring(2, 10);

  try {
    const response = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, newPassword: tempPassword, sendEmail })
    });

    const data = await response.json();

    if (data.success) {
      let message = `✅ Password Reset Successful!\n\n`;
      message += `Email: ${email}\n`;
      message += `Temporary Password: ${data.tempPassword}\n\n`;
      
      if (data.emailSent) {
        message += `📧 Email notification sent to user.\n\n`;
      } else if (sendEmail) {
        message += `⚠️ Password reset but email failed to send.\n`;
        message += `Error: ${data.emailError || 'Unknown error'}\n\n`;
      }
      
      message += `⚠️ IMPORTANT:\n`;
      message += `• Save this password if email wasn't sent\n`;
      message += `• Share it securely with the user\n`;
      message += `• User should change it after first login`;
      
      alert(message);
      
      if (navigator.clipboard && !data.emailSent) {
        navigator.clipboard.writeText(data.tempPassword).then(() => {
          showSuccess('✓ Password copied to clipboard!');
        });
      } else if (data.emailSent) {
        showSuccess('✓ Password reset and email sent!');
      }
    } else {
      showError(data.message || 'Password reset failed');
    }
  } catch (error) {
    console.error('Reset error:', error);
    showError('Failed to reset password. Please try again.');
  }
}

async function sendEmailToUser(userId, email, userName) {
  const subject = prompt('Email Subject:', 'Important Update from ACQUA');
  if (!subject) return;

  const message = prompt('Email Message:', 'Hello! We wanted to inform you...');
  if (!message) return;

  if (!confirm(`Send email to ${email}?`)) return;

  try {
    showInfo('Sending email...');

    const response = await fetch('/api/admin/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, subject, message })
    });

    const data = await response.json();

    if (data.success) {
      showSuccess(`✓ Email sent to ${email}`);
    } else {
      showError(data.message || 'Failed to send email');
    }
  } catch (error) {
    console.error('Email error:', error);
    showError('Failed to send email. Please try again.');
  }
}

async function sendBulkEmail() {
  if (allUsers.length === 0) {
    showError('No users available');
    return;
  }

  const subject = prompt('Email Subject:', 'Important Announcement');
  if (!subject) return;

  const message = prompt('Email Message (will be sent to all users):', 'Dear ACQUA users...');
  if (!message) return;

  if (!confirm(`Send email to ${allUsers.length} users?`)) return;

  try {
    showInfo('Sending bulk email...');

    const userIds = allUsers.map(u => u._id);

    const response = await fetch('/api/admin/send-bulk-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds, subject, message })
    });

    const data = await response.json();

    if (data.success) {
      const successCount = data.results.success.length;
      const failCount = data.results.failed.length;
      
      let msg = `✓ Bulk email sent!\n\n`;
      msg += `Success: ${successCount}\n`;
      msg += `Failed: ${failCount}`;
      
      if (failCount > 0) {
        msg += `\n\nFailed emails:\n`;
        data.results.failed.forEach(f => {
          msg += `• ${f.email}\n`;
        });
      }
      
      alert(msg);
      showSuccess(data.message);
    } else {
      showError(data.message || 'Failed to send bulk email');
    }
  } catch (error) {
    console.error('Bulk email error:', error);
    showError('Failed to send bulk email. Please try again.');
  }
}

async function exportCSV() {
  try {
    showInfo('Generating CSV file...');
    
    const response = await fetch('/api/admin/export/csv');
    
    if (!response.ok) {
      throw new Error('Export failed');
    }
    
    const blob = await response.blob();
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `acqua_users_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showSuccess('✓ CSV exported successfully!');
  } catch (error) {
    console.error('Export error:', error);
    showError('Failed to export CSV. Please try again.');
  }
}

async function exportJSON() {
  try {
    showInfo('Generating JSON file...');
    
    const response = await fetch('/api/admin/export/json');
    const data = await response.json();
    
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `acqua_users_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showSuccess('✓ JSON exported successfully!');
  } catch (error) {
    console.error('Export error:', error);
    showError('Failed to export JSON. Please try again.');
  }
}

// ===== FEEDBACK MANAGEMENT FUNCTIONS =====

async function loadFeedback() {
  const loading = document.getElementById('feedbackLoading');
  const tableWrapper = document.querySelector('.feedback-table .table-wrapper');
  const noData = document.getElementById('noData');
  
  loading.style.display = 'block';
  tableWrapper.style.display = 'none';
  noData.style.display = 'none';
  
  try {
    const response = await fetch('/api/admin/feedback');
    const data = await response.json();
    
    if (data.success) {
      allFeedback = data.feedback;
      filteredFeedback = allFeedback;
      displayFeedback(filteredFeedback);
    } else {
      showError('Failed to load feedback');
      loading.textContent = 'Failed to load feedback';
      loading.style.color = '#ef4444';
    }
  } catch (error) {
    console.error('Error loading feedback:', error);
    showError('Error loading feedback');
    loading.textContent = 'Error loading feedback';
    loading.style.color = '#ef4444';
  }
}

async function loadFeedbackStats() {
  try {
    const response = await fetch('/api/admin/feedback/stats');
    const data = await response.json();
    
    if (data.success) {
      const stats = data.stats;
      
      document.getElementById('totalFeedback').textContent = stats.totalFeedback;
      document.getElementById('avgRating').textContent = stats.averageRating;
      document.getElementById('withComments').textContent = stats.feedbackWithComments;
      
      // Calculate satisfaction rate (4+ stars)
      const satisfiedCount = stats.ratingDistribution
        .filter(r => r._id >= 4)
        .reduce((sum, r) => sum + r.count, 0);
      const satisfactionRate = stats.totalFeedback > 0 
        ? Math.round((satisfiedCount / stats.totalFeedback) * 100) 
        : 0;
      document.getElementById('satisfactionRate').textContent = satisfactionRate + '%';
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

function displayFeedback(feedback) {
  const loading = document.getElementById('feedbackLoading');
  const tableWrapper = document.querySelector('.feedback-table .table-wrapper');
  const tbody = document.getElementById('feedbackTableBody');
  const noData = document.getElementById('noData');
  
  loading.style.display = 'none';
  
  if (feedback.length === 0) {
    tableWrapper.style.display = 'none';
    noData.style.display = 'block';
    return;
  }
  
  noData.style.display = 'none';
  tableWrapper.style.display = 'block';
  tbody.innerHTML = '';
  
  feedback.forEach(item => {
    const row = document.createElement('tr');
    
    const date = new Date(item.feedbackDate).toLocaleString();
    const stars = '⭐'.repeat(item.rating);
    const comment = item.comment || '<em style="color: rgba(148, 163, 184, 0.6);">No comment</em>';
    
    row.innerHTML = `
      <td>${date}</td>
      <td>${item.userName}</td>
      <td>${item.userEmail}</td>
      <td class="rating-stars">${stars} (${item.rating})</td>
      <td>${item.testResult || 'N/A'}</td>
      <td class="comment-cell" title="${item.comment || ''}">${comment}</td>
    `;
    
    tbody.appendChild(row);
  });
}

function filterFeedback() {
  const ratingFilter = document.getElementById('ratingFilter').value;
  const commentFilter = document.getElementById('commentFilter').value;
  
  filteredFeedback = allFeedback.filter(item => {
    // Rating filter
    if (ratingFilter !== 'all' && item.rating !== parseInt(ratingFilter)) {
      return false;
    }
    
    // Comment filter
    if (commentFilter === 'with' && (!item.comment || item.comment.trim() === '')) {
      return false;
    }
    if (commentFilter === 'without' && item.comment && item.comment.trim() !== '') {
      return false;
    }
    
    return true;
  });
  
  displayFeedback(filteredFeedback);
}

function refreshFeedback() {
  const loading = document.getElementById('feedbackLoading');
  const tableWrapper = document.querySelector('.feedback-table .table-wrapper');
  
  loading.style.display = 'block';
  tableWrapper.style.display = 'none';
  
  loadFeedback();
  loadFeedbackStats();
}

function exportFeedbackCSV() {
  showInfo('Generating CSV file...');
  window.location.href = '/api/admin/export/feedback-csv';
  setTimeout(() => showSuccess('✓ CSV export started!'), 500);
}

function exportFeedbackJSON() {
  showInfo('Generating JSON file...');
  window.location.href = '/api/admin/export/feedback-json';
  setTimeout(() => showSuccess('✓ JSON export started!'), 500);
}

// ===== NOTIFICATION FUNCTIONS =====

function showNotification(message, type = 'info') {
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    info: '#3b82f6',
    warning: '#f59e0b'
  };
  
  const div = document.createElement('div');
  div.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colors[type]};
    color: white;
    padding: 15px 20px;
    border-radius: 12px;
    box-shadow: 0 8px 16px rgba(0,0,0,0.2);
    z-index: 10000;
    font-weight: 500;
    animation: slideIn 0.3s ease;
    max-width: 400px;
  `;
  div.textContent = message;
  document.body.appendChild(div);
  
  setTimeout(() => {
    div.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => div.remove(), 300);
  }, 3000);
}

function showSuccess(message) { showNotification(message, 'success'); }
function showError(message) { showNotification(message, 'error'); }
function showInfo(message) { showNotification(message, 'info'); }
function showWarning(message) { showNotification(message, 'warning'); }

// Add animation styles
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
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);