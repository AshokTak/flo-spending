/* ===== FLO — APP.JS ===== */

// ===== DATA =====
const CATEGORIES = [
  { id: 'housing',       name: 'Housing',        icon: 'home',          color: '#4f9cf9' },
  { id: 'food',          name: 'Food & Dining',   icon: 'utensils',      color: '#ff7849' },
  { id: 'transport',     name: 'Transport',       icon: 'car',           color: '#00c8e0' },
  { id: 'shopping',      name: 'Shopping',        icon: 'shopping-bag',  color: '#a855f7' },
  { id: 'entertainment', name: 'Entertainment',   icon: 'tv',            color: '#f59e0b' },
  { id: 'health',        name: 'Health',          icon: 'heart',         color: '#ef4444' },
  { id: 'grocery',       name: 'Grocery',         icon: 'shopping-cart', color: '#10b981' },
  { id: 'travel',        name: 'Travel',          icon: 'plane',         color: '#06b6d4' },
  { id: 'bills',         name: 'Bills & Utilities',icon: 'zap',          color: '#eab308' },
  { id: 'personal',      name: 'Personal',        icon: 'user',          color: '#ec4899' },
  { id: 'income',        name: 'Income',          icon: 'trending-up',   color: '#00e5a0' },
  { id: 'other',         name: 'Other',           icon: 'circle',        color: '#64748b' },
];

const SPENDING_TYPES = [
  { id: 'mandatory_fixed',    label: 'Mandatory Fixed',    short: 'MF', tagClass: 'tag-mf', desc: 'Mortgage, Rent, Insurance' },
  { id: 'mandatory_variable', label: 'Mandatory Variable', short: 'MV', tagClass: 'tag-mv', desc: 'Groceries, Gas, Utilities' },
  { id: 'optional_fixed',     label: 'Optional Fixed',     short: 'OF', tagClass: 'tag-of', desc: 'Netflix, Gym, Subscriptions' },
  { id: 'optional_variable',  label: 'Optional Variable',  short: 'OV', tagClass: 'tag-ov', desc: 'Dining, Movies, Shopping' },
];

const CAT_KEYWORDS = {
  housing:       ['rent', 'mortgage', 'lease', 'apartment', 'hoa', 'home'],
  food:          ['restaurant', 'cafe', 'coffee', 'pizza', 'sushi', 'burger', 'dining', 'lunch', 'dinner', 'breakfast', 'doordash', 'grubhub', 'ubereats', 'food'],
  transport:     ['uber', 'lyft', 'taxi', 'bus', 'metro', 'gas', 'parking', 'toll', 'supercharge', 'tesla', 'car wash', 'transit'],
  shopping:      ['amazon', 'target', 'walmart', 'ebay', 'store', 'mall', 'shop', 'nordstrom', 'tj maxx', 'clothing'],
  entertainment: ['netflix', 'spotify', 'hulu', 'disney', 'apple tv', 'movie', 'concert', 'game', 'steam', 'theater'],
  health:        ['doctor', 'hospital', 'pharmacy', 'gym', 'fitness', 'medical', 'dental', 'vision', 'walgreens', 'cvs'],
  grocery:       ['whole foods', 'trader joe', 'kroger', 'safeway', 'costco', 'supermarket', 'grocery', 'market', 'aldi'],
  travel:        ['flight', 'hotel', 'airbnb', 'vacation', 'trip', 'airline', 'booking', 'expedia', 'vrbo'],
  bills:         ['electric', 'water', 'internet', 'phone', 'utility', 'bill', 'insurance', 'at&t', 'verizon', 'comcast', 'pge'],
  personal:      ['haircut', 'salon', 'spa', 'barber', 'nails', 'clothing', 'dry cleaning'],
  income:        ['salary', 'paycheck', 'direct deposit', 'refund', 'reimbursement', 'bonus'],
};

const ACCOUNT_COLORS = ['#00c8e0','#a855f7','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#8b5cf6','#14b8a6','#f97316'];

// ===== STATE =====
let state = {
  accounts: [],
  transactions: [],
  recurring: [],
  settings: { monthlyIncome: 0, currency: '$' },
};

let charts = {};
let currentModal = null;
let currentSection = 'dashboard';

// ===== INIT =====
function init() {
  loadState();
  populateSelects();
  navigate('dashboard');

  // Set today's date in transaction form
  document.getElementById('txn-date').valueAsDate = new Date();

  // Dashboard date
  const now = new Date();
  document.getElementById('dash-date').textContent =
    now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Month filter options
  buildMonthFilter();

  // Init lucide icons
  lucide.createIcons();

  // Load settings UI
  const s = state.settings;
  document.getElementById('set-income').value = s.monthlyIncome || '';
  document.getElementById('set-currency').value = s.currency || '$';
}

// ===== STORAGE =====
function loadState() {
  try {
    const saved = localStorage.getItem('flo_state');
    if (saved) state = JSON.parse(saved);
    if (!state.settings) state.settings = { monthlyIncome: 0, currency: '$' };
  } catch(e) { console.error('Load error', e); }
}

function saveState() {
  localStorage.setItem('flo_state', JSON.stringify(state));
}

