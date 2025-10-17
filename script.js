// Realistic auto-update script: stocks tick every 10s; news updates every 3 minutes.
// Chart appends a new data point every 10s to build an intra-day time-series.
// Next Day button removed; all panel sizes/layout preserved.

// (Script content based on last working version, with updateTradeTable enhanced to include "Type".)

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

// set initial random prices if not set
function initPricesIfNeeded() {
    STOCKS.forEach(s => {
        if (!prices[s.symbol]) prices[s.symbol] = randomPrice();
    });
}
initPricesIfNeeded();

function setRandomPrices(newsEffectMap = {}) {
    prevPrices = {...prices};

    STOCKS.forEach(stock => {
        let oldPrice = prices[stock.symbol] || randomPrice();

        // base random walk: -3.5% .. +3.5%
        let changePercent = (Math.random() * 0.07) - 0.035;

        // small occasional extra move
        if (Math.random() < 0.10) changePercent += (Math.random() * 0.06 - 0.03);

        // apply news effect (if provided for this symbol)
        if (newsEffectMap[stock.symbol]) changePercent += newsEffectMap[stock.symbol];

        // clamp extremes a bit (avoid > ±50% in a single tick)
        changePercent = Math.max(-0.5, Math.min(0.5, changePercent));

        let newPrice = oldPrice * (1 + changePercent);

        // ensure minimum and reasonable rounding
        prices[stock.symbol] = Math.max(5, +newPrice.toFixed(2));
    });
}

// portfolio history as samples and tick counter
let portfolioHistory = [];
let tickCount = 0;

// Chart.js setup
let ctx = document.getElementById('portfolioChart').getContext('2d');
let initialTime = new Date().toLocaleTimeString();
portfolioHistory.push(getPortfolioValue());

let chartData = {
    labels: [initialTime],
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
        animation: { duration: 400, easing: 'easeOutQuad' },
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
    const el = document.getElementById('cash');
    if (el) el.textContent = `$${portfolio.cash.toFixed(2)}`;
}

