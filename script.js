// Achievement unlock logic
if (cumulativeProfit >= 1000) {
    unlockAchievement('Cumulative Profit $1000');
}
if (holdTicks >= 50) {
    unlockAchievement('Hold for 50 Ticks');
}
if (firstTrade) {
    unlockAchievement('First Trade Made');
}
if (level === 10) {
    unlockAchievement('Reached Level 10');
}

// Mission reward claims logic
function claimMissionReward(mission) {
    const reward = mission.getReward();
    state.coins += reward.coins;
    portfolio.cash += reward.cash;
}

// Other existing logic preserved
// ... (existing code continues here) ...