// ===== NAVIGATION =====
function navigate(section) {
  currentSection = section;
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const el = document.getElementById('s-' + section);
  if (el) { el.classList.remove('hidden'); }

  const navEl = document.querySelector(`.nav-item[data-section="${section}"]`);
  if (navEl) navEl.classList.add('active');

  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');

  switch(section) {
    case 'dashboard':    renderDashboard(); break;
    case 'accounts':     renderAccounts(); break;
    case 'transactions': renderTransactions(); break;
    case 'recurring':    renderRecurring(); break;
    case 'analytics':    renderAnalytics(); break;
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ===== THEME =====
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  document.getElementById('icon-light').style.display = isDark ? '' : 'none';
  document.getElementById('icon-dark').style.display  = isDark ? 'none' : '';
  // Refresh charts
  Object.values(charts).forEach(c => { if(c) c.destroy(); });
  charts = {};
  if (currentSection === 'dashboard') renderDashboard();
  if (currentSection === 'analytics') renderAnalytics();
  lucide.createIcons();
}

// ===== HELPERS =====
const fmt = (n) => {
  const sym = state.settings.currency || '$';
  return sym + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const fmtSigned = (n) => (n < 0 ? '-' : '') + fmt(Math.abs(n));

function getCat(id) { return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length-1]; }
function getType(id) { return SPENDING_TYPES.find(t => t.id === id) || SPENDING_TYPES[3]; }
function getAccount(id) { return state.accounts.find(a => a.id === id); }

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

function currentMonthTransactions() {
  const now = new Date();
  return state.transactions.filter(t => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
}

function isDark() { return document.documentElement.getAttribute('data-theme') !== 'light'; }
function textColor() { return isDark() ? '#e2e8f5' : '#0f172a'; }
function gridColor() { return isDark() ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'; }

// ===== POPULATE SELECTS =====
function populateSelects() {
  // Category selects
  ['txn-category','rec-category'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = CATEGORIES.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  });

  // Category filter
  const cf = document.getElementById('txn-filter-cat');
  if (cf) {
    cf.innerHTML = '<option value="">All Categories</option>' +
      CATEGORIES.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  populateAccountSelects();
}

function populateAccountSelects() {
  const noAcc = '<option value="">— No Account —</option>';
  ['txn-account','rec-account'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = (id === 'rec-account' ? '<option value="">— None —</option>' : '') +
      state.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  });
}

function buildMonthFilter() {
  const sel = document.getElementById('txn-filter-month');
  if (!sel) return;
  const months = new Set();
  state.transactions.forEach(t => months.add(t.date.slice(0,7)));
  sel.innerHTML = '<option value="">All Months</option>' +
    [...months].sort().reverse().map(m => {
      const [y,mo] = m.split('-');
      const label = new Date(y, mo-1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return `<option value="${m}">${label}</option>`;
    }).join('');
}

// ===== KPI CALCULATIONS =====
function calcKPIs() {
  const txns = currentMonthTransactions();
  const income = parseFloat(state.settings.monthlyIncome) || 0;

  // Expenses (non-income)
  const expenses = txns.filter(t => t.category !== 'income').reduce((s, t) => s + t.amount, 0);
  const incomeLogged = txns.filter(t => t.category === 'income').reduce((s, t) => s + t.amount, 0);
  const totalIncome = income + incomeLogged;

  // Savings Rate
  const savingsRate = totalIncome > 0 ? ((totalIncome - expenses) / totalIncome * 100) : 0;

  // Burn Rate (monthly expenses)
  const burnRate = expenses;

  // Debt payments (mandatory fixed)
  const debtPayments = txns.filter(t => t.spendingType === 'mandatory_fixed').reduce((s,t) => s + t.amount, 0);
  const dti = totalIncome > 0 ? (debtPayments / totalIncome * 100) : 0;

  // Net Worth
  const assets = state.accounts.filter(a => a.type !== 'credit').reduce((s,a) => s + a.balance, 0);
  const liabilities = state.accounts.filter(a => a.type === 'credit').reduce((s,a) => s + Math.max(0, -a.balance), 0);
  const netWorth = assets - liabilities;

  return { savingsRate, burnRate, dti, netWorth, expenses, totalIncome, assets, liabilities };
}

// ===== DASHBOARD =====
function renderDashboard() {
  const kpis = calcKPIs();

  // KPI Cards
  const kpiEl = document.getElementById('kpi-grid');
  kpiEl.innerHTML = `
    <div class="kpi-card" style="--kpi-color:${kpis.netWorth >= 0 ? '#00e5a0' : '#ff4d6d'};--kpi-icon-bg:${kpis.netWorth >= 0 ? 'rgba(0,229,160,0.1)' : 'rgba(255,77,109,0.1)'}">
      <div class="kpi-icon"><i data-lucide="trending-up"></i></div>
      <div class="kpi-label">Net Worth</div>
      <div class="kpi-value" style="color:${kpis.netWorth >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(kpis.netWorth)}</div>
      <div class="kpi-delta">Assets − Liabilities</div>
    </div>
    <div class="kpi-card" style="--kpi-color:${kpis.savingsRate >= 20 ? '#00e5a0' : kpis.savingsRate >= 0 ? '#ffb830' : '#ff4d6d'}">
      <div class="kpi-icon"><i data-lucide="piggy-bank"></i></div>
      <div class="kpi-label">Savings Rate</div>
      <div class="kpi-value">${kpis.savingsRate.toFixed(1)}%</div>
      <div class="kpi-delta">${kpis.savingsRate >= 20 ? '✓ On track' : kpis.savingsRate >= 0 ? '⚠ Below target' : '✕ Overspending'}</div>
    </div>
    <div class="kpi-card" style="--kpi-color:#f59e0b;--kpi-icon-bg:rgba(245,158,11,0.1)">
      <div class="kpi-icon"><i data-lucide="flame"></i></div>
      <div class="kpi-label">Monthly Burn</div>
      <div class="kpi-value">${fmt(kpis.burnRate)}</div>
      <div class="kpi-delta">This month's expenses</div>
    </div>
    <div class="kpi-card" style="--kpi-color:${kpis.dti <= 36 ? '#00e5a0' : '#ff4d6d'};--kpi-icon-bg:${kpis.dti <= 36 ? 'rgba(0,229,160,0.1)' : 'rgba(255,77,109,0.1)'}">
      <div class="kpi-icon"><i data-lucide="percent"></i></div>
      <div class="kpi-label">Debt-to-Income</div>
      <div class="kpi-value">${kpis.dti.toFixed(1)}%</div>
      <div class="kpi-delta">${kpis.dti <= 36 ? '✓ Healthy' : '⚠ High'} (target ≤36%)</div>
    </div>
  `;

  // Category donut
  const now = new Date();
  document.getElementById('chart-month-label').textContent =
    now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  renderCategoryChart();
  renderTypeChart();
  renderRecentTransactions();
  renderUpcomingBills();
  lucide.createIcons();
}

function renderCategoryChart() {
  const txns = currentMonthTransactions().filter(t => t.category !== 'income');
  const totals = {};
  txns.forEach(t => { totals[t.category] = (totals[t.category] || 0) + t.amount; });

  const entries = Object.entries(totals).sort((a,b) => b[1]-a[1]);
  const total = entries.reduce((s,[,v]) => s+v, 0);

  if (charts.category) charts.category.destroy();

  const canvas = document.getElementById('chart-category');
  if (!entries.length) {
    canvas.parentElement.querySelector('.donut-center').innerHTML = `<span class="dc-amount">No data</span>`;
    return;
  }

  document.getElementById('donut-center').innerHTML = `
    <span class="dc-amount">${fmt(total)}</span>
    <span class="dc-label">This month</span>
  `;

  charts.category = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: entries.map(([k]) => getCat(k).name),
      datasets: [{
        data: entries.map(([,v]) => v),
        backgroundColor: entries.map(([k]) => getCat(k).color),
        borderWidth: 0,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      cutout: '72%',
      plugins: { legend: { display: false }, tooltip: {
        callbacks: {
          label: (ctx) => ` ${fmt(ctx.raw)} (${(ctx.raw/total*100).toFixed(1)}%)`
        }
      }},
    }
  });

  // Legend
  document.getElementById('chart-legend').innerHTML = entries.slice(0,6).map(([k,v]) => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${getCat(k).color}"></div>
      <span>${getCat(k).name}</span>
    </div>
  `).join('');
}

function renderTypeChart() {
  const txns = currentMonthTransactions().filter(t => t.category !== 'income');
  const totals = { mandatory_fixed: 0, mandatory_variable: 0, optional_fixed: 0, optional_variable: 0 };
  txns.forEach(t => { if (t.spendingType in totals) totals[t.spendingType] += t.amount; });

  const colors = { mandatory_fixed:'#3b82f6', mandatory_variable:'#00c8e0', optional_fixed:'#a855f7', optional_variable:'#f59e0b' };
  const labels = SPENDING_TYPES.map(t => t.label);
  const data = SPENDING_TYPES.map(t => totals[t.id]);
  const bgColors = SPENDING_TYPES.map(t => colors[t.id]);

  if (charts.type) charts.type.destroy();
  charts.type = new Chart(document.getElementById('chart-type'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data, backgroundColor: bgColors, borderRadius: 6, borderSkipped: false }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: (ctx) => ` ${fmt(ctx.raw)}` }
      }},
      scales: {
        x: { grid: { color: gridColor() }, ticks: { color: textColor(), font: { size: 10 }, maxRotation: 20 } },
        y: { grid: { color: gridColor() }, ticks: { color: textColor(), callback: v => (v >= 1000 ? '$' + (v/1000).toFixed(1) + 'k' : '$' + v) }, beginAtZero: true }
      }
    }
  });

  const total = data.reduce((s,v) => s+v, 0);
  document.getElementById('type-legend').innerHTML = SPENDING_TYPES.map((t,i) => `
    <div class="type-legend-item">
      <div class="type-legend-dot" style="background:${bgColors[i]}"></div>
      <span class="type-legend-label">${t.short}</span>
      <span class="type-legend-val">${fmt(data[i])}</span>
    </div>
  `).join('');
}

function renderRecentTransactions() {
  const recent = [...state.transactions].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,6);
  const el = document.getElementById('dash-recent');
  if (!recent.length) {
    el.innerHTML = '<div class="empty-state"><p>No transactions yet.<br>Add your first expense to get started.</p></div>';
    return;
  }
  el.innerHTML = recent.map(t => txnItemHTML(t)).join('');
}

function renderUpcomingBills() {
  const now = new Date();
  const today = now.getDate();
  const el = document.getElementById('dash-upcoming');

  if (!state.recurring.length) {
    el.innerHTML = '<div class="empty-state"><p>No recurring bills set up yet.</p></div>';
    return;
  }

  const sorted = [...state.recurring].sort((a,b) => a.dueDay - b.dueDay);
  el.innerHTML = sorted.map(r => {
    const daysUntil = r.dueDay >= today ? r.dueDay - today : (28 - today + r.dueDay);
    const dueClass = r.isPaid ? 'ok' : daysUntil < 0 ? 'overdue' : daysUntil <= 3 ? 'soon' : 'ok';
    const dueLabel = r.isPaid ? 'Paid' : daysUntil === 0 ? 'Today!' : daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : `in ${daysUntil}d`;
    return `
      <div class="upcoming-item">
        <span class="upcoming-day">${r.dueDay}</span>
        <span class="upcoming-name">${r.name}</span>
        <span class="upcoming-due ${dueClass}">${dueLabel}</span>
        <span class="upcoming-amount">${fmt(r.amount)}</span>
      </div>
    `;
  }).join('');
}

// ===== TRANSACTION ITEM HTML =====
function txnItemHTML(t, showActions = false) {
  const cat = getCat(t.category);
  const type = getType(t.spendingType);
  const acc = getAccount(t.accountId);
  const isIncome = t.category === 'income';
  const dateStr = new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `
    <div class="txn-item">
      <div class="txn-icon" style="background:${cat.color}22;color:${cat.color}">
        <i data-lucide="${cat.icon}"></i>
      </div>
      <div class="txn-details">
        <div class="txn-name">${t.description}</div>
        <div class="txn-meta">
          <span>${dateStr}</span>
          <span>·</span>
          <span>${cat.name}</span>
          ${acc ? `<span>·</span><span>${acc.name}</span>` : ''}
          <span class="txn-tag ${type.tagClass}">${type.short}</span>
        </div>
      </div>
      <div class="txn-amount ${isIncome ? 'income' : ''}">
        ${isIncome ? '+' : '-'}${fmt(t.amount)}
      </div>
      <div class="txn-actions">
        <button class="icon-btn" onclick="editTransaction('${t.id}')" title="Edit"><i data-lucide="pencil"></i></button>
        <button class="icon-btn del" onclick="deleteTransaction('${t.id}')" title="Delete"><i data-lucide="trash-2"></i></button>
      </div>
    </div>
  `;
}

// ===== ACCOUNTS =====
function renderAccounts() {
  const kpis = calcKPIs();

  // Net worth banner
  document.getElementById('net-worth-banner').innerHTML = `
    <div class="nw-item">
      <div class="nw-label">Net Worth</div>
      <div class="nw-value ${kpis.netWorth >= 0 ? 'positive' : 'negative'}">${fmt(kpis.netWorth)}</div>
    </div>
    <div class="nw-divider"></div>
    <div class="nw-item">
      <div class="nw-label">Total Assets</div>
      <div class="nw-value">${fmt(kpis.assets)}</div>
    </div>
    <div class="nw-divider"></div>
    <div class="nw-item">
      <div class="nw-label">Total Liabilities</div>
      <div class="nw-value ${kpis.liabilities > 0 ? 'negative' : ''}">${fmt(kpis.liabilities)}</div>
    </div>
    <div class="nw-divider"></div>
    <div class="nw-item">
      <div class="nw-label">Accounts</div>
      <div class="nw-value">${state.accounts.length}</div>
    </div>
  `;

  const grid = document.getElementById('accounts-grid');
  if (!state.accounts.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <i data-lucide="credit-card"></i>
      <p>No accounts yet.<br>Add your first account to start tracking.</p>
      <button class="btn btn-primary" style="margin-top:1rem" onclick="openModal('account')"><i data-lucide="plus"></i> Add Account</button>
    </div>`;
    lucide.createIcons();
    return;
  }

  grid.innerHTML = state.accounts.map(a => {
    const isCredit = a.type === 'credit';
    const balance = a.balance;
    const pct = isCredit && a.limit ? Math.min(100, Math.abs(balance) / a.limit * 100) : 0;
    const typeLabels = { checking:'Checking', savings:'Savings', credit:'Credit Card', investment:'Investment', cash:'Cash' };
    return `
      <div class="account-card" style="--acc-color:${a.color}">
        <div class="acc-header">
          <span class="acc-type-badge">${typeLabels[a.type] || a.type}</span>
          <div class="acc-actions">
            <button class="icon-btn" onclick="editAccount('${a.id}')"><i data-lucide="pencil"></i></button>
            <button class="icon-btn del" onclick="deleteAccount('${a.id}')"><i data-lucide="trash-2"></i></button>
          </div>
        </div>
        <div class="acc-name">${a.name}</div>
        <div class="acc-balance ${balance < 0 ? 'negative' : ''}">${fmt(balance)}</div>
        ${isCredit && a.limit ? `
          <div class="acc-progress">
            <div class="acc-sub">Credit used: ${fmt(Math.abs(balance))} / ${fmt(a.limit)} (${pct.toFixed(0)}%)</div>
            <div class="acc-progress-bar">
              <div class="acc-progress-fill" style="width:${pct}%;background:${a.color}"></div>
            </div>
          </div>
        ` : `<div class="acc-sub">${isCredit ? 'No limit set' : a.type === 'investment' ? 'Investment account' : 'Available balance'}</div>`}
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// ===== TRANSACTIONS =====
function renderTransactions() {
  const search = (document.getElementById('txn-search')?.value || '').toLowerCase();
  const filterCat = document.getElementById('txn-filter-cat')?.value || '';
  const filterType = document.getElementById('txn-filter-type')?.value || '';
  const filterMonth = document.getElementById('txn-filter-month')?.value || '';

  let filtered = [...state.transactions];
  if (search) filtered = filtered.filter(t =>
    t.description.toLowerCase().includes(search) ||
    (t.notes || '').toLowerCase().includes(search)
  );
  if (filterCat) filtered = filtered.filter(t => t.category === filterCat);
  if (filterType) filtered = filtered.filter(t => t.spendingType === filterType);
  if (filterMonth) filtered = filtered.filter(t => t.date.startsWith(filterMonth));

  filtered.sort((a,b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00'));

  const countEl = document.getElementById('txn-count');
  if (countEl) countEl.textContent = `${filtered.length} transaction${filtered.length !== 1 ? 's' : ''}`;

  const container = document.getElementById('txn-list');

  if (!filtered.length) {
    container.innerHTML = `<div class="card"><div class="empty-state"><p>No transactions found.</p></div></div>`;
    return;
  }

  // Group by date
  const groups = {};
  filtered.forEach(t => {
    const key = t.date;
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });

  container.innerHTML = Object.entries(groups).map(([date, txns]) => {
    const d = new Date(date + 'T00:00:00');
    const label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const dayTotal = txns.filter(t => t.category !== 'income').reduce((s,t) => s + t.amount, 0);
    return `
      <div class="card date-group">
        <div class="date-group-header">
          <span>${label}</span>
          <span class="date-group-total">${fmt(dayTotal)}</span>
        </div>
        ${txns.map(t => txnItemHTML(t)).join('')}
      </div>
    `;
  }).join('');

  buildMonthFilter();
  lucide.createIcons();
}

// ===== RECURRING =====
function renderRecurring() {
  const total = state.recurring.reduce((s,r) => s + r.amount, 0);
  const paid = state.recurring.filter(r => r.isPaid).reduce((s,r) => s + r.amount, 0);
  const remaining = total - paid;

  const sumEl = document.getElementById('rec-summary');
  if (sumEl) sumEl.textContent = `${fmt(total)}/mo total · ${fmt(remaining)} remaining this month`;

  renderRecurringCalendar();
  renderRecurringList();
  lucide.createIcons();
}

function renderRecurringCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const today = now.getDate();

  const billDays = {};
  state.recurring.forEach(r => {
    const day = Math.min(r.dueDay, daysInMonth);
    billDays[day] = r.isPaid;
  });

  const dowNames = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  let calHTML = `
    <div style="font-size:.78rem;font-weight:700;color:var(--text-secondary);margin-bottom:.5rem">
      ${now.toLocaleDateString('en-US',{month:'long',year:'numeric'})}
    </div>
    <div class="cal-header-days">
      ${dowNames.map(d => `<div class="cal-dow">${d}</div>`).join('')}
    </div>
    <div class="cal-grid">
      ${'<div></div>'.repeat(firstDay)}
  `;

  for (let day = 1; day <= daysInMonth; day++) {
    const hasBill = billDays.hasOwnProperty(day);
    const isPaid = billDays[day];
    const isToday = day === today;
    calHTML += `<div class="cal-day${hasBill ? ' has-bill' : ''}${isPaid ? ' paid' : ''}${isToday ? ' today' : ''}" title="${hasBill ? (isPaid ? '✓ Paid' : 'Bill due') : ''}">${day}</div>`;
  }

  calHTML += '</div>';
  document.getElementById('rec-calendar').innerHTML = calHTML;
}

function renderRecurringList() {
  const container = document.getElementById('rec-list');
  if (!state.recurring.length) {
    container.innerHTML = `<div class="card"><div class="empty-state"><p>No recurring bills yet.</p></div></div>`;
    return;
  }

  const sorted = [...state.recurring].sort((a,b) => a.dueDay - b.dueDay);
  container.innerHTML = sorted.map(r => {
    const cat = getCat(r.category);
    const type = getType(r.spendingType);
    const acc = getAccount(r.accountId);
    return `
      <div class="rec-item ${r.isPaid ? 'paid' : ''}">
        <div class="rec-day-badge">${r.dueDay}</div>
        <div class="rec-details">
          <div class="rec-name">${r.name}</div>
          <div class="rec-meta">${cat.name} · <span class="txn-tag ${type.tagClass}">${type.label}</span>${acc ? ' · ' + acc.name : ''}</div>
        </div>
        <div class="rec-amount">${fmt(r.amount)}</div>
        <div class="rec-actions">
          <button class="paid-btn ${r.isPaid ? 'is-paid' : ''}" onclick="togglePaid('${r.id}')">
            ${r.isPaid ? '✓ Paid' : 'Mark Paid'}
          </button>
          <button class="icon-btn" onclick="editRecurring('${r.id}')"><i data-lucide="pencil"></i></button>
          <button class="icon-btn del" onclick="deleteRecurring('${r.id}')"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
    `;
  }).join('');
}

function togglePaid(id) {
  const r = state.recurring.find(r => r.id === id);
  if (!r) return;
  r.isPaid = !r.isPaid;
  saveState();
  renderRecurring();
}

// ===== ANALYTICS =====
function renderAnalytics() {
  renderTrendChart();
  renderMandoChart();
  renderFixVarChart();
  renderBreakdownTable();
  lucide.createIcons();
}

function renderTrendChart() {
  const months = [];
  const totals = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    months.push(label);
    const y = d.getFullYear(), m = d.getMonth();
    const sum = state.transactions
      .filter(t => { const dt = new Date(t.date + 'T00:00:00'); return dt.getFullYear()===y && dt.getMonth()===m && t.category !== 'income'; })
      .reduce((s,t) => s + t.amount, 0);
    totals.push(sum);
  }

  if (charts.trend) charts.trend.destroy();
  charts.trend = new Chart(document.getElementById('chart-trend'), {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Monthly Spending',
        data: totals,
        borderColor: '#00c8e0',
        backgroundColor: 'rgba(0,200,224,0.08)',
        pointBackgroundColor: '#00c8e0',
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.raw)}` } } },
      scales: {
        x: { grid: { color: gridColor() }, ticks: { color: textColor() } },
        y: { grid: { color: gridColor() }, ticks: { color: textColor(), callback: v => fmt(v) }, beginAtZero: true }
      }
    }
  });
}

