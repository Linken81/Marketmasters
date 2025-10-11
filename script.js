// Fictional stock market simulation with Chart.js, dark theme, animated transitions
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

// Portfolio setup
let portfolio = {
    cash: 10000,
    stocks: {}
};
STOCKS.forEach(stock => {
    portfolio.stocks[stock.symbol] = 0;
});

// Initial prices
let prices = {};
function randomPrice() {
    return +(Math.random() * 900 + 100).toFixed(2);
}
function setRandomPrices() {
    STOCKS.forEach(stock => {
        prices[stock.symbol] = randomPrice();
    });
}
setRandomPrices();

// Portfolio value tracking
let portfolioHistory = [getPortfolioValue()];
let day = 1;

// Chart.js setup with animated transitions
let ctx = document.getElementById('portfolioChart').getContext('2d');
let chartData = {
    labels: [day],
    datasets: [{
        label: 'Portfolio Value',
        data: [portfolioHistory[0]],
        borderColor: '#00FC87',
        backgroundColor: 'rgba(14,210,247,0.15)',
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointBackgroundColor: '#00FC87',
        pointBorderColor: '#23263A'
    }]
};
let portfolioChart = new Chart(ctx, {
    type: 'line',
    data: chartData,
    options: {
        animation: {
            duration: 900,
            easing: 'easeOutCubic'
        },
        scales: {
            x: {
                title: { display: true, text: 'Day', color: '#00FC87' },
                grid: { color: '#23263A' },
                ticks: { color: '#00FC87' }
            },
            y: {
                title: { display: true, text: 'Portfolio Value ($)', color: '#00FC87' },
                grid: { color: '#23263A' },
                ticks: { color: '#00FC87' }
            }
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

function updatePortfolioView() {
    document.getElementById('cash').textContent = `Cash: $${portfolio.cash.toFixed(2)}`;
    let ul = document.getElementById('stocks');
    ul.innerHTML = "";
    STOCKS.forEach(stock => {
        let qty = portfolio.stocks[stock.symbol] || 0;
        if (qty > 0) {
            let li = document.createElement('li');
            li.textContent = `${stock.name} (${stock.symbol}): ${qty} shares`;
            ul.appendChild(li);
        }
    });
}

function updateMarketView() {
    let tbody = document.getElementById('market-stocks');
    tbody.innerHTML = "";
    STOCKS.forEach(stock => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${stock.name} (${stock.symbol})</td>
            <td>$${prices[stock.symbol]}</td>
            <td>
                <input type="number" min="1" value="1" style="width:60px;" id="buy_${stock.symbol}">
                <button onclick="buyStock('${stock.symbol}')">Buy</button>
            </td>
            <td>
                <input type="number" min="1" value="1" style="width:60px;" id="sell_${stock.symbol}">
                <button onclick="sellStock('${stock.symbol}')">Sell</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.buyStock = function(symbol) {
    let qty = parseInt(document.getElementById(`buy_${symbol}`).value);
    let cost = prices[symbol] * qty;
    if (qty > 0 && portfolio.cash >= cost) {
        portfolio.cash -= cost;
        portfolio.stocks[symbol] += qty;
        updatePortfolioView();
    } else {
        animateButton(`buy_${symbol}`, false);
    }
};

window.sellStock = function(symbol) {
    let qty = parseInt(document.getElementById(`sell_${symbol}`).value);
    let owned = portfolio.stocks[symbol];
    if (qty > 0 && owned >= qty) {
        portfolio.cash += prices[symbol] * qty;
        portfolio.stocks[symbol] -= qty;
        updatePortfolioView();
    } else {
        animateButton(`sell_${symbol}`, false);
    }
};

// Animate input field on error
function animateButton(inputId, success) {
    let input = document.getElementById(inputId);
    input.style.transition = "box-shadow 0.3s";
    input.style.boxShadow = success ? "0 0 12px #00FC87" : "0 0 14px #FC0032";
    setTimeout(() => {
        input.style.boxShadow = "";
    }, 500);
}

document.getElementById('next-day').onclick = function() {
    setRandomPrices();
    updateMarketView();
    day++;
    let value = getPortfolioValue();
    portfolioHistory.push(value);
    portfolioChart.data.labels.push(day);
    portfolioChart.data.datasets[0].data.push(value);
    portfolioChart.update();
    animateCard('.chart-section');
};

// Animate card highlight
function animateCard(selector) {
    let el = document.querySelector(selector);
    if (!el) return;
    el.style.boxShadow = "0 0 36px 4px #00fc87";
    setTimeout(() => {
        el.style.boxShadow = "";
    }, 800);
}

function getPortfolioValue() {
    let value = portfolio.cash;
    STOCKS.forEach(stock => {
        value += portfolio.stocks[stock.symbol] * prices[stock.symbol];
    });
    return value;
}

// Leaderboard using localStorage
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
        let li = document.createElement('li');
        li.innerHTML = `<span style="color:#00FC87;">${idx+1}.</span> ${score.name}: <span style="color:#0ED2F7;">$${score.value}</span>`;
        ul.appendChild(li);
    });
}

// Initial UI setup
updatePortfolioView();
updateMarketView();
updateLeaderboard();
