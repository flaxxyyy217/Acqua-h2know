let allUsers = [];

    // Load users on page load
    document.addEventListener('DOMContentLoaded', function() {
      loadUsers();
      
      // Add search event listener
      const searchInput = document.getElementById('searchInput');
      searchInput.addEventListener('input', searchUsers);
      searchInput.addEventListener('keyup', searchUsers);
    });

    // Load all users
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

    // Display users in table
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
                <th>Last Result</th>
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
        const lastResult = totalTests > 0 ? user.hydrationResults[totalTests - 1] : 'N/A';
        
        html += `
          <tr>
            <td><strong>${index + 1}</strong></td>
            <td>${escapeHtml(user.fullName)}</td>
            <td>${escapeHtml(user.email)}</td>
            <td>${joinDate}</td>
            <td>${totalTests}</td>
            <td>${lastResult}</td>
            <td><span class="status-badge status-active">Active</span></td>
            <td>
              <button 
                class="action-btn" 
                onclick="resetPassword('${user._id}', '${escapeHtml(user.email)}')"
                title="Reset Password"
              >
                🔑 Reset
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

    // Escape HTML to prevent XSS
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

    // Update statistics
    function updateStats(users) {
      document.getElementById('totalUsers').textContent = users.length;
      
      // Calculate new users in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const newUsers = users.filter(user => 
        new Date(user.createdAt) > sevenDaysAgo
      ).length;
      
      document.getElementById('newUsers').textContent = newUsers;
      
      // Total tests
      const totalTests = users.reduce((sum, user) => 
        sum + (user.hydrationResults?.length || 0), 0
      );
      document.getElementById('totalTests').textContent = totalTests;
      
      // Average hydration (placeholder)
      document.getElementById('avgHydration').textContent = 'N/A';
    }

    // Search users
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

    // Reset password
    async function resetPassword(userId, email) {
      const confirmed = confirm(`Reset password for:\n${email}\n\nThis will generate a new temporary password.`);
      
      if (!confirmed) return;

      const tempPassword = 'temp' + Math.random().toString(36).substring(2, 10);

      try {
        const response = await fetch('/api/admin/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            userId, 
            newPassword: tempPassword 
          })
        });

        const data = await response.json();

        if (data.success) {
          const message = `✅ Password Reset Successful!\n\nEmail: ${email}\nTemporary Password: ${data.tempPassword}\n\n⚠️ IMPORTANT:\n• Save this password securely\n• Share it with the user privately\n• User should change it after first login\n• This password will only be shown once`;
          
          alert(message);
          
          // Copy to clipboard
          if (navigator.clipboard) {
            navigator.clipboard.writeText(data.tempPassword).then(() => {
              showSuccess('✓ Temporary password copied to clipboard!');
            }).catch(() => {
              showSuccess('✓ Password reset successful!');
            });
          } else {
            showSuccess('✓ Password reset successful!');
          }
        } else {
          showError(data.message || 'Password reset failed');
        }
      } catch (error) {
        console.error('Reset error:', error);
        showError('Failed to reset password. Please try again.');
      }
    }

    // Export to CSV
    async function exportCSV() {
      try {
        showInfo('Generating CSV file...');
        
        const response = await fetch('/api/admin/export/csv');
        
        if (!response.ok) {
          throw new Error('Export failed');
        }
        
        const blob = await response.blob();
        
        // Create download link
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

    // Export to JSON
    async function exportJSON() {
      try {
        showInfo('Generating JSON file...');
        
        const response = await fetch('/api/admin/export/json');
        const data = await response.json();
        
        // Create download link
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

    // Show notifications
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