function renderMandoChart() {
  const txns = currentMonthTransactions().filter(t => t.category !== 'income');
  const mandatory = txns.filter(t => t.spendingType?.startsWith('mandatory')).reduce((s,t) => s+t.amount, 0);
  const optional  = txns.filter(t => t.spendingType?.startsWith('optional')).reduce((s,t) => s+t.amount, 0);

  if (charts.mando) charts.mando.destroy();
  charts.mando = new Chart(document.getElementById('chart-mando'), {
    type: 'doughnut',
    data: {
      labels: ['Mandatory', 'Optional'],
      datasets: [{ data: [mandatory, optional], backgroundColor: ['#3b82f6','#f59e0b'], borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { color: textColor(), padding: 16, font: { size: 12 } } },
        tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.raw)}` } }
      }
    }
  });
}

function renderFixVarChart() {
  const txns = currentMonthTransactions().filter(t => t.category !== 'income');
  const fixed    = txns.filter(t => t.spendingType?.endsWith('fixed')).reduce((s,t) => s+t.amount, 0);
  const variable = txns.filter(t => t.spendingType?.endsWith('variable')).reduce((s,t) => s+t.amount, 0);

  if (charts.fixvar) charts.fixvar.destroy();
  charts.fixvar = new Chart(document.getElementById('chart-fixvar'), {
    type: 'doughnut',
    data: {
      labels: ['Fixed', 'Variable'],
      datasets: [{ data: [fixed, variable], backgroundColor: ['#a855f7','#00c8e0'], borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { color: textColor(), padding: 16, font: { size: 12 } } },
        tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.raw)}` } }
      }
    }
  });
}

