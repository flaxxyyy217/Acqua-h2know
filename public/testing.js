// Timer variables
let timerInterval;
let startTime;
let elapsedSeconds = 0;
let isFirstTest = true;

// Initialize timer on page load
async function initializeTimer() {
  try {
    const response = await fetch('/api/user/timer-status');
    const data = await response.json();
    
    if (data.success && data.needsTimer) {
      isFirstTest = true;
      startTime = new Date(data.accountCreatedAt).getTime();
      
      // Show timer
      document.getElementById('timerDisplay').style.display = 'block';
      
      // Start counting
      startTimer();
    } else {
      isFirstTest = false;
      document.getElementById('timerDisplay').style.display = 'none';
    }
  } catch (error) {
    console.error('Error checking timer status:', error);
  }
}

function startTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(updateTimerDisplay, 1000);
}

function updateTimerDisplay() {
  const now = Date.now();
  elapsedSeconds = Math.floor((now - startTime) / 1000);
  
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  
  const timerElement = document.getElementById('timerValue');
  if (timerElement) {
    timerElement.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  // Hide timer with fade out
  const timerDisplay = document.getElementById('timerDisplay');
  if (timerDisplay) {
    timerDisplay.style.animation = 'fadeOut 0.5s ease';
    setTimeout(() => {
      timerDisplay.style.display = 'none';
    }, 500);
  }
}

// Bluetooth connection
let bluetoothDevice;
let characteristic;

async function connectBluetooth() {
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const connectBtn = document.getElementById('connectBtn');
  
  try {
    statusText.textContent = 'Connecting...';
    statusIndicator.querySelector('.status-dot').className = 'status-dot connecting';
    connectBtn.disabled = true;
    
    // Request Bluetooth device
    bluetoothDevice = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['battery_service'] }],
      optionalServices: ['battery_service']
    });
    
    const server = await bluetoothDevice.gatt.connect();
    const service = await server.getPrimaryService('battery_service');
    characteristic = await service.getCharacteristic('battery_level');
    
    // Connected
    statusText.textContent = 'Connected';
    statusIndicator.querySelector('.status-dot').className = 'status-dot connected';
    connectBtn.textContent = 'Disconnect';
    connectBtn.disabled = false;
    connectBtn.onclick = disconnectBluetooth;
    
    // Show device data
    document.getElementById('deviceData').style.display = 'block';
    
    // Start reading data
    startDataPolling();
    
  } catch (error) {
    console.error('Bluetooth connection error:', error);
    statusText.textContent = 'Connection Failed';
    statusIndicator.querySelector('.status-dot').className = 'status-dot disconnected';
    connectBtn.disabled = false;
    alert('Failed to connect to device. Please try again.');
  }
}

function disconnectBluetooth() {
  if (bluetoothDevice && bluetoothDevice.gatt.connected) {
    bluetoothDevice.gatt.disconnect();
  }
  
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const connectBtn = document.getElementById('connectBtn');
  
  statusText.textContent = 'Disconnected';
  statusIndicator.querySelector('.status-dot').className = 'status-dot disconnected';
  connectBtn.textContent = 'Connect Device';
  connectBtn.onclick = connectBluetooth;
  
  document.getElementById('deviceData').style.display = 'none';
  stopDataPolling();
}

// Data polling
let dataPollingInterval;

function startDataPolling() {
  dataPollingInterval = setInterval(async () => {
    if (characteristic) {
      try {
        const value = await characteristic.readValue();
        updateDeviceData(value.getUint8(0));
      } catch (error) {
        console.error('Error reading data:', error);
      }
    }
  }, 2000);
}

function stopDataPolling() {
  if (dataPollingInterval) {
    clearInterval(dataPollingInterval);
  }
}

// Simulate data (for demo without actual device)
function simulateTest() {
  const randomData = {
    color: Math.floor(Math.random() * 8) + 1,
    frequency: Math.floor(Math.random() * 10) + 1,
    volume: Math.floor(Math.random() * 500) + 100
  };
  
  updateDeviceData(randomData.color);
  analyzeHydration(randomData);
}

function updateDeviceData(colorValue) {
  document.getElementById('colorValue').textContent = colorValue;
  document.getElementById('frequencyValue').textContent = Math.floor(Math.random() * 10) + ' times/day';
  document.getElementById('volumeValue').textContent = Math.floor(Math.random() * 500) + 100 + ' ml';
}

