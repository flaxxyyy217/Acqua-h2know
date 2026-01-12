// ============================================
// BLUETOOTH CONFIGURATION
// ============================================

const BLUETOOTH_CONFIG = {
  SERVICE_UUID: '4FAFC201-1FB5-459E-8FCC-C5C9C331914B',
  CHARACTERISTIC_UUID: 'BEB5483E-36E1-4688-B7F5-EA07361B26A8',
  DEVICE_NAME_PREFIX: 'ESP32'
};

let bluetoothDevice = null;
let bluetoothCharacteristic = null;
let lastTestId = null;
let timerStartTime = null;
let timerInterval = null;
let selectedRating = 0;

// ============================================
// TIMER FUNCTIONS (for first test tracking)
// ============================================

async function checkTimerStatus() {
  try {
    const response = await fetch('/api/user/timer-status', {
      credentials: 'include'
    });
    const data = await response.json();

    if (data.success && data.needsTimer) {
      document.getElementById('timerDisplay').style.display = 'block';
      timerStartTime = new Date(data.accountCreatedAt);
      startTimer();
    } else {
      document.getElementById('timerDisplay').style.display = 'none';
    }
  } catch (error) {
    console.error('Error checking timer status:', error);
  }
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    const now = new Date();
    const elapsed = Math.floor((now - timerStartTime) / 1000);

    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;

    const display = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById('timerValue').textContent = display;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  const timerDisplay = document.getElementById('timerDisplay');
  if (timerDisplay) {
    timerDisplay.style.animation = 'fadeOut 0.5s ease';
    setTimeout(() => {
      timerDisplay.style.display = 'none';
    }, 500);
  }
}

function getElapsedTime() {
  if (!timerStartTime) return null;
  const now = new Date();
  return Math.floor((now - timerStartTime) / 1000);
}

// ============================================
// BLUETOOTH CONNECTION FUNCTIONS
// ============================================

async function connectBluetooth() {
  try {
    console.log('🔵 Requesting Bluetooth device...');
    updateStatus('connecting', 'Searching for ESP32...');

    if (!navigator.bluetooth) {
      alert('❌ Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera.');
      updateStatus('disconnected', 'Bluetooth not supported');
      return;
    }

    bluetoothDevice = await navigator.bluetooth.requestDevice({
      filters: [
        { namePrefix: BLUETOOTH_CONFIG.DEVICE_NAME_PREFIX }
      ],
      optionalServices: [BLUETOOTH_CONFIG.SERVICE_UUID]
    });

    console.log('✅ Device selected:', bluetoothDevice.name);
    updateStatus('connecting', `Connecting to ${bluetoothDevice.name}...`);

    bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);

    const server = await bluetoothDevice.gatt.connect();
    console.log('✅ Connected to GATT server');

    const service = await server.getPrimaryService(BLUETOOTH_CONFIG.SERVICE_UUID);
    console.log('✅ Service found');

    bluetoothCharacteristic = await service.getCharacteristic(BLUETOOTH_CONFIG.CHARACTERISTIC_UUID);
    console.log('✅ Characteristic found');

    await bluetoothCharacteristic.startNotifications();
    bluetoothCharacteristic.addEventListener('characteristicvaluechanged', handleDataReceived);

    updateStatus('connected', `Connected to ${bluetoothDevice.name}`);
    document.getElementById('deviceData').style.display = 'block';
    document.getElementById('connectBtn').textContent = 'Disconnect Device';
    document.getElementById('connectBtn').onclick = disconnectBluetooth;

    console.log('✅ Ready to receive data');

  } catch (error) {
    console.error('Bluetooth connection error:', error);
    
    let errorMessage = 'Connection failed';
    if (error.name === 'NotFoundError') {
      errorMessage = 'No ESP32 device found';
    } else if (error.name === 'SecurityError') {
      errorMessage = 'Bluetooth access denied';
    } else if (error.message) {
      errorMessage = error.message;
    }

    alert(`❌ ${errorMessage}\n\nMake sure:\n• ESP32 is powered on\n• Bluetooth is enabled\n• You're using Chrome/Edge`);
    updateStatus('disconnected', errorMessage);
  }
}

function disconnectBluetooth() {
  if (bluetoothDevice && bluetoothDevice.gatt.connected) {
    bluetoothDevice.gatt.disconnect();
    console.log('🔴 Disconnected from device');
  }
  resetBluetoothUI();
}

function onDisconnected() {
  console.log('🔴 Device disconnected');
  resetBluetoothUI();
  alert('⚠️ Device disconnected. Please reconnect to continue testing.');
}