function renderBreakdownTable() {
  const txns = currentMonthTransactions().filter(t => t.category !== 'income');
  const totals = {};
  txns.forEach(t => { totals[t.category] = (totals[t.category] || 0) + t.amount; });
  const total = Object.values(totals).reduce((s,v) => s+v, 0);
  const sorted = Object.entries(totals).sort((a,b) => b[1]-a[1]);

  const el = document.getElementById('analytics-breakdown');
  if (!sorted.length) {
    el.innerHTML = '<div class="empty-state"><p>No data this month.</p></div>';
    return;
  }

  el.innerHTML = sorted.map(([k,v]) => {
    const cat = getCat(k);
    const pct = total > 0 ? (v/total*100) : 0;
    return `
      <div class="analytics-breakdown-row">
        <div class="abd-dot" style="background:${cat.color}"></div>
        <div class="abd-name">${cat.name}</div>
        <div class="abd-bar-wrap"><div class="abd-bar" style="width:${pct}%;background:${cat.color}"></div></div>
        <div class="abd-pct">${pct.toFixed(1)}%</div>
        <div class="abd-amount">${fmt(v)}</div>
      </div>
    `;
  }).join('');
}

// ===== MODALS =====
function openModal(type, id = null) {
  currentModal = type;
  const overlay = document.getElementById('overlay');
  overlay.classList.remove('hidden');

  // Hide all modals
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));

  if (type === 'account') {
    const modal = document.getElementById('modal-account');
    modal.classList.remove('hidden');
    document.getElementById('modal-account-title').textContent = id ? 'Edit Account' : 'Add Account';
    document.getElementById('form-account').reset();
    buildColorPicker();

    if (id) {
      const acc = state.accounts.find(a => a.id === id);
      if (acc) {
        document.getElementById('acc-id').value = acc.id;
        document.getElementById('acc-name').value = acc.name;
        document.getElementById('acc-type').value = acc.type;
        document.getElementById('acc-balance').value = acc.balance;
        document.getElementById('acc-limit').value = acc.limit || '';
        toggleCreditLimit();
        selectColor(acc.color);
      }
    } else {
      selectColor(ACCOUNT_COLORS[state.accounts.length % ACCOUNT_COLORS.length]);
    }
  }

  if (type === 'transaction') {
    const modal = document.getElementById('modal-transaction');
    modal.classList.remove('hidden');
    document.getElementById('modal-txn-title').textContent = id ? 'Edit Transaction' : 'Add Transaction';
    populateAccountSelects();
    const sym = state.settings.currency || '$';
    document.getElementById('txn-currency-symbol').textContent = sym;

    if (!id) {
      document.getElementById('form-transaction').reset();
      document.getElementById('txn-date').valueAsDate = new Date();
      document.getElementById('txn-id').value = '';
      document.getElementById('cat-suggestion').classList.add('hidden');
    } else {
      const t = state.transactions.find(t => t.id === id);
      if (t) {
        document.getElementById('txn-id').value = t.id;
        document.getElementById('txn-amount').value = t.amount;
        document.getElementById('txn-date').value = t.date;
        document.getElementById('txn-desc').value = t.description;
        document.getElementById('txn-category').value = t.category;
        document.getElementById('txn-type').value = t.spendingType;
        document.getElementById('txn-account').value = t.accountId || '';
        document.getElementById('txn-notes').value = t.notes || '';
      }
    }
  }

  if (type === 'recurring') {
    const modal = document.getElementById('modal-recurring');
    modal.classList.remove('hidden');
    document.getElementById('modal-rec-title').textContent = id ? 'Edit Recurring Bill' : 'Add Recurring Bill';
    populateAccountSelects();

    if (!id) {
      document.getElementById('form-recurring').reset();
      document.getElementById('rec-id').value = '';
    } else {
      const r = state.recurring.find(r => r.id === id);
      if (r) {
        document.getElementById('rec-id').value = r.id;
        document.getElementById('rec-name').value = r.name;
        document.getElementById('rec-amount').value = r.amount;
        document.getElementById('rec-day').value = r.dueDay;
        document.getElementById('rec-category').value = r.category;
        document.getElementById('rec-type').value = r.spendingType;
        document.getElementById('rec-account').value = r.accountId || '';
      }
    }
  }

  lucide.createIcons();
}