function updateStockTable() {
    const tbody = document.getElementById('stock-table');
    if (!tbody) return;
    tbody.innerHTML = "";
    STOCKS.forEach(stock => {
        let price = prices[stock.symbol];
        let change = +(price - (prevPrices[stock.symbol] || price));
        let changeStr = (change > 0 ? "+" : "") + change.toFixed(2);
        let className = change > 0 ? "price-up" : change < 0 ? "price-down" : "price-same";
        const tr = document.createElement('tr');
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
    const tbody = document.getElementById('trade-table');
    if (!tbody) return;
    tbody.innerHTML = "";
    STOCKS.forEach(stock => {
        let price = prices[stock.symbol];
        // compute change using prevPrices (same logic as stock table)
        let change = +(price - (prevPrices[stock.symbol] || price));
        let changeStr = (change > 0 ? "+" : "") + change.toFixed(2);
        let className = change > 0 ? "price-up" : change < 0 ? "price-down" : "price-same";

        const rowId = `buy_${stock.symbol}`;
        const costId = `buy_cost_${stock.symbol}`;
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${stock.symbol}</td>
            <td>${stock.type}</td>
            <td>$${price.toFixed(2)}</td>
            <td class="${className}">${changeStr}</td>
            <td>
                <input type="number" min="1" value="1" class="buy-input" id="${rowId}">
                <button onclick="buyStock('${stock.symbol}')">Buy</button>
                <span class="buy-cost" id="${costId}">$${price.toFixed(2)}</span>
            </td>
        `;
        tbody.appendChild(tr);

        // Live cost update for Buy input
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
    const tbody = document.getElementById('portfolio-table');
    if (!tbody) return;
    tbody.innerHTML = "";
    STOCKS.forEach(stock => {
        const owned = portfolio.stocks[stock.symbol];
        if (owned > 0) {
            const price = prices[stock.symbol];
            const totalValue = owned * price;
            const profitLoss = (price - averageBuyPrice[stock.symbol]) * owned;
            const changeStr = (profitLoss > 0 ? "+" : "") + profitLoss.toFixed(2);
            const className = profitLoss > 0 ? "price-up" : profitLoss < 0 ? "price-down" : "price-same";
            const tr = document.createElement('tr');
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
    const input = document.getElementById(`buy_${symbol}`);
    let qty = input ? parseInt(input.value) : 1;
    qty = Math.max(1, qty || 1);
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
    const input = document.getElementById(`sell_${symbol}`);
    let qty = input ? parseInt(input.value) : 1;
    qty = Math.max(1, qty || 1);
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

// ---- Realistic News/Events System (good/bad/neutral) ----
const NEWS_EVENTS = [
    { type: "stock", symbol: "ZOOMX", text: "Zoomix launches revolutionary AI chip — major upside expected.", effect: 0.22, mood: "good" },
    { type: "stock", symbol: "FRUIQ", text: "FruityQ releases popular new snack — sales strong.", effect: 0.09, mood: "good" },
    { type: "stock", symbol: "SOLARO", text: "Solaro wins government contract — energy boost.", effect: 0.14, mood: "good" },
    { type: "stock", symbol: "ROBIX", text: "Robix reports software bug scandal — stock falls.", effect: -0.20, mood: "bad" },
    { type: "stock", symbol: "AQUIX", text: "Aquix fined for pollution — negative impact.", effect: -0.09, mood: "bad" },
    { type: "type", target: "Electronics", text: "Chip shortage hits electronics sector.", effect: -0.11, mood: "bad" },
    { type: "type", target: "Transport", text: "Transport sector sees travel uptick.", effect: 0.07, mood: "good" },
    { type: "market", text: "Market rally: broad gains.", effect: 0.10, mood: "good" },
    { type: "market", text: "Market sell-off: volatility spikes.", effect: -0.14, mood: "bad" },
    { type: "type", target: "Food", text: "Food sector steady; small movement.", effect: 0.02, mood: "neutral" },
    { type: "stock", symbol: "MEDIX", text: "Medix posts positive trial results.", effect: 0.08, mood: "good" },
    { type: "stock", symbol: "ASTRO", text: "Mining incident affects Astro.", effect: -0.12, mood: "bad" },
    { type: "type", target: "AI & Robotics", text: "AI funding increases sector optimism.", effect: 0.09, mood: "good" }
];

function triggerRandomNews() {
    const news = NEWS_EVENTS[Math.floor(Math.random() * NEWS_EVENTS.length)];
    const el = document.getElementById("news-content");
    if (el) el.textContent = news.text;

    // build newsEffectMap for setRandomPrices
    const newsEffectMap = {};
    if (news.type === "stock") {
        newsEffectMap[news.symbol] = news.effect;
    } else if (news.type === "type") {
        STOCKS.forEach(s => {
            if (s.type === news.target) newsEffectMap[s.symbol] = news.effect;
        });
    } else if (news.type === "market") {
        STOCKS.forEach(s => { newsEffectMap[s.symbol] = news.effect; });
    }
    return newsEffectMap;
}

// helper: push a new chart data point (timestamp label + current portfolio value)
function pushChartSample(value) {
    const nowLabel = new Date().toLocaleTimeString();
    const labels = portfolioChart.data.labels;
    const data = portfolioChart.data.datasets[0].data;

    labels.push(nowLabel);
    data.push(+value.toFixed(2));

    // keep series reasonably sized (trim to last 300 samples)
    const maxSamples = 300;
    while (labels.length > maxSamples) {
        labels.shift();
        data.shift();
    }

    portfolioChart.update();
}

// ---- Auto update loops ----
let priceInterval = null;
let newsInterval = null;

// single tick: update prices and append a chart sample
function tickPrices() {
    // regular tick: no news effect
    setRandomPrices({});
    updateStockTable();
    updateTradeTable();
    updatePortfolioTable();

    // append current portfolio sample to chart
    const value = getPortfolioValue();
    pushChartSample(value);
    tickCount++;
}

// news update: choose news, apply its effect immediately, append a chart sample
function newsTick() {
    const newsMap = triggerRandomNews();
    // apply news effect immediately to prices
    setRandomPrices(newsMap);
    updateStockTable();
    updateTradeTable();
    updatePortfolioTable();
    updateLeaderboard();

    // append immediate sample so chart shows the news impact right away
    const value = getPortfolioValue();
    pushChartSample(value);
}

// start auto-updates after DOM ready
window.addEventListener("DOMContentLoaded", () => {
    // initial UI population
    updateCash();
    updateStockTable();
    updateTradeTable();
    updateLeaderboard();
    updatePortfolioTable();

    // ensure chart point matches current portfolio
    const initialValue = getPortfolioValue();
    portfolioChart.data.datasets[0].data[0] = +initialValue.toFixed(2);
    portfolioChart.update();

    // start price tick every 10 seconds (was 3s)
    if (priceInterval) clearInterval(priceInterval);
    priceInterval = setInterval(tickPrices, 10000);

    // start news tick every 3 minutes (180000 ms)
    if (newsInterval) clearInterval(newsInterval);
    newsInterval = setInterval(newsTick, 180000);

    // show an initial news message
    const el = document.getElementById("news-content");
    if (el) el.textContent = "Welcome to Marketmasters — prices update every 10s, news every 3 minutes.";
});

// Leaderboard and save score (unchanged)
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
    if (!ul) return;
    ul.innerHTML = "";
    scores.forEach((score) => {
        let initials = score.name.split(' ').map(w=>w[0]).join('').toUpperCase();
        let li = document.createElement('li');
        li.innerHTML = `<span style="background:#00fc87; color:#21293a; border-radius:50%; padding:2px 8px; margin-right:6px;">${initials}</span> <strong>${score.name}</strong>: <span class="price-up">$${score.value}</span>`;
        ul.appendChild(li);
    });
}

function getPortfolioValue() {
    let value = portfolio.cash;
    STOCKS.forEach(stock => {
        value += (portfolio.stocks[stock.symbol] || 0) * (prices[stock.symbol] || 0);
    });
    return value;
}
