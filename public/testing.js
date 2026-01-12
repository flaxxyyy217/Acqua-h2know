const BLUETOOTH_CONFIG = {
  SERVICE_UUID: '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
  CHARACTERISTIC_UUID: 'beb5483e-36e1-4688-b7f5-ea07361b26a8',
  DEVICE_NAME_PREFIX: 'Acqua_ESP32',
  HEARTBEAT_INTERVAL: 30000 // 30 seconds
};

let bluetoothDevice = null;
let bluetoothCharacteristic = null;
let currentSessionId = null;
let heartbeatInterval = null;
let dataBuffer = '';

// ============================================
// BLUETOOTH CONNECTION WITH BACKEND SYNC
// ============================================

async function connectBluetooth() {
  try {
    console.log('🔵 Requesting Bluetooth device...');
    updateStatus('connecting', 'Searching for Acqua device...');

    if (!navigator.bluetooth) {
      alert('❌ Web Bluetooth not supported. Please use Chrome, Edge, or Opera.');
      updateStatus('disconnected', 'Bluetooth not supported');
      return;
    }

    // Step 1: Request BLE device from browser
    bluetoothDevice = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: BLUETOOTH_CONFIG.DEVICE_NAME_PREFIX }],
      optionalServices: [BLUETOOTH_CONFIG.SERVICE_UUID]
    });

    console.log('✅ Device selected:', bluetoothDevice.name);
    updateStatus('connecting', `Connecting to ${bluetoothDevice.name}...`);

    bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);

    // Step 2: Connect to GATT server
    const server = await connectWithTimeout(
      bluetoothDevice.gatt.connect(),
      10000
    );
    console.log('✅ Connected to GATT server');

    const service = await server.getPrimaryService(BLUETOOTH_CONFIG.SERVICE_UUID);
    const characteristic = await service.getCharacteristic(BLUETOOTH_CONFIG.CHARACTERISTIC_UUID);
    
    bluetoothCharacteristic = characteristic;
    
    await bluetoothCharacteristic.startNotifications();
    bluetoothCharacteristic.addEventListener('characteristicvaluechanged', handleDataReceived);

    console.log('✅ BLE notifications enabled');

    // Step 3: Register session with backend
    const sessionCreated = await startBackendSession(bluetoothDevice.name, bluetoothDevice.id);
    
    if (!sessionCreated) {
      throw new Error('Failed to register session with backend');
    }

    // Step 4: Start heartbeat
    startHeartbeat();

    updateStatus('connected', `Connected to ${bluetoothDevice.name}`);
    document.getElementById('deviceData').style.display = 'block';
    document.getElementById('connectBtn').textContent = 'Disconnect Device';
    document.getElementById('connectBtn').onclick = disconnectBluetooth;

    console.log('✅ Ready to receive data');
    showMessage('✅ Connected successfully!', 'success');

  } catch (error) {
    console.error('Bluetooth connection error:', error);
    
    let errorMessage = 'Connection failed';
    if (error.name === 'NotFoundError') {
      errorMessage = 'No Acqua device found';
    } else if (error.name === 'SecurityError') {
      errorMessage = 'Bluetooth access denied';
    } else if (error.message === 'Connection timeout') {
      errorMessage = 'Connection timeout - device not responding';
    } else if (error.message) {
      errorMessage = error.message;
    }

    alert(`❌ ${errorMessage}\n\nMake sure:\n• Arduino is powered on\n• Bluetooth is enabled\n• You're using Chrome/Edge\n• Device is within 2 meters`);
    updateStatus('disconnected', errorMessage);
  }
}

// ============================================
// BACKEND SESSION MANAGEMENT
// ============================================

async function startBackendSession(deviceName, deviceId) {
  try {
    const response = await fetch('/api/ble/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        deviceName: deviceName,
        deviceId: deviceId || `ble_${Date.now()}`,
        browserInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform
        }
      })
    });

    const data = await response.json();

    if (data.success) {
      currentSessionId = data.session.id;
      console.log('✅ Backend session started:', currentSessionId);
      return true;
    } else {
      console.error('❌ Failed to start backend session:', data.message);
      return false;
    }

  } catch (error) {
    console.error('❌ Backend session error:', error);
    return false;
  }
}

async function endBackendSession(reason = 'user_initiated') {
  if (!currentSessionId) return;

  try {
    const response = await fetch('/api/ble/session/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        sessionId: currentSessionId,
        reason: reason
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Backend session ended:', data.stats);
    }

    currentSessionId = null;

  } catch (error) {
    console.error('❌ End session error:', error);
  }
}

function startHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);

  heartbeatInterval = setInterval(async () => {
    if (!currentSessionId) return;

    try {
      await fetch('/api/ble/session/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId: currentSessionId })
      });
      
      console.log('💓 Heartbeat sent');

    } catch (error) {
      console.warn('⚠️ Heartbeat failed:', error);
    }
  }, BLUETOOTH_CONFIG.HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log('🛑 Heartbeat stopped');
  }
}

