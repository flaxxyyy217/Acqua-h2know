 let hydrationHistory = [];
    let chart;
    let bluetoothDevice;
    let characteristic;

    function initChart() {
      const ctx = document.getElementById('hydrationChart').getContext('2d');
      chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Hydration Level (%)',
            data: [],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: '#fff',
            pointBorderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: 'white', font: { size: 14 } }
            },
            tooltip: {
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              titleColor: 'white',
              bodyColor: 'rgba(203, 213, 225, 0.95)',
              borderColor: 'rgba(59, 130, 246, 0.5)',
              borderWidth: 1,
              padding: 12,
              displayColors: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              grid: { color: 'rgba(59, 130, 246, 0.1)' },
              ticks: { 
                color: 'rgba(148, 163, 184, 1)',
                callback: function(value) { return value + '%'; }
              }
            },
            x: {
              grid: { color: 'rgba(59, 130, 246, 0.1)' },
              ticks: { color: 'rgba(148, 163, 184, 1)' }
            }
          }
        }
      });
    }

    async function connectBluetooth() {
      if (!navigator.bluetooth) {
        alert('Web Bluetooth API is not available in this browser. Please use Chrome, Edge, or Opera on desktop/Android.');
        return;
      }

      try {
        // Update status
        updateStatus('connecting', 'Connecting...');
        
        // Request bluetooth device
        bluetoothDevice = await navigator.bluetooth.requestDevice({
          filters: [{ services: ['0000ffe0-0000-1000-8000-00805f9b34fb'] }], // Common Arduino service UUID
          optionalServices: ['0000ffe1-0000-1000-8000-00805f9b34fb']
        });

        // Connect to GATT server
        const server = await bluetoothDevice.gatt.connect();
        
        // Get service
        const service = await server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb');
        
        // Get characteristic
        characteristic = await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');
        
        // Start notifications
        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', handleDataReceived);
        
        // Update status
        updateStatus('connected', 'Connected to ' + bluetoothDevice.name);
        document.getElementById('connectBtn').textContent = 'Disconnect Device';
        document.getElementById('connectBtn').onclick = disconnectBluetooth;
        document.getElementById('deviceData').style.display = 'block';
        
      } catch (error) {
        console.error('Bluetooth Error:', error);
        updateStatus('disconnected', 'Connection failed');
        alert('Failed to connect: ' + error.message);
      }
    }

    function disconnectBluetooth() {
      if (bluetoothDevice && bluetoothDevice.gatt.connected) {
        bluetoothDevice.gatt.disconnect();
      }
      updateStatus('disconnected', 'Disconnected');
      document.getElementById('connectBtn').textContent = 'Connect Device';
      document.getElementById('connectBtn').onclick = connectBluetooth;
      document.getElementById('deviceData').style.display = 'none';
    }

    function updateStatus(status, text) {
      const statusDot = document.getElementById('statusIndicator').querySelector('.status-dot');
      const statusText = document.getElementById('statusText');
      
      statusDot.className = 'status-dot ' + status;
      statusText.textContent = text;
    }

    function handleDataReceived(event) {
      const value = new TextDecoder().decode(event.target.value);
      console.log('Received data:', value);
      
      // Expected format: "COLOR:3,FREQ:7,VOL:250"
      try {
        const data = parseArduinoData(value);
        
        if (data) {
          // Update display
          document.getElementById('colorValue').textContent = data.color + '/8';
          document.getElementById('frequencyValue').textContent = data.frequency + ' times/day';
          document.getElementById('volumeValue').textContent = data.volume + ' ml';
          
          // Analyze hydration
          analyzeHydration(data.color, data.frequency, data.volume);
        }
      } catch (error) {
        console.error('Error parsing data:', error);
      }
    }

    function parseArduinoData(dataString) {
      // Parse format: "COLOR:3,FREQ:7,VOL:250" or "3,7,250"
      const parts = dataString.trim().split(',');
      
      if (parts.length === 3) {
        // Try comma-separated format first
        const color = parseInt(parts[0].replace(/\D/g, ''));
        const frequency = parseInt(parts[1].replace(/\D/g, ''));
        const volume = parseInt(parts[2].replace(/\D/g, ''));
        
        if (!isNaN(color) && !isNaN(frequency) && !isNaN(volume)) {
          return { color, frequency, volume };
        }
      }
      
      return null;
    }

    function analyzeHydration(color, frequency, volume) {
      let score = 0;
      
      // Color scoring (inverted - lower is better)
      if (color <= 2) score += 35;
      else if (color <= 3) score += 30;
      else if (color <= 4) score += 20;
      else if (color <= 6) score += 10;
      else score += 5;

      // Frequency scoring
      if (frequency >= 6 && frequency <= 8) score += 35;
      else if (frequency >= 4 && frequency <= 10) score += 25;
      else if (frequency >= 2 && frequency <= 12) score += 15;
      else score += 5;

      // Volume scoring
      if (volume >= 200 && volume <= 400) score += 30;
      else if (volume >= 150 && volume <= 450) score += 20;
      else if (volume >= 100 && volume <= 500) score += 10;
      else score += 5;

      // Update indicator position
      const indicator = document.getElementById('indicator');
      indicator.style.left = score + '%';

      // Determine status
      let status, message, borderColor;
      if (score >= 85) {
        status = '💧 Excellently Hydrated';
        message = 'Your hydration levels are optimal! Keep up the great work maintaining your fluid intake.';
        borderColor = '#3b82f6';
      } else if (score >= 70) {
        status = '✅ Well Hydrated';
        message = 'You\'re properly hydrated. Continue drinking water regularly throughout the day.';
        borderColor = '#22c55e';
      } else if (score >= 50) {
        status = '⚠️ Moderately Hydrated';
        message = 'Your hydration is acceptable but could be improved. Try increasing your water intake.';
        borderColor = '#fbbf24';
      } else if (score >= 30) {
        status = '🚨 Mildly Dehydrated';
        message = 'You show signs of dehydration. Please increase your fluid intake immediately.';
        borderColor = '#f97316';
      } else {
        status = '❌ Dehydrated';
        message = 'You are significantly dehydrated. Drink water now and consult a healthcare provider if symptoms persist.';
        borderColor = '#ef4444';
      }

      // Display results
      document.getElementById('statusTitle').textContent = status;
      document.getElementById('statusMessage').textContent = message;
      const resultDiv = document.getElementById('result');
      resultDiv.style.borderLeftColor = borderColor;
      resultDiv.classList.add('show');

      // Add to history
      const now = new Date();
      const timeLabel = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      hydrationHistory.push({ time: timeLabel, score: score });
      
      // Keep only last 10 readings
      if (hydrationHistory.length > 10) {
        hydrationHistory.shift();
      }

      // Update chart
      chart.data.labels = hydrationHistory.map(h => h.time);
      chart.data.datasets[0].data = hydrationHistory.map(h => h.score);
      chart.update();
    }

    // Initialize chart on load
    window.onload = function() {
      initChart();
    };