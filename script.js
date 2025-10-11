const STOCKS = [
    { symbol: "ZOOMX", name: "Zoomix Technologies" },
    { symbol: "FRUIQ", name: "FruityQ Foods" },
    { symbol: "SOLARO", name: "Solaro Energy" },
    { symbol: "ROBIX", name: "Robix Robotics" },
    { symbol: "DRONZ", name: "Dronz Delivery" },
    { symbol: "AQUIX", name: "Aquix Water Corp" },
    { symbol: "GLOBO", name: "Globon Airlines" },
    { symbol: "NUTRO", name: "Nutro Nutrition" },
    { symbol: "PIXEL", name: "PixelWave Media" },
    { symbol: "VOYZA", name: "Voyza Travel" },
    { symbol: "FLEXI", name: "Flexi Fitness" },
    { symbol: "MEDIX", name: "Medix Health" },
    { symbol: "ECOFY", name: "Ecofy Solutions" },
    { symbol: "ASTRO", name: "Astro Mining" },
    { symbol: "NEURA", name: "NeuraTech Labs" },
    { symbol: "BERRY", name: "BerrySoft Drinks" },
    { symbol: "FASHN", name: "Fashn Apparel" },
    { symbol: "SPECT", name: "Spectra Security" },
    { symbol: "INNOV", name: "Innovado Systems" },
    { symbol: "TREND", name: "Trendify Retail" }
];

let portfolio = { cash: 10000, stocks: {} };
STOCKS.forEach(stock => { portfolio.stocks[stock.symbol] = 0; });

let prevOwned = {};
STOCKS.forEach(stock => { prevOwned[stock.symbol] = 0; });

let prices = {}, prevPrices = {};
function randomPrice() { return +(Math.random() * 900 + 100).toFixed(2); }
function setRandomPrices() {
    prevPrices = {...prices};
    STOCKS.forEach(stock => {
        prices[stock.symbol] = randomPrice();
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
            <td>$${price.toFixed(2)}</td>
            <td class="${className}">${changeStr}</td>
            <td></td>
        `;
        tbody.appendChild(tr);
    });
}

// Trade panel - wider buy input box, cost display
function updateTradeTable() {
    let tbody = document.getElementById('trade-table');
    tbody.innerHTML = "";
    STOCKS.forEach(stock => {
        let price = prices[stock.symbol];
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${stock.symbol}</td>
            <td>$${price.toFixed(2)}</td>
            <td>
                <input type="number" min="1" value="1" class="buy-input" id="buy_${stock.symbol}">
                <button onclick="buyStock('${stock.symbol}')">Buy</button>
                <span class="buy-cost" id="buy_cost_${stock.symbol}">$${price.toFixed(2)}</span>
            </td>
        `;
        tbody.appendChild(tr);

        // Add event listener for cost updating
        setTimeout(() => { // ensure DOM is ready
            const qtyInput = document.getElementById(`buy_${stock.symbol}`);
            const costSpan = document.getElementById(`buy_cost_${stock.symbol}`);
            if (qtyInput && costSpan) {
                qtyInput.addEventListener('input', function () {
                    let qty = parseInt(qtyInput.value) || 0;
                    let cost = qty * price;
                    costSpan.textContent = `$${cost.toFixed(2)}`;
                });
            }
        }, 0);
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
            let prevPrice = prevPrices[stock.symbol];
            let totalValue = owned * price;
            let valueChange = 0;

            if (prevPrice !== undefined && prevPrice !== price && prevOwned[stock.symbol] > 0) {
                valueChange = (price - prevPrice) * prevOwned[stock.symbol];
            }
            let changeStr = (valueChange > 0 ? "+" : "") + valueChange.toFixed(2);
            let className = valueChange > 0 ? "price-up" : valueChange < 0 ? "price-down" : "price-same";
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
        updateCash();
        updateLeaderboard();
        updatePortfolioTable();
    }
};
document.getElementById('next-day').onclick = function() {
    STOCKS.forEach(stock => {
        prevOwned[stock.symbol] = portfolio.stocks[stock.symbol];
    });
    setRandomPrices();
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
function loadScores() {
    let scores = JSON.parse(localStorage.getItem('leaderboard_scores') || "[]");
    return scores.sort((a, b) => b.value - a.value).slice(0, 10);
}
function saveScore() {
    let name = prompt("Enter your name for the leaderboard:");
    if (!name) return;
    let value = getPortfolioValue();
    let scores = loadScores();
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
