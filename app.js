/* ===== FLO v2 — APP.JS ===== */

// ===== CONSTANTS =====
const CATEGORIES = [
  { id: 'housing',       name: 'Housing',          icon: 'home',          color: '#4f9cf9' },
  { id: 'food',          name: 'Food & Dining',     icon: 'utensils',      color: '#ff7849' },
  { id: 'transport',     name: 'Transport',         icon: 'car',           color: '#00c8e0' },
  { id: 'shopping',      name: 'Shopping',          icon: 'shopping-bag',  color: '#a855f7' },
  { id: 'entertainment', name: 'Entertainment',     icon: 'tv',            color: '#f59e0b' },
  { id: 'health',        name: 'Health',            icon: 'heart',         color: '#ef4444' },
  { id: 'grocery',       name: 'Grocery',           icon: 'shopping-cart', color: '#10b981' },
  { id: 'travel',        name: 'Travel',            icon: 'plane',         color: '#06b6d4' },
  { id: 'bills',         name: 'Bills & Utilities', icon: 'zap',           color: '#eab308' },
  { id: 'personal',      name: 'Personal',          icon: 'user',          color: '#ec4899' },
  { id: 'income',        name: 'Income',            icon: 'trending-up',   color: '#00e5a0' },
  { id: 'other',         name: 'Other',             icon: 'circle',        color: '#64748b' },
];

const SPENDING_TYPES = [
  { id: 'mandatory_fixed',    label: 'Mandatory Fixed',    short: 'MF', tagClass: 'tag-mf', desc: 'Mortgage, Rent, Insurance' },
  { id: 'mandatory_variable', label: 'Mandatory Variable', short: 'MV', tagClass: 'tag-mv', desc: 'Groceries, Gas, Utilities' },
  { id: 'optional_fixed',     label: 'Optional Fixed',     short: 'OF', tagClass: 'tag-of', desc: 'Netflix, Gym, Subscriptions' },
  { id: 'optional_variable',  label: 'Optional Variable',  short: 'OV', tagClass: 'tag-ov', desc: 'Dining, Movies, Shopping' },
];

const FREQUENCIES = [
  { id: 'monthly',      label: 'Monthly',      monthlyMult: 1,        hint: '' },
  { id: 'bi-weekly',    label: 'Bi-Weekly',    monthlyMult: 26/12,    hint: 'Every 2 weeks — ~2.17× per month' },
  { id: 'weekly',       label: 'Weekly',       monthlyMult: 52/12,    hint: 'Every week — ~4.33× per month' },
  { id: 'semi-monthly', label: 'Semi-Monthly', monthlyMult: 2,        hint: 'Twice a month (set day = 1st occurrence, 2nd = +15 days)' },
  { id: 'quarterly',    label: 'Quarterly',    monthlyMult: 1/3,      hint: 'Every 3 months from the start date' },
  { id: 'annual',       label: 'Annual',       monthlyMult: 1/12,     hint: 'Once a year on the start date' },
];

const ACCOUNT_COLORS = ['#00c8e0','#a855f7','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#8b5cf6','#14b8a6','#f97316'];
const GOAL_COLORS    = ['#00e5a0','#00c8e0','#a855f7','#f59e0b','#ef4444','#3b82f6','#ec4899','#10b981'];

const CAT_KEYWORDS = {
  housing:       ['rent','mortgage','lease','apartment','hoa','home depot','lowe'],
  food:          ['restaurant','cafe','coffee','pizza','sushi','burger','dining','lunch','dinner','breakfast','doordash','grubhub','ubereats','chipotle','mcdonald','starbucks','food'],
  transport:     ['uber','lyft','taxi','bus','metro','gas','parking','toll','supercharge','tesla','car wash','transit','bart','caltrain'],
  shopping:      ['amazon','target','walmart','ebay','store','mall','nordstrom','tj maxx','clothing','bestbuy'],
  entertainment: ['netflix','spotify','hulu','disney','apple tv','movie','concert','game','steam','theater'],
  health:        ['doctor','hospital','pharmacy','gym','fitness','medical','dental','vision','walgreens','cvs','kaiser'],
  grocery:       ['whole foods','trader joe','kroger','safeway','costco','supermarket','grocery','market','aldi','wegman'],
  travel:        ['flight','hotel','airbnb','vacation','trip','airline','booking','expedia','vrbo','delta','united'],
  bills:         ['electric','water','internet','phone','utility','bill','insurance','at&t','verizon','comcast','pge','t-mobile'],
  personal:      ['haircut','salon','spa','barber','nails','dry cleaning'],
  income:        ['salary','paycheck','direct deposit','refund','reimbursement','bonus','deposit'],
};

// ===== STATE =====
let state = {
  accounts:     [],
  transactions: [],
  recurring:    [],
  budgets:      [],
  goals:        [],
  settings: {
    payFrequency:        'monthly',
    incomePerPeriod:     0,
    nextPayDate:         '',
    currency:            '$',
    lastResetKey:        '',
  },
};

let charts       = {};
let currentModal = null;
let currentSection = 'dashboard';
let viewPeriod   = 'current-month'; // 'current-month' | 'last-month' | 'pay-period'

// ===== INIT =====
// Called by auth.js after Firestore state is loaded.
function init() {
  autoResetRecurring();
  populateSelects();

  document.getElementById('txn-date').valueAsDate = new Date();

  const now = new Date();
  document.getElementById('dash-date').textContent =
    now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  buildMonthFilter();
  loadSettingsUI();
  navigate('dashboard');
  lucide.createIcons();
}

// saveState() and loadState() are provided by auth.js (Firestore).
// This stub prevents errors if auth.js hasn't loaded yet.
if (typeof saveState === 'undefined') {
  window.saveState = function() { console.warn('saveState called before auth loaded'); };
}

// ===== AUTO-RESET isPaid MONTHLY =====
function autoResetRecurring() {
  const now = new Date();
  const key = `${now.getFullYear()}-${now.getMonth()}`;
  if (state.settings.lastResetKey !== key) {
    state.recurring.forEach(r => { r.isPaid = false; });
    state.settings.lastResetKey = key;
    saveState();
  }
}

// ===== PAY PERIOD LOGIC =====
function getPayPeriod(type) {
  const now  = new Date();
  const freq = state.settings.payFrequency || 'monthly';
  type = type || viewPeriod;

  if (type === 'last-month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end   = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start, end, label: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), incomePerPeriod: getMonthlyIncome() };
  }

  if (type === 'current-month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end, label: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), incomePerPeriod: getMonthlyIncome() };
  }

  // Pay period view
  if (freq === 'semi-monthly') {
    const day = now.getDate();
    if (day <= 15) {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end   = new Date(now.getFullYear(), now.getMonth(), 15);
      return { start, end, label: fmtDateShort(start) + ' – ' + fmtDateShort(end), incomePerPeriod: state.settings.incomePerPeriod || 0 };
    } else {
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const start = new Date(now.getFullYear(), now.getMonth(), 16);
      const end   = new Date(now.getFullYear(), now.getMonth(), lastDay);
      return { start, end, label: fmtDateShort(start) + ' – ' + fmtDateShort(end), incomePerPeriod: state.settings.incomePerPeriod || 0 };
    }
  }

  if (freq === 'bi-weekly' && state.settings.nextPayDate) {
    const anchor = new Date(state.settings.nextPayDate + 'T00:00:00');
    // Find the bi-weekly period containing today
    let ps = new Date(anchor);
    // Walk back to the period that contains today
    while (ps > now) ps = new Date(ps.getTime() - 14 * 86400000);
    while (new Date(ps.getTime() + 14 * 86400000) <= now) ps = new Date(ps.getTime() + 14 * 86400000);
    const pe = new Date(ps.getTime() + 13 * 86400000);
    return { start: ps, end: pe, label: fmtDateShort(ps) + ' – ' + fmtDateShort(pe), incomePerPeriod: state.settings.incomePerPeriod || 0 };
  }

  if (freq === 'weekly' && state.settings.nextPayDate) {
    const anchor = new Date(state.settings.nextPayDate + 'T00:00:00');
    let ps = new Date(anchor);
    while (ps > now) ps = new Date(ps.getTime() - 7 * 86400000);
    while (new Date(ps.getTime() + 7 * 86400000) <= now) ps = new Date(ps.getTime() + 7 * 86400000);
    const pe = new Date(ps.getTime() + 6 * 86400000);
    return { start: ps, end: pe, label: fmtDateShort(ps) + ' – ' + fmtDateShort(pe), incomePerPeriod: state.settings.incomePerPeriod || 0 };
  }

  // Fallback: current month
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start, end, label: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), incomePerPeriod: getMonthlyIncome() };
}

function getMonthlyIncome() {
  const freq  = state.settings.payFrequency || 'monthly';
  const perPeriod = parseFloat(state.settings.incomePerPeriod) || 0;
  const f = FREQUENCIES.find(f => f.id === freq);
  return perPeriod * (f ? f.monthlyMult : 1);
}