function closeModal() {
  document.getElementById('overlay').classList.add('hidden');
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  currentModal = null;
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('overlay')) closeModal();
}

// ===== COLOR PICKER =====
function buildColorPicker() {
  const el = document.getElementById('acc-color-picker');
  el.innerHTML = ACCOUNT_COLORS.map(c =>
    `<div class="color-dot" style="background:${c}" data-color="${c}" onclick="selectColor('${c}')"></div>`
  ).join('');
}

function selectColor(color) {
  document.querySelectorAll('.color-dot').forEach(d => {
    d.classList.toggle('selected', d.dataset.color === color);
  });
}

function getSelectedColor() {
  const sel = document.querySelector('.color-dot.selected');
  return sel ? sel.dataset.color : ACCOUNT_COLORS[0];
}

function toggleCreditLimit() {
  const type = document.getElementById('acc-type').value;
  document.getElementById('credit-limit-wrap').style.display = type === 'credit' ? '' : 'none';
}

// ===== CATEGORY AUTO-SUGGEST =====
function suggestCategory(desc) {
  const lower = desc.toLowerCase();
  for (const [catId, keywords] of Object.entries(CAT_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      const cat = getCat(catId);
      const chip = document.getElementById('cat-suggestion');
      chip.textContent = `Suggest: ${cat.name}`;
      chip.classList.remove('hidden');
      chip.onclick = () => {
        document.getElementById('txn-category').value = catId;
        // Also suggest spending type
        if (catId === 'housing') document.getElementById('txn-type').value = 'mandatory_fixed';
        else if (catId === 'entertainment') document.getElementById('txn-type').value = 'optional_fixed';
        else if (catId === 'food') document.getElementById('txn-type').value = 'optional_variable';
        else if (catId === 'bills') document.getElementById('txn-type').value = 'mandatory_variable';
        else if (catId === 'grocery') document.getElementById('txn-type').value = 'mandatory_variable';
        else if (catId === 'transport') document.getElementById('txn-type').value = 'mandatory_variable';
        chip.classList.add('hidden');
      };
      return;
    }
  }
  document.getElementById('cat-suggestion').classList.add('hidden');
}

