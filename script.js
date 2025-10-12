const STOCKS = [
    { symbol: "ZOOMX", name: "Zoomix Technologies", type: "Electronics" },
    { symbol: "FRUIQ", name: "FruityQ Foods", type: "Food" },
    { symbol: "SOLARO", name: "Solaro Energy", type: "Oil & Energy" },
    { symbol: "ROBIX", name: "Robix Robotics", type: "AI & Robotics" },
    { symbol: "DRONZ", name: "Dronz Delivery", type: "Transport" },
    { symbol: "AQUIX", name: "Aquix Water Corp", type: "Water" },
    { symbol: "GLOBO", name: "Globon Airlines", type: "Transport" },
    { symbol: "NUTRO", name: "Nutro Nutrition", type: "Food" },
    { symbol: "PIXEL", name: "PixelWave Media", type: "Electronics" },
    { symbol: "VOYZA", name: "Voyza Travel", type: "Travel" },
    { symbol: "FLEXI", name: "Flexi Fitness", type: "Fitness" },
    { symbol: "MEDIX", name: "Medix Health", type: "Health" },
    { symbol: "ECOFY", name: "Ecofy Solutions", type: "Energy" },
    { symbol: "ASTRO", name: "Astro Mining", type: "Mining" },
    { symbol: "NEURA", name: "NeuraTech Labs", type: "AI & Robotics" },
    { symbol: "BERRY", name: "BerrySoft Drinks", type: "Food" },
    { symbol: "FASHN", name: "Fashn Apparel", type: "Fashion" },
    { symbol: "SPECT", name: "Spectra Security", type: "Electronics" },
    { symbol: "INNOV", name: "Innovado Systems", type: "AI & Robotics" },
    { symbol: "TREND", name: "Trendify Retail", type: "Retail" }
];

let portfolio = { cash: 10000, stocks: {} };
STOCKS.forEach(stock => { portfolio.stocks[stock.symbol] = 0; });

let prevOwned = {};
STOCKS.forEach(stock => { prevOwned[stock.symbol] = 0; });

let averageBuyPrice = {};
STOCKS.forEach(stock => { averageBuyPrice[stock.symbol] = 0; });

let prices = {}, prevPrices = {};
function randomPrice() { return +(Math.random() * 900 + 100).toFixed(2); }

function setRandomPrices(newsEffectMap = {}) {
    prevPrices = {...prices};

    // Each stock moves independently, but with a random walk centered on 0, slight volatility
    STOCKS.forEach(stock => {
        let oldPrice = prices[stock.symbol] || randomPrice();
        let changePercent = (Math.random() * 0.08) - 0.04; // -4% to +4%, centered around 0

        // Apply news effect if present (from previous news)
        if (newsEffectMap[stock.symbol]) {
            changePercent += newsEffectMap[stock.symbol];
        }

        // Minimum price $10
        let newPrice = Math.max(10, +(oldPrice * (1 + changePercent)).toFixed(2));
        prices[stock.symbol] = newPrice;
    });
}

setRandomPrices();

let portfolioHistory = [getPortfolioValue()];
let day = 1;

// Chart.js setup
let ctx = document.getElementById('portfolioChart').getContext('2d');
let chartData = {
    labels: [day],
    datasets: [{
        label: 'Portfolio Value',
        data: [portfolioHistory[0]],
        borderColor: '#00FC87',
        backgroundColor: 'rgba(14,210,247,0.10)',
        fill: true,
        tension: 0.28,
        pointRadius: 4,
        pointBackgroundColor: '#00FC87',
        pointBorderColor: '#23263A'
    }]
};
let portfolioChart = new Chart(ctx, {
    type: 'line',
    data: chartData,
    options: {
        animation: { duration: 700, easing: 'easeOutQuad' },
        scales: {
            x: { display: false },
            y: { display: false }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#23263A',
                titleColor: '#00FC87',
                bodyColor: '#F5F6FA',
                borderColor: '#00FC87',
                borderWidth: 1
            }
        }
    }
});

function updateCash() {
    document.getElementById('cash').textContent = `$${portfolio.cash.toFixed(2)}`;
}