function currentPeriodTransactions() {
  const p = getPayPeriod(viewPeriod);
  return state.transactions.filter(t => {
    const d = new Date(t.date + 'T00:00:00');
    return d >= p.start && d <= p.end;
  });
}

function currentMonthTransactions() {
  const now = new Date();
  return state.transactions.filter(t => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
}

// Monthly equivalent for a recurring item
function monthlyEquivalent(amount, frequency) {
  const f = FREQUENCIES.find(f => f.id === (frequency || 'monthly'));
  return amount * (f ? f.monthlyMult : 1);
}

// Occurrences of a recurring item in a given year/month (for calendar)
function getOccurrencesInMonth(r, year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const freq = r.frequency || 'monthly';
  const results = [];

  if (freq === 'monthly' || freq === 'semi-monthly') {
    const day = Math.min(r.dueDay || 1, daysInMonth);
    results.push(day);
    if (freq === 'semi-monthly') {
      const day2 = Math.min((r.dueDay || 1) + 15, daysInMonth);
      if (day2 !== day) results.push(day2);
    }
  } else if ((freq === 'bi-weekly' || freq === 'weekly') && r.startDate) {
    const anchor = new Date(r.startDate + 'T00:00:00');
    const interval = freq === 'weekly' ? 7 : 14;
    for (let d = 1; d <= daysInMonth; d++) {
      const target = new Date(year, month, d);
      const diff = Math.round((target - anchor) / 86400000);
      if (diff >= 0 && diff % interval === 0) results.push(d);
    }
  } else if (freq === 'quarterly' && r.startDate) {
    const anchor = new Date(r.startDate + 'T00:00:00');
    const aYear = anchor.getFullYear(), aMonth = anchor.getMonth();
    const monthsDiff = (year - aYear) * 12 + (month - aMonth);
    if (monthsDiff >= 0 && monthsDiff % 3 === 0) {
      results.push(Math.min(anchor.getDate(), daysInMonth));
    }
  } else if (freq === 'annual' && r.startDate) {
    const anchor = new Date(r.startDate + 'T00:00:00');
    if (anchor.getMonth() === month) results.push(Math.min(anchor.getDate(), daysInMonth));
  }

  return results;
}

// Next due date of a recurring item
function nextDueDate(r) {
  const now = new Date();
  const freq = r.frequency || 'monthly';
  const year = now.getFullYear(), month = now.getMonth(), today = now.getDate();

  if (freq === 'monthly' || freq === 'semi-monthly') {
    const day = r.dueDay || 1;
    if (day >= today) return new Date(year, month, day);
    // Next month
    const daysNext = new Date(year, month + 2, 0).getDate();
    return new Date(year, month + 1, Math.min(day, daysNext));
  }

  if ((freq === 'bi-weekly' || freq === 'weekly') && r.startDate) {
    const anchor = new Date(r.startDate + 'T00:00:00');
    const interval = freq === 'weekly' ? 7 : 14;
    let next = new Date(anchor);
    while (next < now) next = new Date(next.getTime() + interval * 86400000);
    return next;
  }

  if (freq === 'quarterly' && r.startDate) {
    const anchor = new Date(r.startDate + 'T00:00:00');
    let next = new Date(anchor);
    while (next < now) next = new Date(next.getFullYear(), next.getMonth() + 3, next.getDate());
    return next;
  }

  if (freq === 'annual' && r.startDate) {
    const anchor = new Date(r.startDate + 'T00:00:00');
    let next = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
    while (next < now) next = new Date(next.getFullYear() + 1, next.getMonth(), next.getDate());
    return next;
  }

  return null;
}

// ===== HELPERS =====
const fmt = n => {
  const sym = state.settings.currency || '$';
  return sym + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
function fmtDateShort(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function getCat(id) { return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length-1]; }
function getType(id) { return SPENDING_TYPES.find(t => t.id === id) || SPENDING_TYPES[3]; }
function getAccount(id) { return state.accounts.find(a => a.id === id); }
function isDark() { return document.documentElement.getAttribute('data-theme') !== 'light'; }
function textColor() { return isDark() ? '#e2e8f5' : '#0f172a'; }
function gridColor() { return isDark() ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'; }

// ===== KPI CALC =====
function calcKPIs() {
  const txns = currentPeriodTransactions();
  const period = getPayPeriod(viewPeriod);

  const expenses     = txns.filter(t => t.category !== 'income').reduce((s,t) => s + t.amount, 0);
  const incomeLogged = txns.filter(t => t.category === 'income').reduce((s,t) => s + t.amount, 0);
  const totalIncome  = period.incomePerPeriod + incomeLogged;

  const savingsRate = totalIncome > 0 ? (totalIncome - expenses) / totalIncome * 100 : 0;
  const burnRate    = expenses;
  const debtPmts    = txns.filter(t => t.spendingType === 'mandatory_fixed').reduce((s,t) => s + t.amount, 0);
  const dti         = totalIncome > 0 ? (debtPmts / totalIncome * 100) : 0;

  const assets      = state.accounts.filter(a => a.type !== 'credit').reduce((s,a) => s + a.balance, 0);
  const liabilities = state.accounts.filter(a => a.type === 'credit').reduce((s,a) => s + Math.max(0, -a.balance), 0);
  const netWorth    = assets - liabilities;

  return { savingsRate, burnRate, dti, netWorth, expenses, totalIncome, assets, liabilities };
}

// ===== NAVIGATION =====
function navigate(section) {
  currentSection = section;
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const el = document.getElementById('s-' + section);
  if (el) el.classList.remove('hidden');
  const nav = document.querySelector(`.nav-item[data-section="${section}"]`);
  if (nav) nav.classList.add('active');
  document.getElementById('sidebar').classList.remove('open');

  switch(section) {
    case 'dashboard':    renderDashboard(); break;
    case 'accounts':     renderAccounts(); break;
    case 'transactions': renderTransactions(); break;
    case 'recurring':    renderRecurring(); break;
    case 'goals':        renderGoals(); break;
    case 'analytics':    renderAnalytics(); break;
  }
}

function setViewPeriod(period) {
  viewPeriod = period;
  document.querySelectorAll('.period-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.period === period);
  });
  renderDashboard();
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

// ===== THEME =====
function toggleTheme() {
  const html = document.documentElement;
  const isDk = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDk ? 'light' : 'dark');
  document.getElementById('icon-light').style.display = isDk ? '' : 'none';
  document.getElementById('icon-dark').style.display  = isDk ? 'none' : '';
  Object.values(charts).forEach(c => { if(c) c.destroy(); });
  charts = {};
  if (currentSection === 'dashboard') renderDashboard();
  if (currentSection === 'analytics') renderAnalytics();
  lucide.createIcons();
}

// ===== SELECTS =====
function populateSelects() {
  ['txn-category','rec-category','budget-category'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = CATEGORIES.filter(c => c.id !== 'income' || id === 'txn-category')
      .map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  });
  const cf = document.getElementById('txn-filter-cat');
  if (cf) cf.innerHTML = '<option value="">All Categories</option>' +
    CATEGORIES.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  populateAccountSelects();
}

function populateAccountSelects() {
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
  const months = new Set(state.transactions.map(t => t.date.slice(0,7)));
  sel.innerHTML = '<option value="">All Months</option>' +
    [...months].sort().reverse().map(m => {
      const [y,mo] = m.split('-');
      return `<option value="${m}">${new Date(y, mo-1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</option>`;
    }).join('');
}

// ===== DASHBOARD =====
function renderDashboard() {
  const kpis = calcKPIs();
  const period = getPayPeriod(viewPeriod);

  // Period label
  const lb = document.getElementById('period-label-bar');
  lb.innerHTML = `<span class="period-label-text"><i data-lucide="calendar-range"></i> ${period.label}</span>`;

  // KPI Cards
  document.getElementById('kpi-grid').innerHTML = `
    <div class="kpi-card" style="--kpi-color:${kpis.netWorth>=0?'#00e5a0':'#ff4d6d'};--kpi-icon-bg:${kpis.netWorth>=0?'rgba(0,229,160,0.1)':'rgba(255,77,109,0.1)'}">
      <div class="kpi-icon"><i data-lucide="trending-up"></i></div>
      <div class="kpi-label">Net Worth</div>
      <div class="kpi-value" style="color:${kpis.netWorth>=0?'var(--green)':'var(--red)'}">${fmt(kpis.netWorth)}</div>
      <div class="kpi-delta">Assets − Liabilities</div>
    </div>
    <div class="kpi-card" style="--kpi-color:${kpis.savingsRate>=20?'#00e5a0':kpis.savingsRate>=0?'#ffb830':'#ff4d6d'}">
      <div class="kpi-icon"><i data-lucide="piggy-bank"></i></div>
      <div class="kpi-label">Savings Rate</div>
      <div class="kpi-value">${kpis.savingsRate.toFixed(1)}%</div>
      <div class="kpi-delta">${kpis.savingsRate>=20?'✓ On track':kpis.savingsRate>=0?'⚠ Below 20% target':'✕ Overspending'}</div>
    </div>
    <div class="kpi-card" style="--kpi-color:#f59e0b;--kpi-icon-bg:rgba(245,158,11,0.1)">
      <div class="kpi-icon"><i data-lucide="flame"></i></div>
      <div class="kpi-label">${viewPeriod === 'pay-period' ? 'Period' : 'Monthly'} Burn</div>
      <div class="kpi-value">${fmt(kpis.burnRate)}</div>
      <div class="kpi-delta">${period.label} expenses</div>
    </div>
    <div class="kpi-card" style="--kpi-color:${kpis.dti<=36?'#00e5a0':'#ff4d6d'};--kpi-icon-bg:${kpis.dti<=36?'rgba(0,229,160,0.1)':'rgba(255,77,109,0.1)'}">
      <div class="kpi-icon"><i data-lucide="percent"></i></div>
      <div class="kpi-label">Debt-to-Income</div>
      <div class="kpi-value">${kpis.dti.toFixed(1)}%</div>
      <div class="kpi-delta">${kpis.dti<=36?'✓ Healthy':'⚠ High'} (target ≤36%)</div>
    </div>
  `;

  renderBudgetProgress();
  renderCategoryChart();
  renderTypeChart();
  renderRecentTransactions();
  renderUpcomingBills();
  renderCashFlow();
  lucide.createIcons();
}

// ===== BUDGET PROGRESS =====
function renderBudgetProgress() {
  const el = document.getElementById('budget-progress-list');
  const card = document.getElementById('budget-overview-card');

  if (!state.budgets.length) {
    card.classList.add('hidden');
    return;
  }
  card.classList.remove('hidden');

  // Always use current month for budget comparison
  const monthTxns = currentMonthTransactions().filter(t => t.category !== 'income');
  const spent = {};
  monthTxns.forEach(t => { spent[t.category] = (spent[t.category] || 0) + t.amount; });

  el.innerHTML = state.budgets.map(b => {
    const s     = spent[b.category] || 0;
    const pct   = Math.min(100, b.amount > 0 ? s / b.amount * 100 : 0);
    const over  = s > b.amount;
    const cat   = getCat(b.category);
    const color = over ? 'var(--red)' : pct > 80 ? 'var(--amber)' : cat.color;
    return `
      <div class="budget-row">
        <div class="budget-cat-dot" style="background:${cat.color}"></div>
        <div class="budget-name">${cat.name}</div>
        <div class="budget-bar-wrap">
          <div class="budget-bar" style="width:${pct}%;background:${color}"></div>
        </div>
        <div class="budget-amounts">
          <span class="budget-spent" style="color:${over?'var(--red)':''}">${fmt(s)}</span>
          <span class="budget-total"> / ${fmt(b.amount)}</span>
          ${over ? '<span class="budget-over-badge">OVER</span>' : ''}
        </div>
        <button class="icon-btn del" onclick="deleteBudget('${b.id}')"><i data-lucide="trash-2"></i></button>
      </div>
    `;
  }).join('');
}

// ===== CATEGORY CHART =====
function renderCategoryChart() {
  const txns = currentPeriodTransactions().filter(t => t.category !== 'income');
  const totals = {};
  txns.forEach(t => { totals[t.category] = (totals[t.category] || 0) + t.amount; });
  const entries = Object.entries(totals).sort((a,b) => b[1]-a[1]);
  const total   = entries.reduce((s,[,v]) => s+v, 0);
  const period  = getPayPeriod(viewPeriod);

  document.getElementById('chart-month-label').textContent = period.label;
  if (charts.category) charts.category.destroy();

  if (!entries.length) {
    document.getElementById('donut-center').innerHTML = `<span class="dc-amount" style="font-size:.9rem;color:var(--text-secondary)">No data</span>`;
    document.getElementById('chart-legend').innerHTML = '';
    return;
  }

  document.getElementById('donut-center').innerHTML = `
    <span class="dc-amount">${fmt(total)}</span>
    <span class="dc-label">Total</span>
  `;

  charts.category = new Chart(document.getElementById('chart-category'), {
    type: 'doughnut',
    data: {
      labels: entries.map(([k]) => getCat(k).name),
      datasets: [{ data: entries.map(([,v]) => v), backgroundColor: entries.map(([k]) => getCat(k).color), borderWidth: 0, hoverOffset: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: '72%',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.raw)} (${(ctx.raw/total*100).toFixed(1)}%)` } } }
    }
  });

  document.getElementById('chart-legend').innerHTML = entries.slice(0,6).map(([k]) => `
    <div class="legend-item"><div class="legend-dot" style="background:${getCat(k).color}"></div><span>${getCat(k).name}</span></div>
  `).join('');
}

// ===== TYPE CHART =====
function renderTypeChart() {
  const txns = currentPeriodTransactions().filter(t => t.category !== 'income');
  const totals = { mandatory_fixed:0, mandatory_variable:0, optional_fixed:0, optional_variable:0 };
  txns.forEach(t => { if (t.spendingType in totals) totals[t.spendingType] += t.amount; });
  const colors = { mandatory_fixed:'#3b82f6', mandatory_variable:'#00c8e0', optional_fixed:'#a855f7', optional_variable:'#f59e0b' };
  const labels = SPENDING_TYPES.map(t => t.label);
  const data   = SPENDING_TYPES.map(t => totals[t.id]);
  const bg     = SPENDING_TYPES.map(t => colors[t.id]);

  if (charts.type) charts.type.destroy();
  charts.type = new Chart(document.getElementById('chart-type'), {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: bg, borderRadius: 6, borderSkipped: false }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.raw)}` } } },
      scales: {
        x: { grid: { color: gridColor() }, ticks: { color: textColor(), font: { size: 10 }, maxRotation: 20 } },
        y: { grid: { color: gridColor() }, ticks: { color: textColor(), callback: v => v>=1000?'$'+(v/1000).toFixed(1)+'k':'$'+v }, beginAtZero: true }
      }
    }
  });

  document.getElementById('type-legend').innerHTML = SPENDING_TYPES.map((t,i) => `
    <div class="type-legend-item">
      <div class="type-legend-dot" style="background:${bg[i]}"></div>
      <span class="type-legend-label">${t.short}</span>
      <span class="type-legend-val">${fmt(data[i])}</span>
    </div>
  `).join('');
}

