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

function setRandomPrices() {
    prevPrices = {...prices};
    STOCKS.forEach(stock => {
        let oldPrice = prices[stock.symbol] || randomPrice();
        let changePercent = (Math.random() * 0.07) - 0.02;
        let newPrice = oldPrice * (1 + changePercent);
        prices[stock.symbol] = Math.max(50, +newPrice.toFixed(2));
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

// ----------- RANDOM NEWS SYSTEM -----------
const NEWS_EVENTS = [
    // Stock-specific events
    { type: "stock", symbol: "ZOOMX", text: "Zoomix Technologies launches a new gadget! Electronics stocks soar.", effect: 0.07, typeText: "Electronics stocks go up." },
    { type: "stock", symbol: "FRUIQ", text: "FruityQ Foods recalls a product. Food stocks drop.", effect: -0.05, typeText: "Food stocks go down." },
    { type: "stock", symbol: "SOLARO", text: "Oil prices surge! Solaro Energy benefits.", effect: 0.06, typeText: "Oil & Energy stocks go up." },
    { type: "stock", symbol: "ROBIX", text: "Robix Robotics unveils new AI robot. AI & Robotics stocks rise.", effect: 0.08, typeText: "AI & Robotics stocks go up." },
    // Type-specific events
    { type: "type", target: "Transport", text: "Major airline strike disrupts transport sector.", effect: -0.06, typeText: "Transport stocks go down." },
    { type: "type", target: "Electronics", text: "Tech expo boosts electronics sales!", effect: 0.05, typeText: "Electronics stocks go up." },
    { type: "type", target: "Food", text: "New health study favors food companies.", effect: 0.04, typeText: "Food stocks go up." },
    { type: "type", target: "AI & Robotics", text: "AI breakthrough stuns the market!", effect: 0.09, typeText: "AI & Robotics stocks go up." },
    { type: "type", target: "Energy", text: "Green energy gets government incentives.", effect: 0.05, typeText: "Energy stocks go up." },
    { type: "type", target: "Fashion", text: "Fashion week flops, hurting apparel sector.", effect: -0.04, typeText: "Fashion stocks go down." },
    { type: "type", target: "Retail", text: "Holiday shopping season boosts retail.", effect: 0.07, typeText: "Retail stocks go up." },
    { type: "type", target: "Mining", text: "Mining accident impacts sector.", effect: -0.05, typeText: "Mining stocks go down." },
    // Additional random type news for more variety
    { type: "type", target: "Oil & Energy", text: "Oil crisis! The oil stocks take a hit.", effect: -0.08, typeText: "Oil & Energy stocks go down due to oil crisis." },
    { type: "type", target: "Water", text: "Water shortages reported globally. Water stocks spike.", effect: 0.06, typeText: "Water stocks go up." },
    { type: "type", target: "Health", text: "New health regulations impact health sector.", effect: -0.04, typeText: "Health stocks go down." },
    { type: "type", target: "Travel", text: "Travel restrictions lifted, travel stocks climb.", effect: 0.05, typeText: "Travel stocks go up." },
    { type: "type", target: "Fitness", text: "Fitness trends grow, fitness stocks increase.", effect: 0.04, typeText: "Fitness stocks go up." }
];

let latestNews = null;

function triggerRandomNews() {
    latestNews = NEWS_EVENTS[Math.floor(Math.random() * NEWS_EVENTS.length)];
    document.getElementById("news-content").textContent = latestNews.text;
    document.getElementById("news-effect-text").textContent = latestNews.typeText || "";

    if (latestNews.type === "stock") {
        let symbol = latestNews.symbol;
        let effect = latestNews.effect;
        prices[symbol] = Math.max(50, +(prices[symbol] * (1 + effect)).toFixed(2));
    } else if (latestNews.type === "type") {
        STOCKS.forEach(stock => {
            if (stock.type === latestNews.target) {
                prices[stock.symbol] = Math.max(50, +(prices[stock.symbol] * (1 + latestNews.effect)).toFixed(2));
            }
        });
    }
}

// ----------- MODIFIED NEXT DAY BUTTON -----------
document.getElementById('next-day').onclick = function() {
    STOCKS.forEach(stock => {
        prevOwned[stock.symbol] = portfolio.stocks[stock.symbol];
    });
    setRandomPrices();
    triggerRandomNews();
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

// ----------- INITIAL NEWS -----------
window.addEventListener("DOMContentLoaded", () => {
    triggerRandomNews();
});

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