function updateStockTable() {
    let tbody = document.getElementById('stock-table');
    tbody.innerHTML = "";
    STOCKS.forEach(stock => {
        let price = prices[stock.symbol];
        let change = prices[stock.symbol] - (prevPrices[stock.symbol] || price);
        let changeStr = (change > 0 ? "+" : "") + change.toFixed(2);
        let className = change > 0 ? "price-up" : change < 0 ? "price-down" : "price-same";
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${stock.symbol}</td>
            <td>${stock.type}</td>
            <td>$${price.toFixed(2)}</td>
            <td class="${className}">${changeStr}</td>
            <td></td>
        `;
        tbody.appendChild(tr);
    });
}

function updateTradeTable() {
    let tbody = document.getElementById('trade-table');
    tbody.innerHTML = "";
    STOCKS.forEach(stock => {
        let price = prices[stock.symbol];
        const rowId = `buy_${stock.symbol}`;
        const costId = `buy_cost_${stock.symbol}`;
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${stock.symbol}</td>
            <td>$${price.toFixed(2)}</td>
            <td>
                <input type="number" min="1" value="1" class="buy-input" id="${rowId}">
                <button onclick="buyStock('${stock.symbol}')">Buy</button>
                <span class="buy-cost" id="${costId}">$${price.toFixed(2)}</span>
            </td>
        `;
        tbody.appendChild(tr);

        setTimeout(() => {
            const qtyInput = document.getElementById(rowId);
            const costSpan = document.getElementById(costId);
            if (qtyInput && costSpan) {
                function updateCost() {
                    let qty = parseInt(qtyInput.value) || 0;
                    let cost = qty * price;
                    costSpan.textContent = `$${cost.toFixed(2)}`;
                }
                qtyInput.addEventListener('input', updateCost);
                updateCost();
            }
        }, 0);
    });
}