// ===== RECENT TRANSACTIONS =====
function renderRecentTransactions() {
  const recent = [...state.transactions].sort((a,b) => new Date(b.date+'T00:00:00')-new Date(a.date+'T00:00:00')).slice(0,6);
  const el = document.getElementById('dash-recent');
  if (!recent.length) {
    el.innerHTML = '<div class="empty-state"><p>No transactions yet.<br>Add your first expense.</p></div>';
    return;
  }
  el.innerHTML = recent.map(t => txnItemHTML(t)).join('');
}

// ===== UPCOMING BILLS =====
function renderUpcomingBills() {
  const el = document.getElementById('dash-upcoming');
  if (!state.recurring.length) {
    el.innerHTML = '<div class="empty-state"><p>No recurring bills set up yet.</p></div>';
    return;
  }

  const now = new Date();
  const withDue = state.recurring.map(r => {
    const d = nextDueDate(r);
    return { ...r, _nextDue: d };
  }).filter(r => r._nextDue).sort((a,b) => a._nextDue - b._nextDue);

  el.innerHTML = withDue.slice(0,6).map(r => {
    const daysUntil = Math.round((r._nextDue - now) / 86400000);
    const dueClass  = r.isPaid ? 'ok' : daysUntil < 0 ? 'overdue' : daysUntil <= 3 ? 'soon' : 'ok';
    const dueLabel  = r.isPaid ? 'Paid' : daysUntil === 0 ? 'Today!' : daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : `in ${daysUntil}d`;
    const freqObj   = FREQUENCIES.find(f => f.id === (r.frequency||'monthly'));
    return `
      <div class="upcoming-item">
        <span class="upcoming-day">${fmtDateShort(r._nextDue)}</span>
        <span class="upcoming-name">${r.name}</span>
        <span class="upcoming-due ${dueClass}">${dueLabel}</span>
        <span class="upcoming-amount">${fmt(r.amount)}</span>
      </div>
    `;
  }).join('');
}