// ===== SUBMIT HANDLERS =====
function submitAccount(e) {
  e.preventDefault();
  const id = document.getElementById('acc-id').value;
  const acc = {
    id: id || uid(),
    name: document.getElementById('acc-name').value,
    type: document.getElementById('acc-type').value,
    balance: parseFloat(document.getElementById('acc-balance').value) || 0,
    limit: parseFloat(document.getElementById('acc-limit').value) || null,
    color: getSelectedColor(),
  };

  if (id) {
    const idx = state.accounts.findIndex(a => a.id === id);
    if (idx > -1) state.accounts[idx] = acc;
  } else {
    state.accounts.push(acc);
  }

  saveState();
  populateAccountSelects();
  closeModal();
  renderAccounts();
}

function submitTransaction(e) {
  e.preventDefault();
  const id = document.getElementById('txn-id').value;
  const txn = {
    id: id || uid(),
    amount: parseFloat(document.getElementById('txn-amount').value),
    date: document.getElementById('txn-date').value,
    description: document.getElementById('txn-desc').value,
    category: document.getElementById('txn-category').value,
    spendingType: document.getElementById('txn-type').value,
    accountId: document.getElementById('txn-account').value || null,
    notes: document.getElementById('txn-notes').value,
  };

  if (id) {
    const idx = state.transactions.findIndex(t => t.id === id);
    if (idx > -1) state.transactions[idx] = txn;
  } else {
    state.transactions.push(txn);
  }

  saveState();
  closeModal();
  buildMonthFilter();
  navigate(currentSection);
}