function resetBluetoothUI() {
  updateStatus('disconnected', 'Disconnected');
  document.getElementById('deviceData').style.display = 'none';
  document.getElementById('connectBtn').textContent = 'Connect Device';
  document.getElementById('connectBtn').onclick = connectBluetooth;
  
  document.getElementById('colorValue').textContent = '--';
  document.getElementById('frequencyValue').textContent = '--';
  document.getElementById('volumeValue').textContent = '--';
  
  bluetoothDevice = null;
  bluetoothCharacteristic = null;
}

function updateStatus(status, message) {
  const indicator = document.querySelector('.status-dot');
  const statusText = document.getElementById('statusText');

  indicator.className = 'status-dot ' + status;
  statusText.textContent = message;
}

const DEBUG = true;
if (DEBUG) {
  console.log('Raw BLE data:', decoder.decode(value));
  console.log('Buffer state:', dataBuffer);
}

// ============================================
// DATA HANDLING
// ============================================

async function handleDataReceived(event) {
  try {
    const value = event.target.value;
    const decoder = new TextDecoder('utf-8');
    let dataBuffer = '';
    function handleDataReceived(event) {
    const value = event.target.value;
    const decoder = new TextDecoder('utf-8');
    dataBuffer += decoder.decode(value);

    const lastDataTime = Date.now();
setInterval(() => {
  if (Date.now() - lastDataTime > 5000) {
    updateStatus('warning', 'No data for 5 seconds');
  }
}, 1000);
  
  // Try to parse when we have complete JSON
  if (dataBuffer.includes('}')) {
    try {
      const data = JSON.parse(dataBuffer);
      processData(data);
      dataBuffer = ''; // Clear buffer
    } catch (e) {
      // Wait for more data
    }
  }
}

// Add timeout
const connectWithTimeout = (promise, ms) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), ms)
    )
  ]);
};

// Usage
const server = await connectWithTimeout(
  bluetoothDevice.gatt.connect(),
  10000 // 10 second timeout
);

    document.getElementById('colorValue').textContent = data.color || '--';
    document.getElementById('frequencyValue').textContent = (data.frequency || '--') + ' times/day';
    document.getElementById('volumeValue').textContent = (data.volume || '--') + ' ml';

    const hydrationLevel = calculateHydrationLevel(data.color, data.frequency, data.volume);
    updateHydrationMeter(hydrationLevel);
    saveTestResult(data.color, data.frequency, data.volume, hydrationLevel);

  } catch (error) {
    console.error('Error parsing data:', error);
  }
}

function calculateHydrationLevel(color, frequency, volume) {
  let level = '';
  let percentage = 0;

  if (color < 200) {
    level = 'Well Hydrated';
    percentage = 90;
  } else if (color < 400) {
    level = 'Slightly Dehydrated';
    percentage = 60;
  } else if (color < 600) {
    level = 'Dehydrated';
    percentage = 30;
  } else {
    level = 'Severely Dehydrated';
    percentage = 10;
  }

  return { level, percentage, color, frequency, volume };
}

function updateHydrationMeter(data) {
  const indicator = document.getElementById('indicator');
  const result = document.getElementById('result');
  const statusTitle = document.getElementById('statusTitle');
  const statusMessage = document.getElementById('statusMessage');

  indicator.style.left = data.percentage + '%';

  statusTitle.textContent = data.level;

  const messages = {
    'Well Hydrated': 'Great job! You are properly hydrated. Keep up the good water intake!',
    'Slightly Dehydrated': 'You could use more water. Try to drink 2-3 glasses in the next hour.',
    'Dehydrated': 'Warning: You need to hydrate soon. Drink water immediately.',
    'Severely Dehydrated': 'Critical: Severe dehydration detected. Drink water urgently and rest.'
  };

  statusMessage.textContent = messages[data.level] || 'Test complete';

  result.className = 'result-display show';
  showRatingSystem(data.level);
}

// ============================================
// SAVE TEST RESULT TO DATABASE
// ============================================

async function saveTestResult(sensorReading, frequency, volume, hydrationData) {
  try {
    const elapsedTime = getElapsedTime();

    const response = await fetch('/api/hydration/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        hydrationLevel: hydrationData.level,
        sensorReading: sensorReading,
        notes: `Color: ${sensorReading}, Frequency: ${frequency}, Volume: ${volume}ml`,
        elapsedTime: elapsedTime
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Test result saved to database');
      lastTestId = data.testId;

      if (data.isFirstTest) {
        stopTimer();
        console.log('🎉 First test completed!');
        showMessage('🎉 First test completed!', 'success');
      }

      loadHydrationHistory();
    } else {
      console.error('Failed to save test:', data.message);
    }

  } catch (error) {
    console.error('Error saving test result:', error);
  }
}

// ============================================
// RATING SYSTEM
// ============================================

