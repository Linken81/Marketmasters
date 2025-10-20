// Existing code above remains unchanged...

// After state definition
if (!state.totalProfit) state.totalProfit = 0;
if (!state.stockHoldTicks) state.stockHoldTicks = {};

// In window.sellStock:
// After profit calculation, add:
if (profit > 0) {
  state.totalProfit += profit;
  if (state.totalProfit >= 1000 && !state.achievements['profit_1000']) {
    unlockAchievement('profit_1000');
  }
}

// In tickPrices:
// After holdCounters update, add:
if (owned > 0) {
  state.stockHoldTicks[s.symbol] = (state.stockHoldTicks[s.symbol] || 0) + 1;
  if (state.stockHoldTicks[s.symbol] >= 50 && !state.achievements['hold_50ticks']) {
    unlockAchievement('hold_50ticks');
  }
} else {
  state.stockHoldTicks[s.symbol] = 0;
}

// In checkLevelUp:
// After level increment, add:
if (state.level >= 10 && !state.achievements['level_10']) {
  unlockAchievement('level_10');
}

// In renderMissionsModal, mission claim handler, add:
state.coins += reward.coins || 0;
portfolio.cash += reward.coins || 0;
addXP(reward.xp || 0);

// Existing code below remains unchanged...