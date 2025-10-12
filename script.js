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

// ----------- DETAILED Portfolio Chart -----------

function getGradient(ctx, chartArea) {
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, "rgba(0,252,135,0.28)");
    gradient.addColorStop(0.7, "rgba(14,210,247,0.10)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    return gradient;
}

let ctx = document.getElementById('portfolioChart').getContext('2d');

let chartData = {
    labels: [day],
    datasets: [{
        label: 'Portfolio Value',
        data: [portfolioHistory[0]],
        borderColor: '#00FC87',
        backgroundColor: (context) => {
            const chart = context.chart;
            const {ctx, chartArea} = chart;
            if (!chartArea) return 'rgba(0,252,135,0.12)';
            return getGradient(ctx, chartArea);
        },
        fill: true,
        tension: 0.32,
        pointRadius: 5,
        pointHoverRadius: 9,
        pointBackgroundColor: '#00FC87',
        pointBorderColor: '#23263A',
        pointBorderWidth: 2,
        pointStyle: 'circle',
        borderWidth: 3,
        hoverBorderWidth: 5
    }]
};

let portfolioChart = new Chart(ctx, {
    type: 'line',
    data: chartData,
    options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: { left: 18, right: 18, top: 12, bottom: 10 }
        },
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    color: '#21e6c1',
                    font: { size: 15, family: 'Inter, Arial' }
                }
            },
            tooltip: {
                enabled: true,
                backgroundColor: '#21293a',
                titleColor: '#00FC87',
                bodyColor: '#F5F6FA',
                borderColor: '#00FC87',
                borderWidth: 1,
                boxPadding: 6,
                titleFont: { size: 16, family: 'Inter, Arial', weight: 'bold' },
                bodyFont: { size: 15, family: 'Inter, Arial' },
                callbacks: {
                    label: function(context) {
                        return `Value: $${context.parsed.y.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`;
                    },
                    title: function(context) {
                        return `Day ${context[0].label}`;
                    }
                }
            }
        },
        scales: {
            x: {
                display: true,
                title: {
                    display: true,
                    text: 'Day',
                    color: '#21e6c1',
                    font: { size: 15, weight: 'bold' }
                },
                grid: {
                    color: '#2e344d',
                    lineWidth: 1.5
                },
                ticks: {
                    color: '#21e6c1',
                    font: { size: 13 }
                }
            },
            y: {
                display: true,
                title: {
                    display: true,
                    text: 'Portfolio Value (USD)',
                    color: '#21e6c1',
                    font: { size: 15, weight: 'bold' }
                },
                grid: {
                    color: '#2e344d',
                    lineWidth: 1.5
                },
                ticks: {
                    color: '#00FC87',
                    font: { size: 13 },
                    callback: function(value) {
                        return '$' + value.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
                    }
                }
            }
        }
    }
});

// ---- Random News/Events System ----
const NEWS_EVENTS = [
    // Stock-specific
    { type: "stock", symbol: "ZOOMX", text: "Zoomix Technologies launches a hit gadget! Electronics up.", effect: 0.07 },
    { type: "stock", symbol: "FRUIQ", text: "FruityQ recalls a product. Food stocks drop.", effect: -0.05 },
    { type: "stock", symbol: "SOLARO", text: "Oil prices surge! Solaro Energy benefits.", effect: 0.06 },
    { type: "stock", symbol: "ROBIX", text: "Robix Robotics unveils new AI robot. AI & Robotics rise.", effect: 0.08 },
    // Type-specific
    { type: "type", target: "Transport", text: "Major airline strike disrupts transport sector.", effect: -0.06 },
    { type: "type", target: "Electronics", text: "Tech expo boosts electronics sales!", effect: 0.05 },
    { type: "type", target: "Food", text: "New health study favors food companies.", effect: 0.04 },
    { type: "type", target: "AI & Robotics", text: "AI breakthrough stuns the market!", effect: 0.09 },
    { type: "type", target: "Energy", text: "Green energy gets government incentives.", effect: 0.05 },
    { type: "type", target: "Fashion", text: "Fashion week flops, hurting apparel sector.", effect: -0.04 },
    { type: "type", target: "Retail", text: "Holiday shopping season boosts retail.", effect: 0.07 },
    { type: "type", target: "Mining", text: "Mining accident impacts sector.", effect: -0.05 },
    { type: "type", target: "Oil & Energy", text: "Oil crisis! Oil stocks take a hit.", effect: -0.08 },
    { type: "type", target: "Water", text: "Water shortages reported globally. Water stocks spike.", effect: 0.06 },
    { type: "type", target: "Health", text: "New health regulations impact health sector.", effect: -0.04 },
    { type: "type", target: "Travel", text: "Travel restrictions lifted, travel stocks climb.", effect: 0.05 },
    { type: "type", target: "Fitness", text: "Fitness trends grow, fitness stocks increase.", effect: 0.04 }
];

// Show a random news event and apply its effect
function triggerRandomNews() {
    const news = NEWS_EVENTS[Math.floor(Math.random() * NEWS_EVENTS.length)];
    document.getElementById("news-content").textContent = news.text;

    // Apply to stock price(s)
    if (news.type === "stock") {
        let symbol = news.symbol;
        let effect = news.effect;
        prices[symbol] = Math.max(50, +(prices[symbol] * (1 + effect)).toFixed(2));
    } else if (news.type === "type") {
        STOCKS.forEach(stock => {
            if (stock.type === news.target) {
                prices[stock.symbol] = Math.max(50, +(prices[stock.symbol] * (1 + news.effect)).toFixed(2));
            }
        });
    }
}

// ---- Trade Table ----
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

// ---- Stock Table ----
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

// Portfolio table with Sell All button
function updatePortfolioTable() {
    let tbody = document.getElementById('portfolio-table');
    tbody.innerHTML = "";
    STOCKS.forEach(stock => {
        let owned = portfolio.stocks[stock.symbol];
        if (owned > 0) {
            let price = prices[stock.symbol];
            let totalValue = owned * price;
            // Calculate total profit/loss for this stock
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

// ---- Next Day Button ----
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

// Show an initial news event and ensure stocks/trades are visible on page load
window.addEventListener("DOMContentLoaded", () => {
    updateStockTable();
    updateTradeTable();
    triggerRandomNews();
});