function submitRecurring(e) {
  e.preventDefault();
  const id = document.getElementById('rec-id').value;
  const rec = {
    id: id || uid(),
    name: document.getElementById('rec-name').value,
    amount: parseFloat(document.getElementById('rec-amount').value),
    dueDay: parseInt(document.getElementById('rec-day').value),
    category: document.getElementById('rec-category').value,
    spendingType: document.getElementById('rec-type').value,
    accountId: document.getElementById('rec-account').value || null,
    isPaid: false,
  };

  if (id) {
    const idx = state.recurring.findIndex(r => r.id === id);
    if (idx > -1) { rec.isPaid = state.recurring[idx].isPaid; state.recurring[idx] = rec; }
  } else {
    state.recurring.push(rec);
  }

  saveState();
  closeModal();
  renderRecurring();
}

// ===== EDIT / DELETE =====
function editAccount(id) { openModal('account', id); }
function editTransaction(id) { openModal('transaction', id); }
function editRecurring(id) { openModal('recurring', id); }

function deleteAccount(id) {
  const acc = state.accounts.find(a => a.id === id);
  if (!acc) return;
  showConfirm(`Delete account "${acc.name}"? This will not delete associated transactions.`, () => {
    state.accounts = state.accounts.filter(a => a.id !== id);
    saveState();
    renderAccounts();
  });
}

function deleteTransaction(id) {
  const t = state.transactions.find(t => t.id === id);
  if (!t) return;
  showConfirm(`Delete transaction "${t.description}" (${fmt(t.amount)})?`, () => {
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveState();
    navigate(currentSection);
  });
}

function deleteRecurring(id) {
  const r = state.recurring.find(r => r.id === id);
  if (!r) return;
  showConfirm(`Delete recurring bill "${r.name}"?`, () => {
    state.recurring = state.recurring.filter(r => r.id !== id);
    saveState();
    renderRecurring();
  });
}

function showConfirm(msg, onConfirm) {
  currentModal = 'confirm';
  document.getElementById('overlay').classList.remove('hidden');
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  document.getElementById('modal-confirm').classList.remove('hidden');
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-btn').onclick = () => { onConfirm(); closeModal(); };
  lucide.createIcons();
}

// ===== SETTINGS =====
function saveSettings() {
  state.settings.monthlyIncome = parseFloat(document.getElementById('set-income').value) || 0;
  state.settings.currency = document.getElementById('set-currency').value || '$';
  saveState();
}