// ===== CASH FLOW SUMMARY =====
function renderCashFlow() {
  const el = document.getElementById('cash-flow-summary');
  const freq = state.settings.payFrequency || 'monthly';
  const income = state.settings.incomePerPeriod || 0;
  if (!income) { el.innerHTML = ''; return; }

  // Total monthly recurring obligations
  const monthlyFixed = state.recurring
    .filter(r => r.spendingType === 'mandatory_fixed' || r.spendingType === 'mandatory_variable')
    .reduce((s,r) => s + monthlyEquivalent(r.amount, r.frequency || 'monthly'), 0);

  const monthlyIncome = getMonthlyIncome();
  const discretionary = monthlyIncome - monthlyFixed;
  const freqObj = FREQUENCIES.find(f => f.id === freq);
  const freqLabel = freqObj ? freqObj.label : 'Monthly';

  el.innerHTML = `
    <div class="cf-title"><i data-lucide="zap" style="width:13px;height:13px"></i> Cash Flow Snapshot</div>
    <div class="cf-row"><span>Gross income (monthly)</span><span class="cf-val positive">${fmt(monthlyIncome)}</span></div>
    <div class="cf-row"><span>Mandatory recurring</span><span class="cf-val negative">−${fmt(monthlyFixed)}</span></div>
    <div class="cf-row cf-bold"><span>Discretionary</span><span class="cf-val" style="color:${discretionary>=0?'var(--green)':'var(--red)'}">${fmt(discretionary)}</span></div>
  `;
}

// ===== TXN HTML =====
function txnItemHTML(t) {
  const cat  = getCat(t.category);
  const type = getType(t.spendingType);
  const acc  = getAccount(t.accountId);
  const isIncome = t.category === 'income';
  const dateStr  = new Date(t.date+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
  return `
    <div class="txn-item">
      <div class="txn-icon" style="background:${cat.color}22;color:${cat.color}"><i data-lucide="${cat.icon}"></i></div>
      <div class="txn-details">
        <div class="txn-name">${t.description}</div>
        <div class="txn-meta">
          <span>${dateStr}</span><span>·</span><span>${cat.name}</span>
          ${acc?`<span>·</span><span>${acc.name}</span>`:''}
          <span class="txn-tag ${type.tagClass}">${type.short}</span>
        </div>
      </div>
      <div class="txn-amount ${isIncome?'income':''}">${isIncome?'+':'-'}${fmt(t.amount)}</div>
      <div class="txn-actions">
        <button class="icon-btn" onclick="editTransaction('${t.id}')"><i data-lucide="pencil"></i></button>
        <button class="icon-btn del" onclick="deleteTransaction('${t.id}')"><i data-lucide="trash-2"></i></button>
      </div>
    </div>
  `;
}

// ===== ACCOUNTS =====
function renderAccounts() {
  const kpis = calcKPIs();
  document.getElementById('net-worth-banner').innerHTML = `
    <div class="nw-item"><div class="nw-label">Net Worth</div>
      <div class="nw-value ${kpis.netWorth>=0?'positive':'negative'}">${fmt(kpis.netWorth)}</div></div>
    <div class="nw-divider"></div>
    <div class="nw-item"><div class="nw-label">Total Assets</div><div class="nw-value">${fmt(kpis.assets)}</div></div>
    <div class="nw-divider"></div>
    <div class="nw-item"><div class="nw-label">Total Liabilities</div>
      <div class="nw-value ${kpis.liabilities>0?'negative':''}">${fmt(kpis.liabilities)}</div></div>
    <div class="nw-divider"></div>
    <div class="nw-item"><div class="nw-label">Accounts</div><div class="nw-value">${state.accounts.length}</div></div>
  `;

  const grid = document.getElementById('accounts-grid');
  if (!state.accounts.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <i data-lucide="credit-card"></i><p>No accounts yet.<br>Add your first account to start tracking.</p>
      <button class="btn btn-primary" style="margin-top:1rem" onclick="openModal('account')"><i data-lucide="plus"></i> Add Account</button>
    </div>`;
    lucide.createIcons(); return;
  }

  const typeLabels = { checking:'Checking', savings:'Savings', credit:'Credit Card', investment:'Investment', cash:'Cash' };
  grid.innerHTML = state.accounts.map(a => {
    const isCredit = a.type === 'credit';
    const pct = isCredit && a.limit ? Math.min(100, Math.abs(a.balance) / a.limit * 100) : 0;
    return `
      <div class="account-card" style="--acc-color:${a.color}">
        <div class="acc-header">
          <span class="acc-type-badge">${typeLabels[a.type]||a.type}</span>
          <div class="acc-actions">
            <button class="icon-btn" onclick="editAccount('${a.id}')"><i data-lucide="pencil"></i></button>
            <button class="icon-btn del" onclick="deleteAccount('${a.id}')"><i data-lucide="trash-2"></i></button>
          </div>
        </div>
        <div class="acc-name">${a.name}</div>
        <div class="acc-balance ${a.balance<0?'negative':''}">${fmt(a.balance)}</div>
        ${isCredit && a.limit ? `
          <div class="acc-progress">
            <div class="acc-sub">Used: ${fmt(Math.abs(a.balance))} / ${fmt(a.limit)} (${pct.toFixed(0)}%)</div>
            <div class="acc-progress-bar"><div class="acc-progress-fill" style="width:${pct}%;background:${a.color}"></div></div>
          </div>` : `<div class="acc-sub">${isCredit?'No limit set':typeLabels[a.type]||''}</div>`}
      </div>
    `;
  }).join('');
  lucide.createIcons();
}

// ===== TRANSACTIONS =====
function renderTransactions() {
  const search  = (document.getElementById('txn-search')?.value||'').toLowerCase();
  const fCat    = document.getElementById('txn-filter-cat')?.value||'';
  const fType   = document.getElementById('txn-filter-type')?.value||'';
  const fMonth  = document.getElementById('txn-filter-month')?.value||'';

  let filtered = [...state.transactions];
  if (search) filtered = filtered.filter(t => t.description.toLowerCase().includes(search)||(t.notes||'').toLowerCase().includes(search));
  if (fCat)   filtered = filtered.filter(t => t.category === fCat);
  if (fType)  filtered = filtered.filter(t => t.spendingType === fType);
  if (fMonth) filtered = filtered.filter(t => t.date.startsWith(fMonth));
  filtered.sort((a,b) => new Date(b.date+'T00:00:00')-new Date(a.date+'T00:00:00'));

  const countEl = document.getElementById('txn-count');
  if (countEl) countEl.textContent = `${filtered.length} transaction${filtered.length!==1?'s':''}`;

  const container = document.getElementById('txn-list');
  if (!filtered.length) {
    container.innerHTML = `<div class="card"><div class="empty-state"><p>No transactions found.</p></div></div>`;
    return;
  }

  const groups = {};
  filtered.forEach(t => { if(!groups[t.date]) groups[t.date]=[]; groups[t.date].push(t); });
  container.innerHTML = Object.entries(groups).map(([date, txns]) => {
    const d = new Date(date+'T00:00:00');
    const label = d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
    const dayTotal = txns.filter(t=>t.category!=='income').reduce((s,t)=>s+t.amount,0);
    return `<div class="card date-group">
      <div class="date-group-header"><span>${label}</span><span class="date-group-total">${fmt(dayTotal)}</span></div>
      ${txns.map(t=>txnItemHTML(t)).join('')}
    </div>`;
  }).join('');

  buildMonthFilter();
  lucide.createIcons();
}

// ===== RECURRING =====
function renderRecurring() {
  const monthlyTotal = state.recurring.reduce((s,r) => s + monthlyEquivalent(r.amount, r.frequency||'monthly'), 0);
  const monthlyPaid  = state.recurring.filter(r=>r.isPaid).reduce((s,r) => s + monthlyEquivalent(r.amount, r.frequency||'monthly'), 0);

  const el = document.getElementById('rec-summary');
  if (el) el.textContent = `${fmt(monthlyTotal)}/mo total (monthly equiv.) · ${fmt(monthlyTotal-monthlyPaid)} outstanding`;

  renderRecurringCalendar();
  renderRecurringList();
  lucide.createIcons();
}

function renderRecurringCalendar() {
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth(), today = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();

  // Map day -> array of recurring items
  const dayMap = {};
  state.recurring.forEach(r => {
    getOccurrencesInMonth(r, year, month).forEach(d => {
      if (!dayMap[d]) dayMap[d] = [];
      dayMap[d].push(r.isPaid);
    });
  });

  const dowNames = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  let html = `
    <div style="font-size:.78rem;font-weight:700;color:var(--text-secondary);margin-bottom:.5rem">
      ${now.toLocaleDateString('en-US',{month:'long',year:'numeric'})}
    </div>
    <div class="cal-header-days">${dowNames.map(d=>`<div class="cal-dow">${d}</div>`).join('')}</div>
    <div class="cal-grid">${'<div></div>'.repeat(firstDay)}`;

  for (let d = 1; d <= daysInMonth; d++) {
    const hasBill = dayMap.hasOwnProperty(d);
    const allPaid = hasBill && dayMap[d].every(Boolean);
    const isToday = d === today;
    html += `<div class="cal-day${hasBill?' has-bill':''}${allPaid?' paid':''}${isToday?' today':''}" title="${hasBill?(allPaid?'✓ Paid':'Bill due'):''}">${d}</div>`;
  }
  html += '</div>';
  document.getElementById('rec-calendar').innerHTML = html;
}

function renderRecurringList() {
  const container = document.getElementById('rec-list');
  if (!state.recurring.length) {
    container.innerHTML = `<div class="card"><div class="empty-state"><p>No recurring bills yet.</p></div></div>`;
    return;
  }

  // Sort by next due date
  const sorted = [...state.recurring].map(r => ({ ...r, _due: nextDueDate(r) }))
    .sort((a,b) => (a._due||new Date(9e15)) - (b._due||new Date(9e15)));

  container.innerHTML = sorted.map(r => {
    const cat   = getCat(r.category);
    const type  = getType(r.spendingType);
    const acc   = getAccount(r.accountId);
    const freqObj = FREQUENCIES.find(f=>f.id===(r.frequency||'monthly'));
    const mEq   = monthlyEquivalent(r.amount, r.frequency||'monthly');
    const dueFmt = r._due ? fmtDateShort(r._due) : '—';
    return `
      <div class="rec-item ${r.isPaid?'paid':''}">
        <div class="rec-day-badge">${dueFmt}</div>
        <div class="rec-details">
          <div class="rec-name">${r.name}</div>
          <div class="rec-meta">
            ${cat.name} · <span class="txn-tag ${type.tagClass}">${type.short}</span>
            · <span class="freq-badge">${freqObj?.label||'Monthly'}</span>
            ${acc?` · ${acc.name}`:''}
            ${r.frequency!=='monthly'?`<span style="color:var(--text-muted)"> (${fmt(mEq)}/mo equiv.)</span>`:''}
          </div>
        </div>
        <div class="rec-amount">${fmt(r.amount)}</div>
        <div class="rec-actions">
          <button class="paid-btn ${r.isPaid?'is-paid':''}" onclick="togglePaid('${r.id}')">${r.isPaid?'✓ Paid':'Mark Paid'}</button>
          <button class="icon-btn" onclick="editRecurring('${r.id}')"><i data-lucide="pencil"></i></button>
          <button class="icon-btn del" onclick="deleteRecurring('${r.id}')"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
    `;
  }).join('');
}

function togglePaid(id) {
  const r = state.recurring.find(r=>r.id===id);
  if (!r) return;
  r.isPaid = !r.isPaid;
  saveState();
  renderRecurring();
}

// ===== GOALS =====
function renderGoals() {
  const el = document.getElementById('goals-grid');
  const summary = document.getElementById('goals-summary');
  const totalTarget  = state.goals.reduce((s,g)=>s+g.targetAmount,0);
  const totalSaved   = state.goals.reduce((s,g)=>s+g.currentAmount,0);
  if (summary) summary.textContent = state.goals.length
    ? `${state.goals.length} goal${state.goals.length>1?'s':''} · ${fmt(totalSaved)} saved of ${fmt(totalTarget)} target`
    : 'Set savings goals to track your progress';

  if (!state.goals.length) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:3rem 2rem">
      <i data-lucide="target"></i><p>No goals yet.<br>Add a goal to start tracking your savings progress.</p>
      <button class="btn btn-primary" style="margin-top:1rem" onclick="openModal('goal')"><i data-lucide="plus"></i> Add Goal</button>
    </div>`;
    lucide.createIcons(); return;
  }

  el.innerHTML = state.goals.map(g => {
    const pct  = Math.min(100, g.targetAmount > 0 ? g.currentAmount / g.targetAmount * 100 : 0);
    const rem  = Math.max(0, g.targetAmount - g.currentAmount);
    const mths = g.monthlyContribution > 0 ? Math.ceil(rem / g.monthlyContribution) : null;
    const doneDate = mths ? new Date(Date.now() + mths * 30.44 * 86400000).toLocaleDateString('en-US',{month:'short',year:'numeric'}) : null;
    const hasTarget = g.targetDate;
    const targetDateObj = hasTarget ? new Date(g.targetDate+'T00:00:00') : null;
    const daysLeft  = targetDateObj ? Math.round((targetDateObj - new Date())/86400000) : null;
    return `
      <div class="goal-card" style="--goal-color:${g.color||'#00c8e0'}">
        <div class="goal-header">
          <div class="goal-name">${g.name}</div>
          <div class="goal-actions">
            <button class="icon-btn" onclick="editGoal('${g.id}')"><i data-lucide="pencil"></i></button>
            <button class="icon-btn del" onclick="deleteGoal('${g.id}')"><i data-lucide="trash-2"></i></button>
          </div>
        </div>
        <div class="goal-amounts">
          <span class="goal-saved">${fmt(g.currentAmount)}</span>
          <span class="goal-of"> of </span>
          <span class="goal-target">${fmt(g.targetAmount)}</span>
        </div>
        <div class="goal-bar-wrap">
          <div class="goal-bar" style="width:${pct}%;background:${g.color||'var(--accent)'}"></div>
        </div>
        <div class="goal-pct">${pct.toFixed(0)}% complete</div>
        <div class="goal-meta">
          ${g.monthlyContribution ? `<span>${fmt(g.monthlyContribution)}/mo contribution</span>` : ''}
          ${doneDate ? `<span>· On track by <strong>${doneDate}</strong></span>` : ''}
          ${hasTarget && daysLeft !== null ? `<span>· Target: ${fmtDateShort(targetDateObj)} (${daysLeft>0?daysLeft+'d left':'past due'})</span>` : ''}
        </div>
        ${g.monthlyContribution ? `
          <button class="btn btn-secondary" style="margin-top:.75rem;font-size:.8rem;width:100%" onclick="addGoalContribution('${g.id}')">
            <i data-lucide="plus-circle"></i> Log Contribution
          </button>` : ''}
      </div>
    `;
  }).join('');
  lucide.createIcons();
}

function addGoalContribution(id) {
  const g = state.goals.find(g=>g.id===id);
  if (!g) return;
  const amt = parseFloat(prompt(`Add to "${g.name}"? Enter amount:`, g.monthlyContribution||''));
  if (!isNaN(amt) && amt > 0) {
    g.currentAmount = Math.min(g.targetAmount, g.currentAmount + amt);
    saveState();
    renderGoals();
  }
}

// ===== ANALYTICS =====
function renderAnalytics() {
  renderTrendChart();
  renderMonthCompare();
  renderMandoChart();
  renderFixVarChart();
  renderBreakdownTable();
  lucide.createIcons();
}

function renderTrendChart() {
  const months = [], totals = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    months.push(d.toLocaleDateString('en-US',{month:'short',year:'2-digit'}));
    const y=d.getFullYear(), m=d.getMonth();
    totals.push(state.transactions
      .filter(t=>{ const dt=new Date(t.date+'T00:00:00'); return dt.getFullYear()===y&&dt.getMonth()===m&&t.category!=='income'; })
      .reduce((s,t)=>s+t.amount,0));
  }
  if (charts.trend) charts.trend.destroy();
  charts.trend = new Chart(document.getElementById('chart-trend'), {
    type: 'line',
    data: { labels: months, datasets: [{
      label:'Monthly Spending', data: totals,
      borderColor:'#00c8e0', backgroundColor:'rgba(0,200,224,0.08)',
      pointBackgroundColor:'#00c8e0', pointRadius:5, pointHoverRadius:7, fill:true, tension:0.4
    }]},
    options: {
      responsive:true, maintainAspectRatio:true,
      plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:ctx=>` ${fmt(ctx.raw)}` }}},
      scales:{
        x:{ grid:{color:gridColor()}, ticks:{color:textColor()} },
        y:{ grid:{color:gridColor()}, ticks:{color:textColor(),callback:v=>fmt(v)}, beginAtZero:true }
      }
    }
  });
}

