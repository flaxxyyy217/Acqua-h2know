// services/bleDataService.js

/**
 * Convert Arduino sensor format to internal format
 * Arduino sends: { color, r, g, b, sg, ph, status }
 * We need: { color (0-1023), frequency, volume }
 */
exports.convertArduinoData = (arduinoData) => {
  try {
    const r = parseInt(arduinoData.r) || 0;
    const g = parseInt(arduinoData.g) || 0;
    const b = parseInt(arduinoData.b) || 0;

    // Calculate brightness (0-255) and map to 0-1023
    const brightness = (r + g + b) / 3;
    const colorValue = Math.round((brightness / 255) * 1023);

    // Map specific gravity to frequency estimate
    // SG range: 1.010-1.030
    // Lower SG = more hydrated = less frequent urination
    const sg = parseFloat(arduinoData.sg) || 1.020;
    const sgNormalized = Math.max(0, Math.min(1, (sg - 1.010) / 0.020));
    const frequency = Math.round(sgNormalized * 8); // 0-8 times/day

    // Map pH to volume estimate
    // pH range: 5.5-7.0
    // Higher pH = better hydration = larger volume
    const ph = parseFloat(arduinoData.ph) || 6.5;
    const phNormalized = Math.max(0, Math.min(1, (ph - 5.5) / 1.5));
    const volume = Math.round(phNormalized * 300); // 0-300ml

    return {
      color: colorValue,
      frequency: frequency,
      volume: volume,
      // Keep original data
      originalColor: arduinoData.color,
      sg: sg,
      ph: ph,
      status: arduinoData.status
    };

  } catch (error) {
    console.error('Error converting Arduino data:', error);
    // Return safe defaults
    return {
      color: 512,
      frequency: 4,
      volume: 150,
      error: error.message
    };
  }
};

/**
 * Calculate hydration level from sensor data
 */
exports.calculateHydrationLevel = (color, frequency, volume) => {
  let level = '';
  let percentage = 0;
  let advice = '';

  // Lower color value = lighter urine = better hydration
  // Color range: 0-1023
  if (color < 256) {
    level = 'Well Hydrated';
    percentage = 90;
    advice = 'Excellent! Your hydration is optimal.';
  } else if (color < 512) {
    level = 'Slightly Dehydrated';
    percentage = 60;
    advice = 'Good, but drink 1-2 glasses of water soon.';
  } else if (color < 768) {
    level = 'Dehydrated';
    percentage = 30;
    advice = 'Warning: Drink water immediately.';
  } else {
    level = 'Severely Dehydrated';
    percentage = 10;
    advice = 'Critical: Seek hydration urgently.';
  }

  // Adjust based on frequency
  if (frequency > 6) {
    percentage = Math.max(percentage - 10, 10);
  } else if (frequency < 3) {
    percentage = Math.min(percentage + 10, 100);
  }

  return {
    level,
    percentage,
    advice,
    metrics: {
      color,
      frequency,
      volume
    }
  };
};

/**
 * Validate sensor data quality
 */
exports.validateSensorData = (sensorData) => {
  const errors = [];
  const warnings = [];

  // Check RGB values
  const { r, g, b } = sensorData;
  if (r === 0 && g === 0 && b === 0) {
    errors.push('Color sensor returned all zeros - possible hardware failure');
  }
  if (r === 255 && g === 255 && b === 255) {
    warnings.push('Color sensor saturated - may be overexposed');
  }

  // Check specific gravity
  const sg = parseFloat(sensorData.sg);
  if (sg < 1.005 || sg > 1.040) {
    warnings.push('Specific gravity out of normal range');
  }

  // Check pH
  const ph = parseFloat(sensorData.ph);
  if (ph < 4.5 || ph > 8.0) {
    warnings.push('pH out of normal range');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    quality: errors.length === 0 ? (warnings.length === 0 ? 'excellent' : 'good') : 'poor'
  };
};
