// PATCH: Achievement and reward logic fixes
// 1. Add cumulative profit tracking variable to state, and hold tick tracking variable to state (top of file, after state definition)
if (!state.totalProfit) state.totalProfit = 0;
if (!state.stockHoldTicks) state.stockHoldTicks = {};

// PATCH: Update sellStock function so cumulative profit is tracked, and unlock achievement when requirement is met
window.sellStock = function (symbol) {
  const input = document.getElementById(`sell_${symbol}`);
  let qty = input ? parseInt(input.value, 10) : 1;
  qty = Math.max(1, qty || 1);
  const owned = portfolio.stocks[symbol] || 0;
  if (qty > owned) { toast('Not enough shares'); return; }
  const revenue = (prices[symbol] || 0) * qty;
  portfolio.cash += revenue;
  updateCash();
  portfolio.stocks[symbol] = owned - qty;
  if (portfolio.stocks[symbol] === 0) averageBuyPrice[symbol] = 0;
  const profit = (prices[symbol] - averageBuyPrice[symbol]) * qty;
  if (profit > 0) {
    addXP(Math.round(profit / 10));
    state.coins += Math.round(profit / 50);
    dayProgress.dayProfit = (dayProgress.dayProfit || 0) + profit;
    // PATCH: Track total profit
    state.totalProfit += profit;
    // PATCH: Unlock cumulative profit achievement
    if (state.totalProfit >= 1000 && !state.achievements['profit_1000']) {
      unlockAchievement('profit_1000');
    }
  }
  recordOrder('sell', symbol, qty, prices[symbol]);
  if (!state.achievements['first_trade']) unlockAchievement('first_trade');
  toast(`Sold ${qty} ${symbol} for ${formatCurrency(revenue)}`);
  saveState();
  updateHUD();
  updatePortfolioTable();
  updateTradeTable();
  updateStockTable();
};

// PATCH: Track hold ticks for each stock on every tick, unlock 'Patient Investor' achievement
function tickPrices() {
  setRandomPrices({});
  STOCKS.forEach(s => {
    const owned = (portfolio.stocks[s.symbol] || 0);
    if (owned > 0) {
      holdCounters[s.symbol] = (holdCounters[s.symbol] || 0) + 1;
      // PATCH: Track stock hold ticks for achievement
      state.stockHoldTicks[s.symbol] = (state.stockHoldTicks[s.symbol] || 0) + 1;
      if (state.stockHoldTicks[s.symbol] >= 50 && !state.achievements['hold_50ticks']) {
        unlockAchievement('hold_50ticks');
      }
    } else {
      holdCounters[s.symbol] = 0;
      state.stockHoldTicks[s.symbol] = 0;
    }
  });
  let tickDelta = 0;
  STOCKS.forEach(s => {
    const owned = portfolio.stocks[s.symbol] || 0;
    const before = prevPrices[s.symbol] !== undefined ? prevPrices[s.symbol] : prices[s.symbol];
    const after = prices[s.symbol] !== undefined ? prices[s.symbol] : before;
    tickDelta += owned * (after - before);
  });
  state.tickDeltas = state.tickDeltas || [];
  state.tickDeltas.push({ ts: new Date().toISOString(), delta: +tickDelta.toFixed(2) });
  if (state.tickDeltas.length > 500) state.tickDeltas.shift();
  updateTradeTable();
  updateStockTable();
  updatePortfolioTable();
  pushChartSample(getPortfolioValue());
  let totalHoldTicks = 0;
  STOCKS.forEach(s => { if (portfolio.stocks[s.symbol] > 0) totalHoldTicks += 1; });
  dayProgress.holdTicks = (dayProgress.holdTicks || 0) + totalHoldTicks;
  checkMissions();
  updateHUD();
}

// PATCH: Achievement unlock on level up (Rising Star)
function checkLevelUp() {
  let gained = false;
  while (state.xp >= xpForLevel(state.level)) {
    state.xp -= xpForLevel(state.level);
    state.level++;
    gained = true;
    const rewardCoins = 50 + state.level * 5;
    state.coins += rewardCoins;
    toast(`Level up! Now level ${state.level}. +${rewardCoins} coins`);
    launchConfetti(60);
    unlockAchievement('level_up');
    // PATCH: Unlock level 10 achievement
    if (state.level >= 10 && !state.achievements['level_10']) {
      unlockAchievement('level_10');
    }
  }
  if (gained) saveState();
}

// PATCH: Mission claim gives coins and adds to cash
function renderMissionsModal() {
  const modalList = document.getElementById('missions-list');
  if (!modalList) return;
  modalList.innerHTML = '';
  (state.missions || []).forEach((m, idx) => {
    if (!m.done && isMissionComplete(m)) { m.done = true; saveState(); }
    const rewardCoins = (m.reward && m.reward.coins) ? m.reward.coins : 0;
    const rewardXP = (m.reward && m.reward.xp) ? m.reward.xp : 0;
    const rewardText = `Reward: $${rewardCoins}, ${rewardXP} XP`;
    const div = document.createElement('div');
    div.className = 'mission';
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.alignItems = 'center';
    const left = document.createElement('div');
    left.innerHTML = `<strong>${m.text}</strong>
      <div style="font-size:0.9em;color:#9aa7b2">${m.desc || ''}</div>
      <div style="font-size:0.85em;color:#7ee7bf;margin-top:6px">${rewardText}</div>`;
    const right = document.createElement('div');
    right.style.textAlign = 'right';
    right.innerHTML = `<div class="meta" style="margin-bottom:6px">${m.done ? 'Completed' : 'In progress'}</div>
      ${m.done ? `<button class="action-btn" data-claim="${idx}">Claim</button>` : ''}`;
    div.appendChild(left);
    div.appendChild(right);
    modalList.appendChild(div);
    if (m.done) {
      const btn = div.querySelector('button');
      if (btn) {
        btn.onclick = () => {
          const reward = m.reward || { coins: 50, xp: 15 };
          state.coins += reward.coins || 0;
          portfolio.cash += reward.coins || 0;
          addXP(reward.xp || 0);
          toast(`Mission claimed: +${reward.coins} coins, +${reward.xp} XP`);
          const newM = generateSingleMission();
          if (newM) state.missions[idx] = newM;
          else state.missions.splice(idx, 1);
          saveState();
          renderMissionsModal();
          renderMissionsBrief();
          updateMissionsButtonLabel();
          fixDailyMissionsLabel();
        };
      }
    }
  });
  updateMissionsButtonLabel();
  fixDailyMissionsLabel();
}