function renderMonthCompare() {
  const now = new Date();
  const getMonthTotals = (year, month) => {
    const txns = state.transactions.filter(t => {
      const d = new Date(t.date+'T00:00:00');
      return d.getFullYear()===year && d.getMonth()===month && t.category!=='income';
    });
    const by = {};
    txns.forEach(t => { by[t.category]=(by[t.category]||0)+t.amount; });
    return { total: txns.reduce((s,t)=>s+t.amount,0), by };
  };

  const thisM = getMonthTotals(now.getFullYear(), now.getMonth());
  const lastM = getMonthTotals(now.getFullYear(), now.getMonth()-1 < 0 ? now.getFullYear()-1 : now.getFullYear(),
                                now.getMonth()-1 < 0 ? 11 : now.getMonth()-1);

  const diff = thisM.total - lastM.total;
  const el = document.getElementById('month-compare');
  el.innerHTML = `
    <div class="compare-row">
      <div class="compare-col">
        <div class="compare-label">This Month</div>
        <div class="compare-val">${fmt(thisM.total)}</div>
      </div>
      <div class="compare-arrow" style="color:${diff>0?'var(--red)':'var(--green)'}">
        <i data-lucide="${diff>0?'trending-up':'trending-down'}"></i>
        <span>${diff>0?'+':''}${fmt(Math.abs(diff))} ${diff>0?'more':'less'} than last month</span>
      </div>
      <div class="compare-col right">
        <div class="compare-label">Last Month</div>
        <div class="compare-val">${fmt(lastM.total)}</div>
      </div>
    </div>
  `;
}

