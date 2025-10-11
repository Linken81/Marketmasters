// Basic stock market simulation
const STOCKS = [
    { symbol: "AAPL", name: "Apple" },
    { symbol: "GOOG", name: "Google" },
    { symbol: "TSLA", name: "Tesla" },
    { symbol: "AMZN", name: "Amazon" }
];

let portfolio = {
    cash: 10000,
    stocks: { AAPL: 0, GOOG: 0, TSLA: 0, AMZN: 0 }
};

// Simulate initial prices
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
        alert("Not enough cash or invalid quantity!");
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
        alert("Not enough shares or invalid quantity!");
    }
};

document.getElementById('next-day').onclick = function() {
    setRandomPrices();
    updateMarketView();
};

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
    scores.forEach(score => {
        let li = document.createElement('li');
        li.textContent = `${score.name}: $${score.value}`;
        ul.appendChild(li);
    });
}

// Initial UI setup
updatePortfolioView();
updateMarketView();
updateLeaderboard();