// ===== EXPORT / IMPORT =====
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `flo-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.accounts && data.transactions) {
        state = data;
        if (!state.settings) state.settings = { monthlyIncome: 0, currency: '$' };
        saveState();
        populateSelects();
        buildMonthFilter();
        navigate(currentSection);
        document.getElementById('set-income').value = state.settings.monthlyIncome || '';
        document.getElementById('set-currency').value = state.settings.currency || '$';
        alert('Data imported successfully!');
      } else {
        alert('Invalid file format.');
      }
    } catch(err) { alert('Failed to parse file: ' + err.message); }
  };
  reader.readAsText(file);
}

function clearAllData() {
  if (confirm('Clear ALL data? This cannot be undone.')) {
    state = { accounts: [], transactions: [], recurring: [], settings: { monthlyIncome: 0, currency: '$' } };
    saveState();
    navigate('dashboard');
  }
}

// ===== SEED DEMO DATA =====
function seedDemoData() {
  if (state.accounts.length || state.transactions.length) return;

  state.accounts = [
    { id: uid(), name: 'Chase Checking', type: 'checking', balance: 4820.50, limit: null, color: '#00c8e0' },
    { id: uid(), name: 'Chase Sapphire', type: 'credit',   balance: -1240.00, limit: 10000, color: '#a855f7' },
    { id: uid(), name: 'HYSA Savings',   type: 'savings',  balance: 22500.00, limit: null, color: '#10b981' },
    { id: uid(), name: 'Brokerage',      type: 'investment',balance: 45200.00, limit: null, color: '#f59e0b' },
  ];

  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2,'0');
  const y = now.getFullYear();

  const addTxn = (desc, amount, day, cat, type, accIdx) => ({
    id: uid(),
    description: desc, amount,
    date: `${y}-${m}-${String(day).padStart(2,'0')}`,
    category: cat, spendingType: type,
    accountId: state.accounts[accIdx]?.id || null,
    notes: '',
  });

  state.transactions = [
    addTxn('Rent Payment',      2200, 1,  'housing',       'mandatory_fixed',    0),
    addTxn('PG&E Electric',       85, 3,  'bills',         'mandatory_variable', 0),
    addTxn('Whole Foods',        134, 4,  'grocery',       'mandatory_variable', 1),
    addTxn('Netflix',             22, 5,  'entertainment', 'optional_fixed',     1),
    addTxn('Spotify',             12, 5,  'entertainment', 'optional_fixed',     1),
    addTxn('Chipotle',            18, 6,  'food',          'optional_variable',  1),
    addTxn('Tesla Supercharge',   28, 8,  'transport',     'mandatory_variable', 0),
    addTxn('Trader Joes',         90, 10, 'grocery',       'mandatory_variable', 1),
    addTxn('Amazon Purchase',     67, 11, 'shopping',      'optional_variable',  1),
    addTxn('Doctor Visit',        40, 12, 'health',        'mandatory_variable', 0),
    addTxn('Gym Membership',      55, 13, 'health',        'optional_fixed',     1),
    addTxn('Restaurant Dinner',   95, 14, 'food',          'optional_variable',  1),
    addTxn('Internet (Comcast)',   80, 15, 'bills',         'mandatory_fixed',    0),
    addTxn('Car Insurance',      180, 15, 'bills',         'mandatory_fixed',    0),
    addTxn('Target Run',          58, 17, 'shopping',      'optional_variable',  1),
    addTxn('Coffee Shop',         14, 18, 'food',          'optional_variable',  1),
    addTxn('Movie Tickets',       38, 20, 'entertainment', 'optional_variable',  1),
    addTxn('Uber Ride',           22, 21, 'transport',     'optional_variable',  0),
    addTxn('Phone Bill (AT&T)',   85, 22, 'bills',         'mandatory_fixed',    0),
  ];

  state.recurring = [
    { id: uid(), name: 'Rent',         amount: 2200, dueDay: 1,  category: 'housing',       spendingType: 'mandatory_fixed',    accountId: state.accounts[0].id, isPaid: true },
    { id: uid(), name: 'Car Insurance',amount: 180,  dueDay: 15, category: 'bills',         spendingType: 'mandatory_fixed',    accountId: state.accounts[0].id, isPaid: true },
    { id: uid(), name: 'Netflix',      amount: 22,   dueDay: 5,  category: 'entertainment', spendingType: 'optional_fixed',     accountId: state.accounts[1].id, isPaid: true },
    { id: uid(), name: 'Spotify',      amount: 12,   dueDay: 5,  category: 'entertainment', spendingType: 'optional_fixed',     accountId: state.accounts[1].id, isPaid: true },
    { id: uid(), name: 'Gym',          amount: 55,   dueDay: 13, category: 'health',        spendingType: 'optional_fixed',     accountId: state.accounts[1].id, isPaid: true },
    { id: uid(), name: 'Comcast',      amount: 80,   dueDay: 15, category: 'bills',         spendingType: 'mandatory_fixed',    accountId: state.accounts[0].id, isPaid: true },
    { id: uid(), name: 'AT&T Phone',   amount: 85,   dueDay: 22, category: 'bills',         spendingType: 'mandatory_fixed',    accountId: state.accounts[0].id, isPaid: false },
    { id: uid(), name: 'PG&E',         amount: 85,   dueDay: 3,  category: 'bills',         spendingType: 'mandatory_variable', accountId: state.accounts[0].id, isPaid: true },
  ];

  state.settings = { monthlyIncome: 8500, currency: '$' };
  saveState();
}

// ===== START =====
seedDemoData();
init();