function renderMandoChart() {
  const txns = currentMonthTransactions().filter(t=>t.category!=='income');
  const mandatory = txns.filter(t=>t.spendingType?.startsWith('mandatory')).reduce((s,t)=>s+t.amount,0);
  const optional  = txns.filter(t=>t.spendingType?.startsWith('optional')).reduce((s,t)=>s+t.amount,0);
  if (charts.mando) charts.mando.destroy();
  charts.mando = new Chart(document.getElementById('chart-mando'), {
    type:'doughnut', data:{ labels:['Mandatory','Optional'], datasets:[{data:[mandatory,optional],backgroundColor:['#3b82f6','#f59e0b'],borderWidth:0}]},
    options:{ responsive:true,maintainAspectRatio:true,cutout:'65%',
      plugins:{ legend:{position:'bottom',labels:{color:textColor(),padding:16,font:{size:12}}},
                tooltip:{callbacks:{label:ctx=>` ${fmt(ctx.raw)}`}}}}
  });
}

function renderFixVarChart() {
  const txns = currentMonthTransactions().filter(t=>t.category!=='income');
  const fixed    = txns.filter(t=>t.spendingType?.endsWith('fixed')).reduce((s,t)=>s+t.amount,0);
  const variable = txns.filter(t=>t.spendingType?.endsWith('variable')).reduce((s,t)=>s+t.amount,0);
  if (charts.fixvar) charts.fixvar.destroy();
  charts.fixvar = new Chart(document.getElementById('chart-fixvar'), {
    type:'doughnut', data:{ labels:['Fixed','Variable'], datasets:[{data:[fixed,variable],backgroundColor:['#a855f7','#00c8e0'],borderWidth:0}]},
    options:{ responsive:true,maintainAspectRatio:true,cutout:'65%',
      plugins:{ legend:{position:'bottom',labels:{color:textColor(),padding:16,font:{size:12}}},
                tooltip:{callbacks:{label:ctx=>` ${fmt(ctx.raw)}`}}}}
  });
}

function renderBreakdownTable() {
  const txns = currentMonthTransactions().filter(t=>t.category!=='income');
  const totals = {};
  txns.forEach(t => { totals[t.category]=(totals[t.category]||0)+t.amount; });
  const total  = Object.values(totals).reduce((s,v)=>s+v,0);
  const sorted = Object.entries(totals).sort((a,b)=>b[1]-a[1]);
  const el = document.getElementById('analytics-breakdown');
  if (!sorted.length) { el.innerHTML='<div class="empty-state"><p>No data this month.</p></div>'; return; }
  el.innerHTML = sorted.map(([k,v]) => {
    const cat = getCat(k), pct = total>0?(v/total*100):0;
    return `<div class="analytics-breakdown-row">
      <div class="abd-dot" style="background:${cat.color}"></div>
      <div class="abd-name">${cat.name}</div>
      <div class="abd-bar-wrap"><div class="abd-bar" style="width:${pct}%;background:${cat.color}"></div></div>
      <div class="abd-pct">${pct.toFixed(1)}%</div>
      <div class="abd-amount">${fmt(v)}</div>
    </div>`;
  }).join('');
}

// ===== SETTINGS =====
function loadSettingsUI() {
  const s = state.settings;
  const fq = document.getElementById('set-pay-freq');
  if (fq) fq.value = s.payFrequency || 'monthly';
  const inc = document.getElementById('set-income');
  if (inc) inc.value = s.incomePerPeriod || '';
  const np = document.getElementById('set-next-pay');
  if (np) np.value = s.nextPayDate || '';
  const cur = document.getElementById('set-currency');
  if (cur) cur.value = s.currency || '$';
  onPayFreqChange();
  renderBudgetList();
}

function onPayFreqChange() {
  const freq = document.getElementById('set-pay-freq')?.value || 'monthly';
  const needsAnchor = ['bi-weekly','weekly'].includes(freq);
  const wrap = document.getElementById('next-pay-wrap');
  if (wrap) wrap.style.display = needsAnchor ? '' : 'none';

  const hint = document.getElementById('income-hint');
  const label = document.getElementById('income-label');
  if (hint && label) {
    const obj = FREQUENCIES.find(f=>f.id===freq);
    label.textContent = `Gross Income per ${obj?.label||'Month'}`;
    const monthly = (parseFloat(document.getElementById('set-income')?.value)||0) * (obj?.monthlyMult||1);
    hint.textContent = monthly > 0 ? `≈ ${fmt(monthly)} / month` : '';
  }
}

function saveSettings() {
  const freq    = document.getElementById('set-pay-freq')?.value || 'monthly';
  const income  = parseFloat(document.getElementById('set-income')?.value) || 0;
  const nextPay = document.getElementById('set-next-pay')?.value || '';
  const cur     = document.getElementById('set-currency')?.value || '$';
  state.settings.payFrequency    = freq;
  state.settings.incomePerPeriod = income;
  state.settings.nextPayDate     = nextPay;
  state.settings.currency        = cur;
  saveState();
  document.getElementById('set-currency-sym').textContent = cur;
  onPayFreqChange();
}

function renderBudgetList() {
  const el = document.getElementById('budget-list');
  if (!el) return;
  if (!state.budgets.length) {
    el.innerHTML = '<div style="color:var(--text-muted);font-size:.85rem;padding:.5rem 0">No budgets set. Click + Add to create one.</div>';
    return;
  }
  const monthTxns = currentMonthTransactions().filter(t=>t.category!=='income');
  const spent = {};
  monthTxns.forEach(t => { spent[t.category]=(spent[t.category]||0)+t.amount; });
  el.innerHTML = state.budgets.map(b => {
    const s   = spent[b.category]||0;
    const pct = Math.min(100,b.amount>0?s/b.amount*100:0);
    const over = s>b.amount;
    const cat = getCat(b.category);
    return `
      <div class="budget-settings-row">
        <div class="legend-dot" style="background:${cat.color};width:10px;height:10px;border-radius:50%;flex-shrink:0"></div>
        <div style="flex:1">${cat.name}</div>
        <div style="font-family:var(--ff-mono);font-size:.82rem;color:${over?'var(--red)':''}">${fmt(s)} / ${fmt(b.amount)}</div>
        <button class="icon-btn del" onclick="deleteBudget('${b.id}')"><i data-lucide="trash-2"></i></button>
      </div>
    `;
  }).join('');
  lucide.createIcons();
}

// ===== MODALS =====
function openModal(type, id = null) {
  currentModal = type;
  document.getElementById('overlay').classList.remove('hidden');
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));

  if (type === 'account') {
    document.getElementById('modal-account').classList.remove('hidden');
    document.getElementById('modal-account-title').textContent = id ? 'Edit Account' : 'Add Account';
    document.getElementById('form-account').reset();
    buildColorPicker('acc-color-picker', ACCOUNT_COLORS);
    if (id) {
      const a = state.accounts.find(a=>a.id===id);
      if (a) { document.getElementById('acc-id').value=a.id; document.getElementById('acc-name').value=a.name;
        document.getElementById('acc-type').value=a.type; document.getElementById('acc-balance').value=a.balance;
        document.getElementById('acc-limit').value=a.limit||''; toggleCreditLimit(); selectColor('acc-color-picker',a.color); }
    } else { selectColor('acc-color-picker', ACCOUNT_COLORS[state.accounts.length%ACCOUNT_COLORS.length]); }
  }

  if (type === 'transaction') {
    document.getElementById('modal-transaction').classList.remove('hidden');
    document.getElementById('modal-txn-title').textContent = id ? 'Edit Transaction' : 'Add Transaction';
    populateAccountSelects();
    document.getElementById('txn-currency-symbol').textContent = state.settings.currency||'$';
    if (!id) { document.getElementById('form-transaction').reset(); document.getElementById('txn-date').valueAsDate=new Date(); document.getElementById('txn-id').value=''; document.getElementById('cat-suggestion').classList.add('hidden'); }
    else {
      const t = state.transactions.find(t=>t.id===id);
      if (t) { document.getElementById('txn-id').value=t.id; document.getElementById('txn-amount').value=t.amount;
        document.getElementById('txn-date').value=t.date; document.getElementById('txn-desc').value=t.description;
        document.getElementById('txn-category').value=t.category; document.getElementById('txn-type').value=t.spendingType;
        document.getElementById('txn-account').value=t.accountId||''; document.getElementById('txn-notes').value=t.notes||''; }
    }
  }

  if (type === 'recurring') {
    document.getElementById('modal-recurring').classList.remove('hidden');
    document.getElementById('modal-rec-title').textContent = id ? 'Edit Recurring' : 'Add Recurring Bill';
    populateAccountSelects();
    if (!id) { document.getElementById('form-recurring').reset(); document.getElementById('rec-id').value=''; document.getElementById('rec-frequency').value='monthly'; onRecFrequencyChange(); }
    else {
      const r = state.recurring.find(r=>r.id===id);
      if (r) { document.getElementById('rec-id').value=r.id; document.getElementById('rec-name').value=r.name;
        document.getElementById('rec-amount').value=r.amount; document.getElementById('rec-frequency').value=r.frequency||'monthly';
        document.getElementById('rec-day').value=r.dueDay||''; document.getElementById('rec-start-date').value=r.startDate||'';
        document.getElementById('rec-category').value=r.category; document.getElementById('rec-type').value=r.spendingType;
        document.getElementById('rec-account').value=r.accountId||''; onRecFrequencyChange(); }
    }
  }

  if (type === 'budget') {
    document.getElementById('modal-budget').classList.remove('hidden');
    document.getElementById('modal-budget-title').textContent = id ? 'Edit Budget' : 'Set Category Budget';
    document.getElementById('form-budget').reset();
    document.getElementById('budget-id').value = id||'';
    if (id) {
      const b = state.budgets.find(b=>b.id===id);
      if (b) { document.getElementById('budget-category').value=b.category; document.getElementById('budget-amount').value=b.amount; }
    }
  }

  if (type === 'goal') {
    document.getElementById('modal-goal').classList.remove('hidden');
    document.getElementById('modal-goal-title').textContent = id ? 'Edit Goal' : 'Add Savings Goal';
    document.getElementById('form-goal').reset();
    buildColorPicker('goal-color-picker', GOAL_COLORS);
    document.getElementById('goal-id').value = id||'';
    if (id) {
      const g = state.goals.find(g=>g.id===id);
      if (g) { document.getElementById('goal-name').value=g.name; document.getElementById('goal-target').value=g.targetAmount;
        document.getElementById('goal-current').value=g.currentAmount; document.getElementById('goal-date').value=g.targetDate||'';
        document.getElementById('goal-contribution').value=g.monthlyContribution||''; selectColor('goal-color-picker',g.color||GOAL_COLORS[0]); }
    } else { selectColor('goal-color-picker', GOAL_COLORS[state.goals.length % GOAL_COLORS.length]); }
  }

  lucide.createIcons();
}