async function analyzeHydration(data) {
  const indicator = document.getElementById('indicator');
  const result = document.getElementById('result');
  const statusTitle = document.getElementById('statusTitle');
  const statusMessage = document.getElementById('statusMessage');
  
  let level, percentage, message;
  
  if (data.color <= 2) {
    level = 'Severely Dehydrated';
    percentage = 15;
    message = '🚨 Critical! You are severely dehydrated. Drink water immediately and consult a healthcare professional.';
  } else if (data.color <= 4) {
    level = 'Dehydrated';
    percentage = 35;
    message = '⚠️ You are dehydrated. Increase your water intake significantly.';
  } else if (data.color <= 6) {
    level = 'Slightly Dehydrated';
    percentage = 60;
    message = '💧 Your hydration is below optimal. Try to drink more water throughout the day.';
  } else {
    level = 'Well Hydrated';
    percentage = 85;
    message = '✅ Excellent! You are well hydrated. Keep up the good work!';
  }
  
  indicator.style.left = percentage + '%';
  statusTitle.textContent = level;
  statusMessage.textContent = message;
  result.classList.add('show');
  
  // Show rating system after test
  setTimeout(() => {
    document.getElementById('ratingContainer').classList.add('show');
  }, 1000);
  
  // Save to database
  try {
    const response = await fetch('/api/hydration/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hydrationLevel: level,
        sensorReading: data.color,
        notes: `Frequency: ${data.frequency}, Volume: ${data.volume}ml`,
        elapsedTime: isFirstTest ? elapsedSeconds : null
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Test saved successfully');
      
      // Store test ID for rating
      currentTestId = result.testId;
      
      // If this was the first test, stop timer and show completion
      if (result.isFirstTest) {
        stopTimer();
        isFirstTest = false;
        
        const formattedTime = formatTime(result.timeToFirstTest);
        showMessage(`🎉 First test completed in ${formattedTime}!`, 'success');
      }
      
      updateChart(level);
      
      // Show survey email notification
      showMessage('📧 Check your email for a post-test survey!', 'info');
    }
  } catch (error) {
    console.error('Error saving test:', error);
  }
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// Chart setup
let hydrationChart;

function initChart() {
  const ctx = document.getElementById('hydrationChart');
  if (!ctx) return;
  
  hydrationChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Hydration Level',
        data: [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        x: {
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      }
    }
  });
}

function updateChart(level) {
  if (!hydrationChart) return;
  
  const now = new Date();
  const timeLabel = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  const levelValues = {
    'Well Hydrated': 90,
    'Slightly Dehydrated': 60,
    'Dehydrated': 35,
    'Severely Dehydrated': 15
  };
  
  hydrationChart.data.labels.push(timeLabel);
  hydrationChart.data.datasets[0].data.push(levelValues[level]);
  
  if (hydrationChart.data.labels.length > 10) {
    hydrationChart.data.labels.shift();
    hydrationChart.data.datasets[0].data.shift();
  }
  
  hydrationChart.update();
}

// Load Chart.js
function loadChartJS() {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
  script.onload = initChart;
  document.head.appendChild(script);
}

// Message display
function showMessage(message, type = 'info') {
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
    background: ${colors[type] || colors.info};
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

// Add demo test button
function addDemoButton() {
  const connectBtn = document.getElementById('connectBtn');
  const demoBtn = document.createElement('button');
  demoBtn.className = 'btn-test';
  demoBtn.textContent = 'Simulate Test (Demo)';
  demoBtn.style.marginTop = '10px';
  demoBtn.onclick = simulateTest;
  connectBtn.parentNode.insertBefore(demoBtn, connectBtn.nextSibling);
}

// Initialize everything
document.addEventListener('DOMContentLoaded', function() {
  loadChartJS();
  addDemoButton();
  initializeTimer();
  
  // Load logout handler
  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      
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
          window.location.href = data.redirectUrl;
        }
      } catch (error) {
        console.error('Error:', error);
        window.location.href = '/';
      }
    });
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  stopTimer();
  if (bluetoothDevice && bluetoothDevice.gatt.connected) {
    bluetoothDevice.gatt.disconnect();
  }
});

// Rating System
let selectedRating = 0;
let currentTestId = null;

function selectRating(rating) {
  selectedRating = rating;
  
  // Remove selected class from all stars
  document.querySelectorAll('.star-rating').forEach(star => {
    star.classList.remove('selected');
  });
  
  // Add selected class to clicked star
  document.querySelector(`[data-rating="${rating}"]`).classList.add('selected');
  
  // Show feedback
  const feedback = document.getElementById('ratingFeedback');
  const feedbackTitle = document.getElementById('feedbackTitle');
  const feedbackMessage = document.getElementById('feedbackMessage');
  
  const feedbackMessages = {
    1: {
      title: 'We\'re Sorry! 😔',
      message: 'We apologize for the poor experience. Your feedback helps us improve.'
    },
    2: {
      title: 'We Can Do Better 😕',
      message: 'Thank you for your honest feedback. We\'ll work on improving.'
    },
    3: {
      title: 'Thanks for Your Feedback 😐',
      message: 'We appreciate your input and will strive to do better.'
    },
    4: {
      title: 'Great to Hear! 😊',
      message: 'We\'re glad you had a positive experience with ACQUA.'
    },
    5: {
      title: 'Excellent! 🎉',
      message: 'We\'re thrilled you\'re satisfied with your hydration test!'
    },
    6: {
      title: 'Outstanding! 🌟',
      message: 'Thank you! We\'re delighted to provide you with excellent service!'
    }
  };
  
  feedbackTitle.textContent = feedbackMessages[rating].title;
  feedbackMessage.textContent = feedbackMessages[rating].message;
  feedback.classList.add('show');
  
  // Enable submit button
  document.getElementById('submitRating').disabled = false;
}

async function submitRating() {
  if (selectedRating === 0) {
    showMessage('Please select a rating first', 'error');
    return;
  }
  
  const comment = document.getElementById('ratingComment').value.trim();
  const submitBtn = document.getElementById('submitRating');
  
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';
  
  try {
    const response = await fetch('/api/hydration/rating', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rating: selectedRating,
        comment: comment,
        testId: currentTestId
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Show success message
      document.getElementById('ratingSuccess').classList.add('show');
      
      // Hide rating interface
      setTimeout(() => {
        document.getElementById('ratingContainer').style.display = 'none';
      }, 2000);
      
      showMessage('Thank you for your feedback! 🙏', 'success');
    } else {
      showMessage('Failed to submit rating. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Feedback';
    }
  } catch (error) {
    console.error('Error submitting rating:', error);
    showMessage('Network error. Please try again.', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Feedback';
  }
}