function updatePortfolioTable() {
    let tbody = document.getElementById('portfolio-table');
    tbody.innerHTML = "";
    STOCKS.forEach(stock => {
        let owned = portfolio.stocks[stock.symbol];
        if (owned > 0) {
            let price = prices[stock.symbol];
            let totalValue = owned * price;
            let profitLoss = (price - averageBuyPrice[stock.symbol]) * owned;
            let changeStr = (profitLoss > 0 ? "+" : "") + profitLoss.toFixed(2);
            let className = profitLoss > 0 ? "price-up" : profitLoss < 0 ? "price-down" : "price-same";
            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${stock.symbol}</td>
                <td>${owned}</td>
                <td>$${price.toFixed(2)}</td>
                <td>$${totalValue.toFixed(2)}</td>
                <td class="${className}">${changeStr}</td>
                <td style="white-space:nowrap; min-width:200px;">
                    <input type="number" min="1" value="1" style="width:40px;" id="sell_${stock.symbol}">
                    <button class="sell-btn" onclick="sellStock('${stock.symbol}')">Sell</button>
                    <button class="sell-all-btn" onclick="sellAllStock('${stock.symbol}')">Sell All</button>
                </td>
            `;
            tbody.appendChild(tr);
        }
    });
}

window.buyStock = function(symbol) {
    let qty = parseInt(document.getElementById(`buy_${symbol}`).value);
    let cost = prices[symbol] * qty;
    if (qty > 0 && portfolio.cash >= cost) {
        let prevQty = portfolio.stocks[symbol];
        let totalQty = prevQty + qty;
        if (totalQty > 0) {
            averageBuyPrice[symbol] = (averageBuyPrice[symbol] * prevQty + prices[symbol] * qty) / totalQty;
        } else {
            averageBuyPrice[symbol] = prices[symbol];
        }
        portfolio.cash -= cost;
        portfolio.stocks[symbol] += qty;
        updateCash();
        updateLeaderboard();
        updatePortfolioTable();
    }
};
window.sellStock = function(symbol) {
    let qty = parseInt(document.getElementById(`sell_${symbol}`).value);
    let owned = portfolio.stocks[symbol];
    if (qty > 0 && owned >= qty) {
        portfolio.cash += prices[symbol] * qty;
        portfolio.stocks[symbol] -= qty;
        if (portfolio.stocks[symbol] === 0) {
            prevOwned[symbol] = 0;
            averageBuyPrice[symbol] = 0;
        }
        updateCash();
        updateLeaderboard();
        updatePortfolioTable();
    }
};
window.sellAllStock = function(symbol) {
    let owned = portfolio.stocks[symbol];
    if (owned > 0) {
        portfolio.cash += prices[symbol] * owned;
        portfolio.stocks[symbol] = 0;
        prevOwned[symbol] = 0;
        averageBuyPrice[symbol] = 0;
        updateCash();
        updateLeaderboard();
        updatePortfolioTable();
    }
};

// ---- Realistic News/Events System ----
const NEWS_EVENTS = [
    // Good news, medium, big, mild
    { type: "stock", symbol: "ZOOMX", text: "BREAKING: Zoomix Technologies launches revolutionary AI chip! Electronics soar.", effect: 0.22, mood: "good" },
    { type: "stock", symbol: "FRUIQ", text: "FruityQ Foods releases a popular new snack. Food stocks rise.", effect: 0.09, mood: "good" },
    { type: "stock", symbol: "SOLARO", text: "Solaro Energy secures a major government contract!", effect: 0.15, mood: "good" },
    { type: "type", target: "Transport", text: "Transport sector sees strong passenger growth.", effect: 0.07, mood: "good" },
    { type: "market", text: "Market rally: most stocks surge.", effect: 0.13, mood: "good" },
    // Bad news, mild, big, crash
    { type: "stock", symbol: "ROBIX", text: "Robix Robotics faces software bug scandal. Stock tanks.", effect: -0.20, mood: "bad" },
    { type: "stock", symbol: "AQUIX", text: "Aquix Water Corp fined for pollution. Water stocks drop.", effect: -0.08, mood: "bad" },
    { type: "type", target: "Electronics", text: "Electronics sector hit by chip shortage.", effect: -0.11, mood: "bad" },
    { type: "market", text: "Market crash: panic selling hits all stocks!", effect: -0.18, mood: "bad" },
    // Neutral/minor events
    { type: "stock", symbol: "VOYZA", text: "Voyza Travel launches new routes, but response is lukewarm.", effect: 0.02, mood: "neutral" },
    { type: "type", target: "Food", text: "Food sector stable as prices remain unchanged.", effect: 0.0, mood: "neutral" },
    { type: "type", target: "Retail", text: "Retail sector sees mixed results.", effect: -0.01, mood: "neutral" },
    // More variety
    { type: "stock", symbol: "MEDIX", text: "Medix Health receives glowing review. Health stocks up.", effect: 0.06, mood: "good" },
    { type: "stock", symbol: "ASTRO", text: "Astro Mining suffers safety incident. Mining stocks fall.", effect: -0.13, mood: "bad" },
    { type: "type", target: "AI & Robotics", text: "AI & Robotics sector gets new funding.", effect: 0.10, mood: "good" },
];

function triggerRandomNews() {
    const news = NEWS_EVENTS[Math.floor(Math.random() * NEWS_EVENTS.length)];
    document.getElementById("news-content").textContent = news.text;

    // Map of news effect per symbol for setRandomPrices
    let newsEffectMap = {};
    if (news.type === "stock") {
        newsEffectMap[news.symbol] = news.effect;
    } else if (news.type === "type") {
        STOCKS.forEach(stock => {
            if (stock.type === news.target) {
                newsEffectMap[stock.symbol] = news.effect;
            }
        });
    } else if (news.type === "market") {
        STOCKS.forEach(stock => {
            newsEffectMap[stock.symbol] = news.effect;
        });
    }
    return newsEffectMap;
}

// ---- Next Day Button ----
document.getElementById('next-day').onclick = function() {
    STOCKS.forEach(stock => {
        prevOwned[stock.symbol] = portfolio.stocks[stock.symbol];
    });
    // News effect map returned from news event
    let newsEffectMap = triggerRandomNews();
    setRandomPrices(newsEffectMap); // Pass news effect to stock price change
    updateStockTable();
    updateTradeTable();
    day++;
    let value = getPortfolioValue();
    portfolioHistory.push(value);
    portfolioChart.data.labels.push(day);
    portfolioChart.data.datasets[0].data.push(value);
    portfolioChart.update();
    updateLeaderboard();
    updatePortfolioTable();
};

function getPortfolioValue() {
    let value = portfolio.cash;
    STOCKS.forEach(stock => {
        value += portfolio.stocks[stock.symbol] * prices[stock.symbol];
    });
    return value;
}

// Modified leaderboard logic: Only top 10, and only best score per person
function loadScores() {
    let scores = JSON.parse(localStorage.getItem('leaderboard_scores') || "[]");
    let bestScores = {};
    scores.forEach(s => {
        if (!bestScores[s.name] || s.value > bestScores[s.name].value) {
            bestScores[s.name] = s;
        }
    });
    let uniqueScores = Object.values(bestScores);
    uniqueScores.sort((a, b) => b.value - a.value);
    return uniqueScores.slice(0, 10);
}
function saveScore() {
    let name = prompt("Enter your name for the leaderboard:");
    if (!name) return;
    let value = getPortfolioValue();
    let scores = JSON.parse(localStorage.getItem('leaderboard_scores') || "[]");
    scores.push({ name, value: +value.toFixed(2) });
    localStorage.setItem('leaderboard_scores', JSON.stringify(scores));
    updateLeaderboard();
}
document.getElementById('save-score').onclick = saveScore;
function updateLeaderboard() {
    let scores = loadScores();
    let ul = document.getElementById('scores');
    ul.innerHTML = "";
    scores.forEach((score, idx) => {
        let initials = score.name.split(' ').map(w=>w[0]).join('').toUpperCase();
        let li = document.createElement('li');
        li.innerHTML = `<span style="background:#00fc87; color:#21293a; border-radius:50%; padding:2px 8px; margin-right:6px;">${initials}</span> <strong>${score.name}</strong>: <span class="price-up">$${score.value}</span>`;
        ul.appendChild(li);
    });
}

// Initial UI setup
updateCash();
updateStockTable();
updateTradeTable();
updateLeaderboard();
updatePortfolioTable();

// Show an initial news event when page loads
window.addEventListener("DOMContentLoaded", () => {
    updateCash();
    updateStockTable();
    updateTradeTable();
    updateLeaderboard();
    updatePortfolioTable();
    // Initial news (no real effect on first prices)
    document.getElementById("news-content").textContent = "Welcome to Marketmasters! Click Next Day for fresh market news.";
});