function showRatingSystem(hydrationLevel) {
  const ratingContainer = document.getElementById('ratingContainer');
  ratingContainer.style.display = 'block';
  ratingContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function selectRating(rating) {
  selectedRating = rating;

  const stars = document.querySelectorAll('.star-rating');
  stars.forEach((star, index) => {
    if (index < rating) {
      star.classList.add('selected');
    } else {
      star.classList.remove('selected');
    }
  });

  const feedbackTitle = document.getElementById('feedbackTitle');
  const feedbackMessage = document.getElementById('feedbackMessage');
  const feedback = document.getElementById('ratingFeedback');

  const feedbackMessages = {
    1: { title: 'We\'re Sorry', message: 'We apologize for your experience. Please tell us how we can improve.' },
    2: { title: 'We Can Do Better', message: 'Thank you for your honest feedback. What went wrong?' },
    3: { title: 'Thank You', message: 'We appreciate your feedback. How can we improve?' },
    4: { title: 'Great!', message: 'We\'re glad you had a good experience!' },
    5: { title: 'Excellent!', message: 'Thank you! We\'re happy you\'re satisfied with the test.' },
    6: { title: 'Amazing!', message: 'Wow! Thank you for the exceptional rating!' }
  };

  feedbackTitle.textContent = feedbackMessages[rating].title;
  feedbackMessage.textContent = feedbackMessages[rating].message;
  feedback.style.display = 'block';

  document.getElementById('submitRating').disabled = false;
}

async function submitRating() {
  if (selectedRating === 0) {
    alert('Please select a rating first');
    return;
  }

  const comment = document.getElementById('ratingComment').value.trim();

  try {
    const response = await fetch('/api/hydration/rating', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        rating: selectedRating,
        comment: comment,
        testId: lastTestId
      })
    });

    const data = await response.json();

    if (data.success) {
      document.getElementById('ratingSuccess').style.display = 'block';
      
      document.querySelectorAll('.star-rating').forEach(star => {
        star.style.pointerEvents = 'none';
        star.style.opacity = '0.6';
      });
      
      document.getElementById('submitRating').disabled = true;
      document.getElementById('ratingComment').disabled = true;

      console.log('✅ Rating submitted successfully');
      showMessage('✅ Thank you for your feedback!', 'success');
    } else {
      alert('Failed to submit rating: ' + data.message);
    }

  } catch (error) {
    console.error('Error submitting rating:', error);
    alert('Failed to submit rating. Please try again.');
  }
}

// ============================================
// HYDRATION HISTORY CHART
// ============================================

async function loadHydrationHistory() {
  try {
    const response = await fetch('/api/hydration/history', {
      credentials: 'include'
    });
    const data = await response.json();

    if (data.success && data.tests.length > 0) {
      displayChart(data.tests);
    }

  } catch (error) {
    console.error('Error loading history:', error);
  }
}

function displayChart(tests) {
  const canvas = document.getElementById('hydrationChart');
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const maxTests = Math.min(tests.length, 10);
  const barWidth = canvas.width / maxTests;
  
  tests.slice(0, maxTests).reverse().forEach((test, index) => {
    const height = getHeightForLevel(test.hydrationLevel);
    const x = index * barWidth;
    const y = canvas.height - height;
    
    ctx.fillStyle = getColorForLevel(test.hydrationLevel);
    ctx.fillRect(x + 5, y, barWidth - 10, height);
  });
}

function getHeightForLevel(level) {
  const heights = {
    'Well Hydrated': 200,
    'Slightly Dehydrated': 150,
    'Dehydrated': 100,
    'Severely Dehydrated': 50
  };
  return heights[level] || 100;
}

function getColorForLevel(level) {
  const colors = {
    'Well Hydrated': '#10b981',
    'Slightly Dehydrated': '#f59e0b',
    'Dehydrated': '#ef4444',
    'Severely Dehydrated': '#991b1b'
  };
  return colors[level] || '#6b7280';
}

// ============================================
// NOTIFICATIONS
// ============================================

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
    font-weight: 600;
  `;
  alertDiv.textContent = message;
  document.body.appendChild(alertDiv);

  setTimeout(() => {
    alertDiv.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => alertDiv.remove(), 300);
  }, 4000);
}

// ============================================
// LOGOUT FUNCTION
// ============================================

document.getElementById('logout')?.addEventListener('click', async (e) => {
  e.preventDefault();
  
  try {
    const response = await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (data.success) {
      window.location.href = '/';
    }
  } catch (error) {
    console.error('Logout error:', error);
    window.location.href = '/';
  }
});

// ============================================
// INITIALIZE ON PAGE LOAD
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Testing page initialized');
  
  checkTimerStatus();
  loadHydrationHistory();
  
  document.getElementById('ratingContainer').style.display = 'none';
  document.getElementById('ratingSuccess').style.display = 'none';
});

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