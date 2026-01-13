const mongoose = require("mongoose")

/**
 * Tracks user hydration tests
 */
const hydrationTestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
      },

    testID: {
        type: String,
        required: true,
        unique: true,
    },
    
    testDate: {
        type: Date,
        default: Date.now,
    },

    hyrdrationLevel: {
        type: String,
        enum: ['Well Hydrated', 'Slightly Dehydrated', 'Dehydrated', 'Severely Dehydrated'],
        required: true
    },
    hydrationPercentage: {
        type: Number,
        required: true,
    },

    duration: {
        type: Number,
        required: true,
    }

    
});

module.exports = mongoose.model('HydrationTest', hydrationTestSchema);