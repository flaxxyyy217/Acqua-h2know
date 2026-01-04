 const badges = {
      daily: [
        {
          id: 'first_drink',
          icon: '💧',
          name: 'First Drop',
          description: 'Drink water for the first time',
          requirement: 1,
          rarity: 'common',
          unlocked: false,
          progress: 0
        },
        {
          id: 'daily_goal',
          icon: '🎯',
          name: 'Daily Goal',
          description: 'Drink 8 glasses of water in one day',
          requirement: 8,
          rarity: 'common',
          unlocked: false,
          progress: 0
        },
        {
          id: 'overachiever',
          icon: '⚡',
          name: 'Overachiever',
          description: 'Drink 12 glasses in one day',
          requirement: 12,
          rarity: 'rare',
          unlocked: false,
          progress: 0
        },
        {
          id: 'hydration_champion',
          icon: '👑',
          name: 'Hydration Champion',
          description: 'Maintain perfect hydration for 24 hours',
          requirement: 1,
          rarity: 'epic',
          unlocked: false,
          progress: 0
        }
      ],
      streak: [
        {
          id: 'streak_3',
          icon: '🔥',
          name: 'Hot Streak',
          description: 'Maintain a 3-day streak',
          requirement: 3,
          rarity: 'common',
          unlocked: false,
          progress: 0
        },
        {
          id: 'streak_7',
          icon: '🌟',
          name: 'Week Warrior',
          description: 'Maintain a 7-day streak',
          requirement: 7,
          rarity: 'rare',
          unlocked: false,
          progress: 0
        },
        {
          id: 'streak_30',
          icon: '💪',
          name: 'Month Master',
          description: 'Maintain a 30-day streak',
          requirement: 30,
          rarity: 'epic',
          unlocked: false,
          progress: 0
        },
        {
          id: 'streak_100',
          icon: '🏆',
          name: 'Century Club',
          description: 'Maintain a 100-day streak',
          requirement: 100,
          rarity: 'legendary',
          unlocked: false,
          progress: 0
        }
      ],
      volume: [
        {
          id: 'liter_10',
          icon: '💦',
          name: 'Getting Started',
          description: 'Drink 10 liters total',
          requirement: 10,
          rarity: 'common',
          unlocked: false,
          progress: 0
        },
        {
          id: 'liter_50',
          icon: '🌊',
          name: 'Water Warrior',
          description: 'Drink 50 liters total',
          requirement: 50,
          rarity: 'rare',
          unlocked: false,
          progress: 0
        },
        {
          id: 'liter_100',
          icon: '🌈',
          name: 'Hydration Hero',
          description: 'Drink 100 liters total',
          requirement: 100,
          rarity: 'epic',
          unlocked: false,
          progress: 0
        },
        {
          id: 'liter_500',
          icon: '🦸',
          name: 'Aqua Legend',
          description: 'Drink 500 liters total',
          requirement: 500,
          rarity: 'legendary',
          unlocked: false,
          progress: 0
        }
      ],
      special: [
        {
          id: 'early_bird',
          icon: '🌅',
          name: 'Early Bird',
          description: 'Drink water before 7 AM',
          requirement: 1,
          rarity: 'rare',
          unlocked: false,
          progress: 0
        },
        {
          id: 'night_owl',
          icon: '🌙',
          name: 'Night Owl',
          description: 'Drink water after 10 PM',
          requirement: 1,
          rarity: 'rare',
          unlocked: false,
          progress: 0
        },
        {
          id: 'perfect_timing',
          icon: '⏰',
          name: 'Perfect Timing',
          description: 'Follow all reminders in one day',
          requirement: 1,
          rarity: 'epic',
          unlocked: false,
          progress: 0
        },
        {
          id: 'wellness_warrior',
          icon: '🧘',
          name: 'Wellness Warrior',
          description: 'Maintain optimal hydration for 7 days',
          requirement: 7,
          rarity: 'legendary',
          unlocked: false,
          progress: 0
        },
        {
          id: 'social_butterfly',
          icon: '🦋',
          name: 'Social Butterfly',
          description: 'Share your progress 5 times',
          requirement: 5,
          rarity: 'rare',
          unlocked: false,
          progress: 0
        },
        {
          id: 'perfectionist',
          icon: '💎',
          name: 'Perfectionist',
          description: 'Unlock all other badges',
          requirement: 1,
          rarity: 'legendary',
          unlocked: false,
          progress: 0
        }
      ]
    };

    // Load badges from localStorage or use defaults
    function loadBadges() {
      const saved = localStorage.getItem('hydrationBadges');
      if (saved) {
        const savedBadges = JSON.parse(saved);
        Object.keys(badges).forEach(category => {
          badges[category].forEach((badge, index) => {
            if (savedBadges[category] && savedBadges[category][index]) {
              badge.unlocked = savedBadges[category][index].unlocked;
              badge.progress = savedBadges[category][index].progress;
            }
          });
        });
      }
    }

    // Save badges to localStorage
    function saveBadges() {
      localStorage.setItem('hydrationBadges', JSON.stringify(badges));
    }

    // Create badge card HTML
    function createBadgeCard(badge, isNew = false) {
      const progressPercent = Math.min((badge.progress / badge.requirement) * 100, 100);
      
      return `
        <div class="badge-card ${badge.unlocked ? 'unlocked' : 'locked'}">
          ${isNew ? '<div class="newly-unlocked">NEW!</div>' : ''}
          <div class="badge-icon-container">
            <span>${badge.icon}</span>
            ${!badge.unlocked ? '<div class="lock-overlay">🔒</div>' : ''}
          </div>
          <div class="badge-info">
            <div class="badge-name">${badge.name}</div>
            <div class="badge-description">${badge.description}</div>
            <span class="badge-rarity rarity-${badge.rarity}">${badge.rarity.toUpperCase()}</span>
            ${!badge.unlocked ? `
              <div class="badge-progress">
                <div class="progress-label">
                  <span>Progress</span>
                  <span>${badge.progress}/${badge.requirement}</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <div class="progress-controls">
                  <button class="progress-btn minus" onclick="updateProgress('${badge.id}', -1); event.stopPropagation();">−</button>
                  <span class="progress-value">${badge.progress}</span>
                  <button class="progress-btn" onclick="updateProgress('${badge.id}', 1); event.stopPropagation();">+</button>
                </div>
              </div>
            ` : '<div style="margin-top: 15px; color: #22c55e; font-weight: 600;">✓ UNLOCKED</div>'}
          </div>
        </div>
      `;
    }

    // Render all badges
    function renderBadges() {
      console.log('Rendering badges...');
      
      const dailyContainer = document.getElementById('dailyBadges');
      const streakContainer = document.getElementById('streakBadges');
      const volumeContainer = document.getElementById('volumeBadges');
      const specialContainer = document.getElementById('specialBadges');
      
      if (!dailyContainer || !streakContainer || !volumeContainer || !specialContainer) {
        console.error('Badge containers not found!');
        return;
      }
      
      dailyContainer.innerHTML = badges.daily.map(badge => createBadgeCard(badge)).join('');
      streakContainer.innerHTML = badges.streak.map(badge => createBadgeCard(badge)).join('');
      volumeContainer.innerHTML = badges.volume.map(badge => createBadgeCard(badge)).join('');
      specialContainer.innerHTML = badges.special.map(badge => createBadgeCard(badge)).join('');
      
      console.log('Badges rendered successfully');
      updateStats();
    }

    // Update statistics
    function updateStats() {
      let total = 0;
      let unlocked = 0;
      
      Object.values(badges).forEach(category => {
        category.forEach(badge => {
          total++;
          if (badge.unlocked) unlocked++;
        });
      });
      
      document.getElementById('totalBadges').textContent = total;
      document.getElementById('unlockedBadges').textContent = unlocked;
      
      // These would come from actual user data
      const streak = localStorage.getItem('currentStreak') || 0;
      const totalWater = localStorage.getItem('totalWater') || 0;
      
      document.getElementById('streakDays').textContent = streak;
      document.getElementById('totalWater').textContent = (totalWater / 1000).toFixed(1) + 'L';
    }

    // Update badge progress manually
    function updateProgress(badgeId, change) {
      let found = false;
      
      Object.values(badges).forEach(category => {
        category.forEach(badge => {
          if (badge.id === badgeId && !found) {
            // Update progress
            badge.progress = Math.max(0, Math.min(badge.progress + change, badge.requirement));
            
            // Check if badge should be unlocked
            if (badge.progress >= badge.requirement && !badge.unlocked) {
              badge.unlocked = true;
              showUnlockAnimation(badge);
            }
            
            found = true;
          }
        });
      });
      
      saveBadges();
      renderBadges();
    }

    // Toggle badge for demo purposes (in real app, badges unlock based on actual progress)
    function toggleBadge(badgeId) {
      let found = false;
      
      Object.values(badges).forEach(category => {
        category.forEach(badge => {
          if (badge.id === badgeId && !found) {
            badge.unlocked = !badge.unlocked;
            if (badge.unlocked) {
              badge.progress = badge.requirement;
              showUnlockAnimation(badge);
            } else {
              badge.progress = 0;
            }
            found = true;
          }
        });
      });
      
      saveBadges();
      renderBadges();
    }

    // Show unlock animation
    function showUnlockAnimation(badge) {
      // Create a celebratory effect
      console.log(`🎉 Badge Unlocked: ${badge.name}!`);
    }

    // Simulate progress updates (for demo)
    function simulateProgress() {
      // This would be replaced with actual tracking in production
      const dailyDrinks = Math.floor(Math.random() * 15);
      const currentStreak = Math.floor(Math.random() * 10);
      const totalLiters = Math.floor(Math.random() * 20);
      
      // Update daily badges
      badges.daily.forEach(badge => {
        if (!badge.unlocked && badge.id.includes('drink') || badge.id.includes('goal') || badge.id.includes('overachiever')) {
          badge.progress = Math.min(dailyDrinks, badge.requirement);
          if (badge.progress >= badge.requirement) {
            badge.unlocked = true;
          }
        }
      });
      
      // Update streak badges
      badges.streak.forEach(badge => {
        badge.progress = Math.min(currentStreak, badge.requirement);
        if (badge.progress >= badge.requirement) {
          badge.unlocked = true;
        }
      });
      
      // Update volume badges
      badges.volume.forEach(badge => {
        badge.progress = Math.min(totalLiters, badge.requirement);
        if (badge.progress >= badge.requirement) {
          badge.unlocked = true;
        }
      });
      
      saveBadges();
      renderBadges();
    }

    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
      console.log('DOM loaded, initializing badges...');
      loadBadges();
      renderBadges();
      console.log('Badges rendered');
    });