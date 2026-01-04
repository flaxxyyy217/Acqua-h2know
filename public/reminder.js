 function loadSettings() {
      const settings = JSON.parse(localStorage.getItem('reminderSettings')) || {
        enabled: true,
        interval: 60,
        startTime: '08:00',
        endTime: '22:00',
        sound: true
      };

      document.getElementById('enableReminders').checked = settings.enabled;
      document.getElementById('reminderInterval').value = settings.interval;
      document.getElementById('startTime').value = settings.startTime;
      document.getElementById('endTime').value = settings.endTime;
      document.getElementById('enableSound').checked = settings.sound;

      updateStatus();
    }

    // Save settings
    document.getElementById('saveSettings').addEventListener('click', function() {
      const settings = {
        enabled: document.getElementById('enableReminders').checked,
        interval: parseInt(document.getElementById('reminderInterval').value),
        startTime: document.getElementById('startTime').value,
        endTime: document.getElementById('endTime').value,
        sound: document.getElementById('enableSound').checked
      };

      localStorage.setItem('reminderSettings', JSON.stringify(settings));
      
      // Show success message
      const btn = this;
      const originalText = btn.textContent;
      btn.textContent = '✓ Saved!';
      btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = 'linear-gradient(135deg, #3b82f6, #0ea5e9)';
      }, 2000);

      updateStatus();
      scheduleReminders();
    });

    // Update status display
    function updateStatus() {
      const enabled = document.getElementById('enableReminders').checked;
      const statusEl = document.getElementById('notificationStatus');
      
      if (enabled) {
        statusEl.classList.remove('disabled');
        statusEl.innerHTML = '<span class="status-icon">✅</span><span class="status-text">Reminders are active</span>';
      } else {
        statusEl.classList.add('disabled');
        statusEl.innerHTML = '<span class="status-icon">⏸️</span><span class="status-text">Reminders are paused</span>';
      }
    }

    // Enable reminders toggle
    document.getElementById('enableReminders').addEventListener('change', updateStatus);

    // Request notification permission
    document.getElementById('requestPermission').addEventListener('click', async function() {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        updatePermissionStatus();
        
        if (permission === 'granted') {
          new Notification('ACQUA Notifications Enabled! 💧', {
            body: 'You will now receive hydration reminders.',
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="75" font-size="75">💧</text></svg>'
          });
        }
      }
    });

    // Update permission status
    function updatePermissionStatus() {
      const statusEl = document.getElementById('permissionStatus');
      const btn = document.getElementById('requestPermission');
      
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          statusEl.textContent = 'Notifications enabled ✓';
          btn.style.display = 'none';
        } else if (Notification.permission === 'denied') {
          statusEl.textContent = 'Notifications blocked. Enable in browser settings.';
          btn.style.display = 'none';
        } else {
          statusEl.textContent = 'Click to enable notifications';
          btn.style.display = 'block';
        }
      } else {
        statusEl.textContent = 'Browser does not support notifications';
        btn.style.display = 'none';
      }
    }

    // Schedule reminders
    let reminderInterval;
    function scheduleReminders() {
      if (reminderInterval) {
        clearInterval(reminderInterval);
      }

      const settings = JSON.parse(localStorage.getItem('reminderSettings'));
      if (!settings || !settings.enabled) return;

      function isWithinActiveHours() {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        const [startHour, startMin] = settings.startTime.split(':').map(Number);
        const [endHour, endMin] = settings.endTime.split(':').map(Number);
        
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        
        return currentTime >= startMinutes && currentTime <= endMinutes;
      }

      function sendReminder() {
        if (!isWithinActiveHours()) return;

        if (Notification.permission === 'granted') {
          new Notification('Time to Hydrate! 💧', {
            body: 'Remember to drink water and stay hydrated!',
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="75" font-size="75">💧</text></svg>'
          });

          if (settings.sound) {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZQQ0PVqvl8LFiHAU2jdXzzn0pBSd9zfDZljcIDlem5PGsWBEMQ5zd8b1pHwU4k9n0yHgmBSd8zfPbljcIDle15vKuXBAORZ7e8rtsIAU3k9n10YE0Bg9Pp+b0uGEbBTiS2fTMfywGIXPG8diFOwcNUKzm8rVoGQQ1jtj20IQ3CAoRZ7bt8pxKCwpHn+Hxu2QaBTKI0PPShDUGHW/A7+eYPgsQWq/o8LFgGwQ1i9f0zn0qBSZ8zfPblzgICVen5fGwYBwFNIzW8851KQUogc3w3JU3CQhVqOXxrmAdBTOMz/PQfysFKH7M8d2WNggKVKjm8a5gHQU0jM7z0H8rBSh+zPHdljYIDlSo5vGuYBwFM4zP89B/KwUofszy3ZY2CApUqObxrmAdBTOMzvPQfysFKH7M8d2WNggKVKjm8a5gHQUzjM/z0H8rBSh+zPHdljYICVOo5vGuYB0FM4zP89B/KwUofszy3ZY2CQhUqebxrmAdBTOMz/PQfysFKH7M8tyWNwgJVKnm8a5fHQYzjM/z0H8rBSh+zPLdljYJCFSp5vKuYBwFM4zP89B/KwUofszy3ZY2CQhUqebxrmAdBTOMz/PQfysFKH7M8tyWNwgJVKnm8a5fHQYzjM/z0H8rBSh+zPLdljYJCVSp5vKuYBwFMozP89B/KwUofszy3ZY2CQhUqebxrmAdBTOMz/PQfysFKH7M8t2WNggKVKjl8a9gGwUzjM/z0H8rBSh+zPLdljYJCVSp5vKuYBwFMozP89B/KwUofszy3ZY2CQhUqebxrmAdBTOMz/PQfysFKH7M8tyWNwgJVKnm8a5fHQYzjM/z0H8rBSh+zPLdljYJCVSp5vKuYBwFMozP89B/KwUofszy3ZY2CQhUqebxrmAdBTOMz/PQfysFKH7M8tyWNwgJVKnm8a5fHQYzjM/z0H8rBSh+zPLdljYJCVSp5vKuYBwFMozP89B/KwUofszy3ZY2CQhUqebxrmAdBTOMz/PQfysFKH7M8t2WNggKVKjl8a9gGwUzjM/z0H8rBSh+zPLdljYJCVSp5vKuYBwFMozP89B/KwUo');
            audio.play().catch(e => console.log('Audio play failed:', e));
          }
        }
      }

      reminderInterval = setInterval(sendReminder, settings.interval * 60 * 1000);
    }

    // Initialize
    loadSettings();
    updatePermissionStatus();
    scheduleReminders();