function closeModal() {
  document.getElementById('overlay').classList.add('hidden');
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  currentModal = null;
}

function closeModalOutside(e) { if (e.target === document.getElementById('overlay')) closeModal(); }

// ===== RECURRING FREQUENCY UI =====
function onRecFrequencyChange() {
  const freq = document.getElementById('rec-frequency')?.value || 'monthly';
  const isMonthly = freq === 'monthly' || freq === 'semi-monthly';
  document.getElementById('rec-day-wrap').classList.toggle('hidden', !isMonthly);
  document.getElementById('rec-date-wrap').classList.toggle('hidden', isMonthly);
  const hintEl = document.getElementById('rec-date-hint');
  const labelEl = document.getElementById('rec-date-label');
  const f = FREQUENCIES.find(f=>f.id===freq);
  if (hintEl && f) hintEl.textContent = f.hint;
  if (labelEl) {
    if (freq==='bi-weekly'||freq==='weekly') labelEl.textContent='Start / Anchor Date';
    else if (freq==='quarterly') labelEl.textContent='First Occurrence Date';
    else if (freq==='annual') labelEl.textContent='Annual Due Date (month + day)';
  }
}

// ===== COLOR PICKER =====
function buildColorPicker(containerId, colors) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = colors.map(c =>
    `<div class="color-dot" style="background:${c}" data-color="${c}" data-picker="${containerId}" onclick="selectColor('${containerId}','${c}')"></div>`
  ).join('');
}

function selectColor(pickerId, color) {
  document.querySelectorAll(`.color-dot[data-picker="${pickerId}"]`).forEach(d => {
    d.classList.toggle('selected', d.dataset.color === color);
  });
}

function getSelectedColor(pickerId) {
  const sel = document.querySelector(`.color-dot[data-picker="${pickerId}"].selected`);
  return sel ? sel.dataset.color : ACCOUNT_COLORS[0];
}

function toggleCreditLimit() {
  document.getElementById('credit-limit-wrap').style.display = document.getElementById('acc-type').value==='credit' ? '' : 'none';
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
        if (catId==='housing')       document.getElementById('txn-type').value='mandatory_fixed';
        else if (catId==='entertainment') document.getElementById('txn-type').value='optional_fixed';
        else if (catId==='food')     document.getElementById('txn-type').value='optional_variable';
        else if (catId==='bills')    document.getElementById('txn-type').value='mandatory_fixed';
        else if (catId==='grocery')  document.getElementById('txn-type').value='mandatory_variable';
        else if (catId==='transport') document.getElementById('txn-type').value='mandatory_variable';
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
  const acc = { id: id||uid(), name: document.getElementById('acc-name').value, type: document.getElementById('acc-type').value,
    balance: parseFloat(document.getElementById('acc-balance').value)||0,
    limit: parseFloat(document.getElementById('acc-limit').value)||null, color: getSelectedColor('acc-color-picker') };
  if (id) { const idx=state.accounts.findIndex(a=>a.id===id); if(idx>-1)state.accounts[idx]=acc; }
  else state.accounts.push(acc);
  saveState(); populateAccountSelects(); closeModal(); renderAccounts();
}

function submitTransaction(e) {
  e.preventDefault();
  const id = document.getElementById('txn-id').value;
  const txn = { id: id||uid(), amount: parseFloat(document.getElementById('txn-amount').value),
    date: document.getElementById('txn-date').value, description: document.getElementById('txn-desc').value,
    category: document.getElementById('txn-category').value, spendingType: document.getElementById('txn-type').value,
    accountId: document.getElementById('txn-account').value||null, notes: document.getElementById('txn-notes').value };
  if (id) { const idx=state.transactions.findIndex(t=>t.id===id); if(idx>-1)state.transactions[idx]=txn; }
  else state.transactions.push(txn);
  saveState(); closeModal(); buildMonthFilter(); navigate(currentSection);
}

function submitRecurring(e) {
  e.preventDefault();
  const id   = document.getElementById('rec-id').value;
  const freq = document.getElementById('rec-frequency').value;
  const isMonthly = freq === 'monthly' || freq === 'semi-monthly';
  const rec = { id: id||uid(), name: document.getElementById('rec-name').value,
    amount: parseFloat(document.getElementById('rec-amount').value),
    frequency: freq,
    dueDay:    isMonthly ? (parseInt(document.getElementById('rec-day').value)||1) : null,
    startDate: !isMonthly ? (document.getElementById('rec-start-date').value||null) : null,
    category:  document.getElementById('rec-category').value, spendingType: document.getElementById('rec-type').value,
    accountId: document.getElementById('rec-account').value||null, isPaid: false };
  if (id) { const idx=state.recurring.findIndex(r=>r.id===id); if(idx>-1){ rec.isPaid=state.recurring[idx].isPaid; state.recurring[idx]=rec; }}
  else state.recurring.push(rec);
  saveState(); closeModal(); renderRecurring();
}

function submitBudget(e) {
  e.preventDefault();
  const id  = document.getElementById('budget-id').value;
  const cat = document.getElementById('budget-category').value;
  // Only one budget per category
  state.budgets = state.budgets.filter(b => b.id !== id && b.category !== cat);
  state.budgets.push({ id: id||uid(), category: cat, amount: parseFloat(document.getElementById('budget-amount').value)||0 });
  saveState(); closeModal(); renderBudgetList(); renderBudgetProgress();
  lucide.createIcons();
}

function submitGoal(e) {
  e.preventDefault();
  const id = document.getElementById('goal-id').value;
  const goal = { id: id||uid(), name: document.getElementById('goal-name').value,
    targetAmount:       parseFloat(document.getElementById('goal-target').value)||0,
    currentAmount:      parseFloat(document.getElementById('goal-current').value)||0,
    targetDate:         document.getElementById('goal-date').value||null,
    monthlyContribution:parseFloat(document.getElementById('goal-contribution').value)||0,
    color: getSelectedColor('goal-color-picker') };
  if (id) { const idx=state.goals.findIndex(g=>g.id===id); if(idx>-1)state.goals[idx]=goal; }
  else state.goals.push(goal);
  saveState(); closeModal(); renderGoals();
}

// ===== EDIT / DELETE =====
function editAccount(id)     { openModal('account', id); }
function editTransaction(id) { openModal('transaction', id); }
function editRecurring(id)   { openModal('recurring', id); }
function editGoal(id)        { openModal('goal', id); }