// ============================================
// DISCONNECT HANDLING
// ============================================

async function disconnectBluetooth() {
  if (bluetoothDevice && bluetoothDevice.gatt.connected) {
    bluetoothDevice.gatt.disconnect();
    console.log('🔴 Disconnected from device');
  }
  
  await endBackendSession('user_initiated');
  stopHeartbeat();
  resetBluetoothUI();
  showMessage('Disconnected from device', 'info');
}

async function onDisconnected() {
  console.log('🔴 Device disconnected unexpectedly');
  
  await endBackendSession('device_disconnected');
  stopHeartbeat();
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
  dataBuffer = '';
}

// ============================================
// DATA HANDLING - SEND TO BACKEND
// ============================================

function handleDataReceived(event) {
  try {
    const value = event.target.value;
    const decoder = new TextDecoder('utf-8');
    const chunk = decoder.decode(value);
    
    dataBuffer += chunk;
    
    console.log('📥 Raw BLE chunk:', chunk);
    
    // Arduino sends: {"color":"Light Yellow","r":255,"g":255,"b":200,"sg":"1.020","ph":"6.5","status":"Normal"}
    if (dataBuffer.includes('}')) {
      try {
        const data = JSON.parse(dataBuffer);
        console.log('✅ Parsed Arduino data:', data);
        
        // Send to backend for processing
        sendDataToBackend(data);
        
        dataBuffer = '';
        
      } catch (parseError) {
        console.log('⏳ Waiting for more data... (incomplete JSON)');
      }
    }
  } catch (error) {
    console.error('Error in handleDataReceived:', error);
    dataBuffer = '';
  }
}

async function sendDataToBackend(arduinoData) {
  if (!currentSessionId) {
    console.error('❌ No active session - cannot send data');
    showMessage('❌ No active session', 'error');
    return;
  }

  try {
    console.log('📤 Sending data to backend...');

    const response = await fetch('/api/ble/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        sessionId: currentSessionId,
        sensorData: arduinoData,
        timestamp: new Date().toISOString()
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Backend processed data:', result.reading);
      
      // Update UI with backend-calculated results
      displayResults(result.reading);
      
      // Show first test notification
      if (result.test.isFirstTest) {
        showMessage('🎉 First test completed!', 'success');
        if (typeof stopTimer === 'function') stopTimer();
      }

      // Show rating system
      showRatingSystem(result.reading.hydrationLevel);

    } else {
      console.error('❌ Backend rejected data:', result.message);
      showMessage('❌ Data processing failed', 'error');
    }

  } catch (error) {
    console.error('❌ Error sending to backend:', error);
    showMessage('❌ Failed to send data', 'error');
  }
}

// ============================================
// DISPLAY RESULTS FROM BACKEND
// ============================================

function displayResults(reading) {
  // Update UI with backend-calculated values
  const hydrationLevel = reading.hydrationLevel;
  const percentage = reading.percentage;

  document.getElementById('colorValue').textContent = reading.id ? 'Processed' : '--';
  document.getElementById('frequencyValue').textContent = 'See Results Below';
  document.getElementById('volumeValue').textContent = 'See Results Below';

  updateHydrationMeter({ level: hydrationLevel, percentage });
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
}

// ============================================
// RATING SYSTEM (KEPT FROM ORIGINAL)
// ============================================

function showRatingSystem(hydrationLevel) {
  const ratingContainer = document.getElementById('ratingContainer');
  if (ratingContainer) {
    ratingContainer.style.display = 'block';
    ratingContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// [Keep existing rating functions: selectRating, submitRating]

// ============================================
// UTILITY FUNCTIONS
// ============================================

const connectWithTimeout = (promise, ms) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), ms)
    )
  ]);
};

function updateStatus(status, message) {
  const indicator = document.querySelector('.status-dot');
  const statusText = document.getElementById('statusText');

  if (indicator) indicator.className = 'status-dot ' + status;
  if (statusText) statusText.textContent = message;
}

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
// INITIALIZE
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Testing page initialized with backend integration');
  
  // Check for existing active session
  checkActiveSession();
  
  if (typeof checkTimerStatus === 'function') checkTimerStatus();
  if (typeof loadHydrationHistory === 'function') loadHydrationHistory();
});

async function checkActiveSession() {
  try {
    const response = await fetch('/api/ble/session/active', {
      credentials: 'include'
    });
    const data = await response.json();

    if (data.success && data.hasActiveSession) {
      console.log('⚠️ Found abandoned session, cleaning up...');
      // Clean up abandoned session
      await endBackendSession('page_reload');
    }

  } catch (error) {
    console.error('Error checking session:', error);
  }
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
`;
document.head.appendChild(style);