function deleteAccount(id) {
  showConfirm(`Delete account?`, () => { state.accounts=state.accounts.filter(a=>a.id!==id); saveState(); renderAccounts(); });
}
function deleteTransaction(id) {
  showConfirm(`Delete this transaction?`, () => { state.transactions=state.transactions.filter(t=>t.id!==id); saveState(); navigate(currentSection); });
}
function deleteRecurring(id) {
  showConfirm(`Delete this recurring bill?`, () => { state.recurring=state.recurring.filter(r=>r.id!==id); saveState(); renderRecurring(); });
}
function deleteBudget(id) {
  state.budgets=state.budgets.filter(b=>b.id!==id); saveState(); renderBudgetList(); renderBudgetProgress(); lucide.createIcons();
}
function deleteGoal(id) {
  showConfirm(`Delete this goal?`, () => { state.goals=state.goals.filter(g=>g.id!==id); saveState(); renderGoals(); });
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

// ===== EXPORT / IMPORT =====
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `flo-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
  URL.revokeObjectURL(url);
}

function importData(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.accounts && data.transactions) {
        state = data;
        if (!state.budgets) state.budgets=[];
        if (!state.goals) state.goals=[];
        if (!state.settings) state.settings={payFrequency:'monthly',incomePerPeriod:0,currency:'$'};
        saveState(); populateSelects(); buildMonthFilter(); loadSettingsUI(); navigate(currentSection);
        alert('Data imported successfully!');
      } else alert('Invalid file format.');
    } catch(err) { alert('Failed to parse file: '+err.message); }
  };
  reader.readAsText(file);
}

function clearAllData() {
  if (confirm('Clear ALL data? This cannot be undone.')) {
    state = { accounts:[], transactions:[], recurring:[], budgets:[], goals:[], settings:{ payFrequency:'monthly',incomePerPeriod:0,nextPayDate:'',currency:'$',lastResetKey:'' }};
    saveState(); loadSettingsUI(); navigate('dashboard');
  }
}

// ===== SEED DEMO DATA =====
function seedDemoData() {
  if (state.accounts.length || state.transactions.length) return;

  state.accounts = [
    { id: uid(), name:'Chase Checking',  type:'checking',   balance: 4820.50, limit:null,   color:'#00c8e0' },
    { id: uid(), name:'Chase Sapphire',  type:'credit',     balance:-1240.00, limit:10000,  color:'#a855f7' },
    { id: uid(), name:'HYSA Savings',    type:'savings',    balance:22500.00, limit:null,   color:'#10b981' },
    { id: uid(), name:'Brokerage',       type:'investment', balance:45200.00, limit:null,   color:'#f59e0b' },
  ];

  const now=new Date(), m=String(now.getMonth()+1).padStart(2,'0'), y=now.getFullYear();
  const addT = (desc,amount,day,cat,type,accIdx) => ({
    id:uid(), description:desc, amount, date:`${y}-${m}-${String(day).padStart(2,'0')}`,
    category:cat, spendingType:type, accountId:state.accounts[accIdx]?.id||null, notes:''
  });

  state.transactions = [
    addT('Rent Payment',       2200, 1,  'housing',       'mandatory_fixed',    0),
    addT('PG&E Electric',        85, 3,  'bills',         'mandatory_variable', 0),
    addT('Whole Foods',         134, 4,  'grocery',       'mandatory_variable', 1),
    addT('Netflix',              22, 5,  'entertainment', 'optional_fixed',     1),
    addT('Spotify',              12, 5,  'entertainment', 'optional_fixed',     1),
    addT('Chipotle',             18, 6,  'food',          'optional_variable',  1),
    addT('Tesla Supercharge',    28, 8,  'transport',     'mandatory_variable', 0),
    addT('Trader Joes',          90,10,  'grocery',       'mandatory_variable', 1),
    addT('Amazon Purchase',      67,11,  'shopping',      'optional_variable',  1),
    addT('Doctor Visit',         40,12,  'health',        'mandatory_variable', 0),
    addT('Gym Membership',       55,13,  'health',        'optional_fixed',     1),
    addT('Restaurant Dinner',    95,14,  'food',          'optional_variable',  1),
    addT('Comcast Internet',     80,15,  'bills',         'mandatory_fixed',    0),
    addT('Car Insurance',       180,15,  'bills',         'mandatory_fixed',    0),
    addT('Target Run',           58,17,  'shopping',      'optional_variable',  1),
    addT('Coffee Shop',          14,18,  'food',          'optional_variable',  1),
    addT('Movie Tickets',        38,20,  'entertainment', 'optional_variable',  1),
    addT('Uber Ride',            22,21,  'transport',     'optional_variable',  0),
    addT('AT&T Phone Bill',      85,22,  'bills',         'mandatory_fixed',    0),
  ];

  const prevM = String(now.getMonth()===0?12:now.getMonth()).padStart(2,'0');
  const prevY = now.getMonth()===0?y-1:y;
  const addPrev = (desc,amount,day,cat,type,accIdx) => ({
    id:uid(), description:desc, amount, date:`${prevY}-${prevM}-${String(day).padStart(2,'0')}`,
    category:cat, spendingType:type, accountId:state.accounts[accIdx]?.id||null, notes:''
  });
  state.transactions.push(
    addPrev('Rent Payment',    2200,1,'housing','mandatory_fixed',0),
    addPrev('Whole Foods',      155,5,'grocery','mandatory_variable',1),
    addPrev('Netflix',           22,5,'entertainment','optional_fixed',1),
    addPrev('PG&E',              92,3,'bills','mandatory_variable',0),
    addPrev('Restaurant',       140,12,'food','optional_variable',1),
    addPrev('Amazon',           230,15,'shopping','optional_variable',1),
    addPrev('Car Insurance',    180,15,'bills','mandatory_fixed',0),
    addPrev('Gym',               55,13,'health','optional_fixed',1),
  );

  const anchorBiWeekly = `${y}-${m}-01`;
  state.recurring = [
    { id:uid(), name:'Rent',           amount:2200, frequency:'monthly',   dueDay:1,  startDate:null, category:'housing',       spendingType:'mandatory_fixed',    accountId:state.accounts[0].id, isPaid:true  },
    { id:uid(), name:'Car Insurance',  amount:180,  frequency:'monthly',   dueDay:15, startDate:null, category:'bills',         spendingType:'mandatory_fixed',    accountId:state.accounts[0].id, isPaid:true  },
    { id:uid(), name:'Comcast',        amount:80,   frequency:'monthly',   dueDay:15, startDate:null, category:'bills',         spendingType:'mandatory_fixed',    accountId:state.accounts[0].id, isPaid:true  },
    { id:uid(), name:'AT&T Phone',     amount:85,   frequency:'monthly',   dueDay:22, startDate:null, category:'bills',         spendingType:'mandatory_fixed',    accountId:state.accounts[0].id, isPaid:false },
    { id:uid(), name:'Netflix',        amount:22,   frequency:'monthly',   dueDay:5,  startDate:null, category:'entertainment', spendingType:'optional_fixed',     accountId:state.accounts[1].id, isPaid:true  },
    { id:uid(), name:'Spotify',        amount:12,   frequency:'monthly',   dueDay:5,  startDate:null, category:'entertainment', spendingType:'optional_fixed',     accountId:state.accounts[1].id, isPaid:true  },
    { id:uid(), name:'Gym',            amount:55,   frequency:'monthly',   dueDay:13, startDate:null, category:'health',        spendingType:'optional_fixed',     accountId:state.accounts[1].id, isPaid:true  },
    { id:uid(), name:'PG&E Electric',  amount:85,   frequency:'monthly',   dueDay:3,  startDate:null, category:'bills',         spendingType:'mandatory_variable', accountId:state.accounts[0].id, isPaid:true  },
    { id:uid(), name:'Tesla Supercharge',amount:55, frequency:'bi-weekly', dueDay:null,startDate:anchorBiWeekly, category:'transport', spendingType:'mandatory_variable', accountId:state.accounts[0].id, isPaid:false },
    { id:uid(), name:'Amazon Prime',   amount:139,  frequency:'annual',    dueDay:null,startDate:`${y}-06-15`, category:'shopping', spendingType:'optional_fixed',  accountId:state.accounts[1].id, isPaid:false },
  ];

  state.budgets = [
    { id:uid(), category:'food',    amount:300 },
    { id:uid(), category:'grocery', amount:400 },
    { id:uid(), category:'shopping',amount:200 },
    { id:uid(), category:'entertainment', amount:100 },
  ];

  state.goals = [
    { id:uid(), name:'Emergency Fund',  targetAmount:20000, currentAmount:8500, targetDate:`${y+1}-12-31`, monthlyContribution:500, color:'#00e5a0' },
    { id:uid(), name:'Vacation Fund',   targetAmount:5000,  currentAmount:1200, targetDate:`${y+1}-06-01`, monthlyContribution:300, color:'#00c8e0' },
    { id:uid(), name:'New Car',         targetAmount:15000, currentAmount:3000, targetDate:`${y+2}-01-01`, monthlyContribution:400, color:'#a855f7' },
  ];

  state.settings = { payFrequency:'bi-weekly', incomePerPeriod:4250, nextPayDate:`${y}-${m}-07`, currency:'$', lastResetKey:'' };
  saveState();
}

// ===== START =====
// Startup is driven by auth.js → onAuthStateChanged → loadStateFromFirestore → init()
// Nothing to call here.
