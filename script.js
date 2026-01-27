// ============================================================
// 0. FIREBASE CONFIG
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAtSOx-q5KTe0gtQjEvhMqgaJKHbqLqd90",
  authDomain: "financas-7ed0f.firebaseapp.com",
  projectId: "financas-7ed0f",
  storageBucket: "financas-7ed0f.firebasestorage.app",
  messagingSenderId: "406210800597",
  appId: "1:406210800597:web:311661359d0718a1642b5c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============================================================
// 1. SELEÇÃO DE ELEMENTOS DO DOM
// ============================================================
const balance = document.getElementById('balance');
const moneyPlus = document.getElementById('money-plus');
const moneyMinus = document.getElementById('money-minus');
const list = document.getElementById('transactions-list');
const form = document.getElementById('form');
const text = document.getElementById('text');
const amount = document.getElementById('amount');
const date = document.getElementById('date');
const type = document.getElementById('type');
const category = document.getElementById('category');
const paymentMethodSelect = document.getElementById('payment-method');
const filterMonth = document.getElementById('filter-month');
const clearFilterBtn = document.getElementById('clear-filter');

// Novos elementos para contas pendentes
const pendingForm = document.getElementById('pending-form');
const pendingText = document.getElementById('pending-text');
const pendingAmount = document.getElementById('pending-amount');
const pendingDate = document.getElementById('pending-date');
const pendingCategory = document.getElementById('pending-category');
const pendingList = document.getElementById('pending-list');

// Novos elementos para serviços não pagos
const earnedForm = document.getElementById('earned-form');
const earnedText = document.getElementById('earned-text');
const earnedAmount = document.getElementById('earned-amount');
const earnedDate = document.getElementById('earned-date');
const earnedClient = document.getElementById('earned-client');
const earnedList = document.getElementById('earned-list');

// Elementos de alerta
const pendingTotal = document.getElementById('pending-total');
const pendingCount = document.getElementById('pending-count');
const earnedTotal = document.getElementById('earned-total');
const earnedCount = document.getElementById('earned-count');
const generatePdfBtn = document.getElementById('generate-pdf-btn');

// Saldos automáticos de Caixa e Conta
const cashBalanceEl = document.getElementById('cash-balance');
const accountBalanceEl = document.getElementById('account-balance');
const cashAccountTotalEl = document.getElementById('cash-account-total');

let myChart = null;
let balanceChart = null;
let incomeChart = null;

// ============================================================
// 2. ESTADO DA APLICAÇÃO
// ============================================================
let transactions = [];
let pendingAccounts = [];
let earnedServices = [];

// Paginação
let transactionsPerPage = 10;
let transactionsPage = 0;
let pendingPerPage = 10;
let pendingPage = 0;
let earnedPerPage = 10;
let earnedPage = 0;

// ============================================================
// 3. FUNÇÕES UTILITÁRIAS
// ============================================================
const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);

const formatDate = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

// ============================================================
// 4. FIRESTORE CRUD
// ============================================================

// ➕ ADICIONAR
async function addTransaction(e) {
  e.preventDefault();

  if (!text.value || !amount.value || !date.value) {
    alert('Preencha todos os campos');
    return;
  }

  let value = parseFloat(amount.value);
  if (type.value === 'expense') value = Math.abs(value) * -1;

  await addDoc(collection(db, "transactions"), {
    text: text.value,
    amount: value,
    date: date.value,
    category: category.value,
    type: type.value,
    paymentMethod: paymentMethodSelect ? paymentMethodSelect.value : 'account',
    createdAt: new Date()
  });

  form.reset();
  loadTransactions();
}

// 📥 CARREGAR
async function loadTransactions() {
  transactions = [];
  const snapshot = await getDocs(collection(db, "transactions"));

  snapshot.forEach(docSnap => {
    transactions.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });

  init();
}

// ❌ REMOVER COM CONFIRMAÇÃO
window.removeTransaction = async function(id) {
  const confirmed = confirm('Tem certeza que deseja excluir esta transação?');
  if (confirmed) {
    await deleteDoc(doc(db, "transactions", id));
    loadTransactions();
  }
};

// ✏️ EDITAR TRANSAÇÃO
window.editTransaction = async function(id) {
  const transaction = transactions.find(t => t.id === id);
  if (!transaction) return;

  // Preencher o formulário com os dados da transação
  text.value = transaction.text;
  amount.value = Math.abs(transaction.amount);
  date.value = transaction.date;
  type.value = transaction.type;
  category.value = transaction.category;

  // Remover a transação antiga
  await deleteDoc(doc(db, "transactions", id));
  loadTransactions();

  // Focar no formulário
  text.focus();
  form.scrollIntoView({ behavior: 'smooth' });
};

// ➕ ADICIONAR CONTA PENDENTE
async function addPendingAccount(e) {
  e.preventDefault();

  if (!pendingText.value || !pendingAmount.value || !pendingDate.value) {
    alert('Preencha todos os campos');
    return;
  }

  await addDoc(collection(db, "pendingAccounts"), {
    text: pendingText.value,
    amount: parseFloat(pendingAmount.value),
    date: pendingDate.value,
    category: pendingCategory.value,
    status: 'pending',
    createdAt: new Date()
  });

  pendingForm.reset();
  loadPendingAccounts();
}

// 📥 CARREGAR CONTAS PENDENTES
async function loadPendingAccounts() {
  pendingAccounts = [];
  const snapshot = await getDocs(collection(db, "pendingAccounts"));

  snapshot.forEach(docSnap => {
    pendingAccounts.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });

  init();
}

// ❌ REMOVER CONTA PENDENTE
window.removePendingAccount = async function(id) {
  await deleteDoc(doc(db, "pendingAccounts", id));
  loadPendingAccounts();
};

// ✅ MARCAR COMO PAGO
window.markAsPaid = async function(id) {
  // Encontra a conta pendente
  const account = pendingAccounts.find(p => p.id === id);
  
  if (account) {
    // Cria uma nova transação de saída
    await addDoc(collection(db, "transactions"), {
      text: account.text,
      amount: -Math.abs(account.amount),
      date: account.date,
      category: account.category,
      type: 'expense',
      createdAt: new Date()
    });
    
    // Deleta a conta pendente
    await deleteDoc(doc(db, "pendingAccounts", id));
    
    // Recarrega ambas as listas
    loadPendingAccounts();
    loadTransactions();
  }
};

// ➕ ADICIONAR SERVIÇO REALIZADO
async function addEarnedService(e) {
  e.preventDefault();

  if (!earnedText.value || !earnedAmount.value || !earnedDate.value || !earnedClient.value) {
    alert('Preencha todos os campos');
    return;
  }

  await addDoc(collection(db, "earnedServices"), {
    text: earnedText.value,
    amount: parseFloat(earnedAmount.value),
    date: earnedDate.value,
    client: earnedClient.value,
    status: 'pending',
    createdAt: new Date()
  });

  earnedForm.reset();
  loadEarnedServices();
}

// 📥 CARREGAR SERVIÇOS REALIZADOS
async function loadEarnedServices() {
  earnedServices = [];
  const snapshot = await getDocs(collection(db, "earnedServices"));

  snapshot.forEach(docSnap => {
    earnedServices.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });

  init();
}

// ❌ REMOVER SERVIÇO
window.removeEarnedService = async function(id) {
  await deleteDoc(doc(db, "earnedServices", id));
  loadEarnedServices();
};

// ✅ MARCAR SERVIÇO COMO RECEBIDO
window.markAsReceived = async function(id) {
  // Encontra o serviço
  const service = earnedServices.find(e => e.id === id);
  
  if (service) {
    // Cria uma nova transação de entrada
    await addDoc(collection(db, "transactions"), {
      text: service.text,
      amount: service.amount,
      date: service.date,
      category: service.client,
      type: 'income',
      createdAt: new Date()
    });
    
    // Deleta o serviço
    await deleteDoc(doc(db, "earnedServices", id));
    
    // Recarrega ambas as listas
    loadEarnedServices();
    loadTransactions();
  }
};

// ============================================================
// 5. FILTROS E CÁLCULOS
// ============================================================
function getFilteredTransactions() {
  if (!filterMonth.value) return transactions;
  return transactions.filter(t => t.date.startsWith(filterMonth.value));
}

function updateValues() {
  const values = getFilteredTransactions().map(t => t.amount);

  const total = values.reduce((a, b) => a + b, 0);
  const income = values.filter(v => v > 0).reduce((a, b) => a + b, 0);
  const expense = values.filter(v => v < 0).reduce((a, b) => a + b, 0) * -1;

  balance.innerText = formatCurrency(total);
  moneyPlus.innerText = formatCurrency(income);
  moneyMinus.innerText = formatCurrency(expense);

  // Cálculo automático de Caixa e Conta com base na forma de pagamento
  if (cashBalanceEl && accountBalanceEl && cashAccountTotalEl) {
    let cashBalance = 0;
    let accountBalance = 0;

    getFilteredTransactions().forEach(t => {
      const method = t.paymentMethod || 'account'; // padrão para transações antigas

      if (method === 'cash') {
        cashBalance += t.amount;
      } else {
        accountBalance += t.amount;
      }
    });

    const totalCashAccount = cashBalance + accountBalance;

    cashBalanceEl.innerText = formatCurrency(cashBalance);
    accountBalanceEl.innerText = formatCurrency(accountBalance);
    cashAccountTotalEl.innerText = formatCurrency(totalCashAccount);
  }
}

function updateAlerts() {
  // Contas pendentes
  const pendingPaid = pendingAccounts.filter(p => p.status === 'pending');
  const totalPending = pendingPaid.reduce((sum, p) => sum + p.amount, 0);
  pendingTotal.innerText = formatCurrency(totalPending);
  pendingCount.innerText = `${pendingPaid.length} conta${pendingPaid.length !== 1 ? 's' : ''} pendente${pendingPaid.length !== 1 ? 's' : ''}`;

  // Serviços não recebidos
  const earnedNotReceived = earnedServices.filter(e => e.status === 'pending');
  const totalEarned = earnedNotReceived.reduce((sum, e) => sum + e.amount, 0);
  earnedTotal.innerText = formatCurrency(totalEarned);
  earnedCount.innerText = `${earnedNotReceived.length} serviço${earnedNotReceived.length !== 1 ? 's' : ''} aguardando`;
}

// ============================================================
// 6. UI (TABELA + GRÁFICO)
// ============================================================
function addTransactionDOM(t) {
  const tr = document.createElement('tr');

  tr.innerHTML = `
    <td>${formatDate(t.date)}</td>
    <td>${t.text}</td>
    <td>${t.category}</td>
    <td style="color:${t.amount < 0 ? 'var(--red)' : 'var(--green)'}">
      ${t.amount < 0 ? '-' : '+'} ${formatCurrency(Math.abs(t.amount))}
    </td>
    <td>
      <button class="edit-btn" onclick="editTransaction('${t.id}')" title="Editar">✏️</button>
      <button class="delete-btn" onclick="removeTransaction('${t.id}')" title="Excluir">🗑️</button>
    </td>
  `;

  list.appendChild(tr);
}

function updateChart() {
  const ctx = document.getElementById('expenseChart');
  if (!ctx) return;

  const expenses = getFilteredTransactions().filter(t => t.type === 'expense');
  const totals = {};

  expenses.forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + Math.abs(t.amount);
  });

  if (myChart) myChart.destroy();
  if (!Object.keys(totals).length) return;

  myChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(totals),
      datasets: [{ data: Object.values(totals) }]
    }
  });
}

function updateBalanceChart() {
  const ctx = document.getElementById('balanceChart');
  if (!ctx) return;

  // Obter transações do mês atual
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
  const monthTransactions = transactions.filter(t => t.date.startsWith(currentMonth));

  if (monthTransactions.length === 0) {
    if (balanceChart) balanceChart.destroy();
    return;
  }

  // Ordenar por data
  monthTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Calcular saldo acumulado por dia
  const balanceByDate = {};
  let cumulativeBalance = 0;

  monthTransactions.forEach(t => {
    cumulativeBalance += t.amount;
    balanceByDate[t.date] = cumulativeBalance;
  });

  const dates = Object.keys(balanceByDate);
  const balances = Object.values(balanceByDate);

  if (balanceChart) balanceChart.destroy();

  balanceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates.map(d => formatDate(d)),
      datasets: [{
        label: 'Saldo ao Longo do Mês',
        data: balances,
        borderColor: '#8257e5',
        backgroundColor: 'rgba(130, 87, 229, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: 6,
        pointBackgroundColor: '#8257e5',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: '#9466ff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: '#e1e1e6',
            font: {
              size: 14,
              weight: 'bold'
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: '#323238'
          },
          ticks: {
            color: '#a8a8b3'
          }
        },
        y: {
          grid: {
            color: '#323238'
          },
          ticks: {
            color: '#a8a8b3',
            callback: function(value) {
              return formatCurrency(value);
            }
          }
        }
      }
    }
  });
}

function updateIncomeChart() {
  const ctx = document.getElementById('incomeChart');
  if (!ctx) return;

  // Obter transações do mês atual
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
  const monthTransactions = transactions.filter(t => t.date.startsWith(currentMonth));

  if (monthTransactions.length === 0) {
    if (incomeChart) incomeChart.destroy();
    return;
  }

  // Calcular total de entradas e saídas por dia
  const incomeByDate = {};
  const expenseByDate = {};

  monthTransactions.forEach(t => {
    if (t.type === 'income') {
      if (!incomeByDate[t.date]) {
        incomeByDate[t.date] = 0;
      }
      incomeByDate[t.date] += t.amount;
    } else if (t.type === 'expense') {
      if (!expenseByDate[t.date]) {
        expenseByDate[t.date] = 0;
      }
      expenseByDate[t.date] += Math.abs(t.amount);
    }
  });

  const allDates = [...new Set([...Object.keys(incomeByDate), ...Object.keys(expenseByDate)])].sort();
  const incomes = allDates.map(d => incomeByDate[d] || 0);
  const expenses = allDates.map(d => expenseByDate[d] || 0);

  if (incomeChart) incomeChart.destroy();

  incomeChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: allDates.map(d => formatDate(d)),
      datasets: [
        {
          label: 'Entradas',
          data: incomes,
          backgroundColor: '#00b37e',
          borderColor: '#00d78f',
          borderWidth: 2,
          borderRadius: 5,
          hoverBackgroundColor: '#00d78f'
        },
        {
          label: 'Saídas',
          data: expenses,
          backgroundColor: '#f75a68',
          borderColor: '#ff6b7d',
          borderWidth: 2,
          borderRadius: 5,
          hoverBackgroundColor: '#ff6b7d'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: '#e1e1e6',
            font: {
              size: 14,
              weight: 'bold'
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: '#323238'
          },
          ticks: {
            color: '#a8a8b3'
          }
        },
        y: {
          grid: {
            color: '#323238'
          },
          ticks: {
            color: '#a8a8b3',
            callback: function(value) {
              return formatCurrency(value);
            }
          }
        }
      }
    }
  });
}

// ============================================================
// 6b. UI PARA CONTAS PENDENTES
// ============================================================
function addPendingAccountDOM(account) {
  const tr = document.createElement('tr');
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = account.date < today;
  
  // Calcular dias até o vencimento (negativo = atrasado)
  const accountDate = new Date(account.date);
  const todayDate = new Date(today);
  const daysUntilDue = Math.floor((accountDate - todayDate) / (1000 * 60 * 60 * 24));
  
  // Definir cor e ícone baseado no status
  let dateStyle = 'color: var(--text-color)';
  let dateDisplay = formatDate(account.date);
  
  if (daysUntilDue < -5) {
    dateStyle = 'color: var(--red); font-weight: bold;';
    dateDisplay = `⚠️ ${formatDate(account.date)} (${Math.abs(daysUntilDue)} dias atrasado)`;
  } else if (daysUntilDue < 0) {
    dateStyle = 'color: var(--red);';
    dateDisplay = `${formatDate(account.date)} (${Math.abs(daysUntilDue)} dias atrasado)`;
  } else if (daysUntilDue <= 5) {
    dateStyle = 'color: #ff9500; font-weight: bold;';
    dateDisplay = `⚠️ ${formatDate(account.date)} (vence em ${daysUntilDue} dias)`;
  }

  tr.innerHTML = `
    <td style="${dateStyle}">
      ${dateDisplay}
    </td>
    <td>${account.text}</td>
    <td>${account.category}</td>
    <td style="color: var(--red); font-weight: bold;">
      ${formatCurrency(account.amount)}
    </td>
    <td>
      <button class="action-btn" onclick="markAsPaid('${account.id}')" title="Marcar como pago">✓</button>
      <button class="delete-btn" onclick="removePendingAccount('${account.id}')">🗑️</button>
    </td>
  `;

  pendingList.appendChild(tr);
}

// ============================================================
// 6c. UI PARA SERVIÇOS NÃO PAGOS
// ============================================================
function addEarnedServiceDOM(service) {
  const tr = document.createElement('tr');
  const today = new Date();
  const serviceDate = new Date(service.date);
  const daysOpen = Math.floor((today - serviceDate) / (1000 * 60 * 60 * 24));

  // Definir cor e ícone baseado no número de dias
  let daysStyle = '';
  let daysDisplay = `${daysOpen} dias`;
  
  if (daysOpen > 30) {
    daysStyle = 'color: var(--red); font-weight: bold; background-color: rgba(247, 90, 104, 0.15); padding: 5px 10px; border-radius: 4px;';
    daysDisplay = `⚠️ ${daysOpen} dias (CRÍTICO)`;
  } else if (daysOpen > 15) {
    daysStyle = 'color: #ff9500; font-weight: bold; background-color: rgba(255, 149, 0, 0.15); padding: 5px 10px; border-radius: 4px;';
    daysDisplay = `⚠️ ${daysOpen} dias`;
  } else if (daysOpen > 5) {
    daysStyle = 'color: #ff9500;';
    daysDisplay = `${daysOpen} dias`;
  } else {
    daysStyle = 'color: var(--green);';
    daysDisplay = `${daysOpen} dias`;
  }

  tr.innerHTML = `
    <td>${formatDate(service.date)}</td>
    <td>${service.text}</td>
    <td>${service.client}</td>
    <td style="color: var(--green); font-weight: bold;">
      ${formatCurrency(service.amount)}
    </td>
    <td style="${daysStyle}">
      ${daysDisplay}
    </td>
    <td>
      ${service.status === 'pending' ? `<button class="action-btn" onclick="markAsReceived('${service.id}')" title="Marcar como recebido">✓</button>` : ''}
      <button class="delete-btn" onclick="removeEarnedService('${service.id}')">🗑️</button>
    </td>
  `;

  earnedList.appendChild(tr);
}

// ============================================================
// 7. RENDERIZAÇÃO COM PAGINAÇÃO
// ============================================================
function renderTransactions() {
  const filteredTransactions = getFilteredTransactions()
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  list.innerHTML = '';
  const start = transactionsPage * transactionsPerPage;
  const end = start + transactionsPerPage;
  const paginatedTransactions = filteredTransactions.slice(0, end);

  paginatedTransactions.forEach(addTransactionDOM);

  // Adicionar botão "Carregar mais" se houver mais itens
  if (filteredTransactions.length > end) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td colspan="5" style="text-align: center; padding: 20px;">
        <button class="load-more-btn" onclick="loadMoreTransactions()">Carregar Mais</button>
      </td>
    `;
    list.appendChild(tr);
  }
}

function loadMoreTransactions() {
  transactionsPage++;
  renderTransactions();
}

function renderPendingAccounts() {
  const sortedPending = pendingAccounts
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  pendingList.innerHTML = '';
  const start = pendingPage * pendingPerPage;
  const end = start + pendingPerPage;
  const paginatedPending = sortedPending.slice(0, end);

  paginatedPending.forEach(addPendingAccountDOM);

  // Adicionar botão "Carregar mais" se houver mais itens
  if (sortedPending.length > end) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td colspan="5" style="text-align: center; padding: 20px;">
        <button class="load-more-btn" onclick="loadMorePending()">Carregar Mais</button>
      </td>
    `;
    pendingList.appendChild(tr);
  }
}

function loadMorePending() {
  pendingPage++;
  renderPendingAccounts();
}

function renderEarnedServices() {
  const sortedEarned = earnedServices
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  earnedList.innerHTML = '';
  const start = earnedPage * earnedPerPage;
  const end = start + earnedPerPage;
  const paginatedEarned = sortedEarned.slice(0, end);

  paginatedEarned.forEach(addEarnedServiceDOM);

  // Adicionar botão "Carregar mais" se houver mais itens
  if (sortedEarned.length > end) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td colspan="6" style="text-align: center; padding: 20px;">
        <button class="load-more-btn" onclick="loadMoreEarned()">Carregar Mais</button>
      </td>
    `;
    earnedList.appendChild(tr);
  }
}

function loadMoreEarned() {
  earnedPage++;
  renderEarnedServices();
}

// ============================================================
// 7b. INIT
// ============================================================
function init() {
  // Reset paginação ao atualizar
  transactionsPage = 0;
  pendingPage = 0;
  earnedPage = 0;

  renderTransactions();
  renderPendingAccounts();
  renderEarnedServices();

  updateValues();
  updateAlerts();
  updateChart();
  updateBalanceChart();
  updateIncomeChart();
}

// ============================================================
// 8. EVENTOS
// ============================================================
form.addEventListener('submit', addTransaction);
pendingForm.addEventListener('submit', addPendingAccount);
earnedForm.addEventListener('submit', addEarnedService);
filterMonth.addEventListener('change', init);
clearFilterBtn.addEventListener('click', () => {
  filterMonth.value = '';
  init();
});

// Atualização dos campos de Caixa e Conta
if (cashAmountInput && accountAmountInput) {
  cashAmountInput.addEventListener('input', updateCashAccountValues);
  accountAmountInput.addEventListener('input', updateCashAccountValues);
}

// ============================================================
// 9. GERAR RELATÓRIO EM PDF
// ============================================================
function generatePDF() {
  const today = new Date();
  const todayFormatted = today.toLocaleDateString('pt-BR');
  const currentMonth = today.toISOString().slice(0, 7);
  
  const values = transactions.map(t => t.amount);
  const total = values.reduce((a, b) => a + b, 0);
  const income = values.filter(v => v > 0).reduce((a, b) => a + b, 0);
  const expense = values.filter(v => v < 0).reduce((a, b) => a + b, 0) * -1;
  
  // Calcular dados do mês
  const monthTransactions = transactions.filter(t => t.date.startsWith(currentMonth));
  const monthValues = monthTransactions.map(t => t.amount);
  const monthTotal = monthValues.reduce((a, b) => a + b, 0);
  const monthIncome = monthValues.filter(v => v > 0).reduce((a, b) => a + b, 0);
  const monthExpense = monthValues.filter(v => v < 0).reduce((a, b) => a + b, 0) * -1;
  
  // Calcular dados pendentes
  const pendingPaid = pendingAccounts.filter(p => p.status === 'pending');
  const totalPending = pendingPaid.reduce((sum, p) => sum + p.amount, 0);
  const earnedNotReceived = earnedServices.filter(e => e.status === 'pending');
  const totalEarned = earnedNotReceived.reduce((sum, e) => sum + e.amount, 0);

  // Capturar gráficos como imagens
  let balanceChartImg = '';
  let incomeChartImg = '';
  
  const balanceChartCanvas = document.getElementById('balanceChart');
  const incomeChartCanvas = document.getElementById('incomeChart');
  
  if (balanceChartCanvas && balanceChartCanvas.parentElement.offsetHeight > 0) {
    balanceChartImg = balanceChartCanvas.toDataURL('image/png');
  }
  
  if (incomeChartCanvas && incomeChartCanvas.parentElement.offsetHeight > 0) {
    incomeChartImg = incomeChartCanvas.toDataURL('image/png');
  }

  // Criar conteúdo HTML para o PDF
  let htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
      <h1 style="text-align: center; color: #8257e5; border-bottom: 3px solid #8257e5; padding-bottom: 15px; margin-bottom: 5px;">
        📊 RELATÓRIO FINANCEIRO COMPLETO
      </h1>
      
      <p style="text-align: center; color: #666; margin-bottom: 30px; font-size: 12px;">
        Gerado em: ${todayFormatted}
      </p>

      <h2 style="color: #8257e5; margin-top: 20px; border-bottom: 2px solid #8257e5; padding-bottom: 10px; font-size: 16px;">
        💰 RESUMO GERAL
      </h2>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
        <tr style="background-color: #f5f5f5;">
          <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold; width: 50%;">Saldo Total Geral:</td>
          <td style="padding: 12px; border: 1px solid #ddd; color: ${total >= 0 ? '#00b37e' : '#f75a68'}; font-weight: bold; font-size: 16px;">
            ${formatCurrency(total)}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Total de Entradas:</td>
          <td style="padding: 12px; border: 1px solid #ddd; color: #00b37e; font-weight: bold;">
            ${formatCurrency(income)}
          </td>
        </tr>
        <tr style="background-color: #f5f5f5;">
          <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Total de Saídas:</td>
          <td style="padding: 12px; border: 1px solid #ddd; color: #f75a68; font-weight: bold;">
            ${formatCurrency(expense)}
          </td>
        </tr>
      </table>

      <h2 style="color: #8257e5; margin-top: 20px; border-bottom: 2px solid #8257e5; padding-bottom: 10px; font-size: 16px;">
        📅 RESUMO DO MÊS (${today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})
      </h2>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
        <tr style="background-color: #f5f5f5;">
          <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold; width: 50%;">Saldo do Mês:</td>
          <td style="padding: 12px; border: 1px solid #ddd; color: ${monthTotal >= 0 ? '#00b37e' : '#f75a68'}; font-weight: bold;">
            ${formatCurrency(monthTotal)}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Entradas do Mês:</td>
          <td style="padding: 12px; border: 1px solid #ddd; color: #00b37e; font-weight: bold;">
            ${formatCurrency(monthIncome)}
          </td>
        </tr>
        <tr style="background-color: #f5f5f5;">
          <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Saídas do Mês:</td>
          <td style="padding: 12px; border: 1px solid #ddd; color: #f75a68; font-weight: bold;">
            ${formatCurrency(monthExpense)}
          </td>
        </tr>
      </table>

      <h2 style="color: #8257e5; margin-top: 20px; border-bottom: 2px solid #8257e5; padding-bottom: 10px; font-size: 16px;">
        📈 GRÁFICOS ANALÍTICOS
      </h2>
      
      ${balanceChartImg ? `
        <div style="margin-bottom: 30px; text-align: center;">
          <h3 style="color: #666; margin-bottom: 10px; font-size: 14px;">Evolução do Saldo ao Longo do Mês</h3>
          <img src="${balanceChartImg}" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 5px;" />
        </div>
      ` : ''}
      
      ${incomeChartImg ? `
        <div style="margin-bottom: 30px; text-align: center;">
          <h3 style="color: #666; margin-bottom: 10px; font-size: 14px;">Entradas e Saídas Diárias</h3>
          <img src="${incomeChartImg}" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 5px;" />
        </div>
      ` : ''}

      <h2 style="color: #8257e5; margin-top: 20px; border-bottom: 2px solid #8257e5; padding-bottom: 10px; font-size: 16px;">
        ⚠️ SITUAÇÃO FINANCEIRA
      </h2>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
        <tr style="background-color: #f5f5f5;">
          <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold; width: 50%;">Contas a Pagar:</td>
          <td style="padding: 12px; border: 1px solid #ddd; color: #f75a68; font-weight: bold;">
            ${formatCurrency(totalPending)} (${pendingPaid.length} conta${pendingPaid.length !== 1 ? 's' : ''})
          </td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Serviços não Recebidos:</td>
          <td style="padding: 12px; border: 1px solid #ddd; color: #00b37e; font-weight: bold;">
            ${formatCurrency(totalEarned)} (${earnedNotReceived.length} serviço${earnedNotReceived.length !== 1 ? 's' : ''})
          </td>
        </tr>
      </table>

      <h2 style="color: #8257e5; margin-top: 20px; border-bottom: 2px solid #8257e5; padding-bottom: 10px; font-size: 16px;">
        📌 CONTAS A PAGAR (${pendingPaid.length})
      </h2>
      
      ${pendingPaid.length > 0 ? `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
          <tr style="background-color: #8257e5; color: white;">
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left; font-size: 13px;">Vencimento</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left; font-size: 13px;">Descrição</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left; font-size: 13px;">Categoria</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: right; font-size: 13px;">Valor</th>
          </tr>
          ${pendingPaid.map((p, i) => `
            <tr style="background-color: ${i % 2 === 0 ? '#f9f9f9' : 'white'};">
              <td style="padding: 12px; border: 1px solid #ddd; font-size: 12px;">${formatDate(p.date)}</td>
              <td style="padding: 12px; border: 1px solid #ddd; font-size: 12px;">${p.text}</td>
              <td style="padding: 12px; border: 1px solid #ddd; font-size: 12px;">${p.category}</td>
              <td style="padding: 12px; border: 1px solid #ddd; text-align: right; color: #f75a68; font-weight: bold; font-size: 12px;">
                ${formatCurrency(p.amount)}
              </td>
            </tr>
          `).join('')}
        </table>
      ` : '<p style="color: #999; font-style: italic;">Nenhuma conta pendente 🎉</p>'}

      <h2 style="color: #8257e5; margin-top: 20px; border-bottom: 2px solid #8257e5; padding-bottom: 10px; font-size: 16px;">
        💰 SERVIÇOS NÃO RECEBIDOS (${earnedNotReceived.length})
      </h2>
      
      ${earnedNotReceived.length > 0 ? `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
          <tr style="background-color: #8257e5; color: white;">
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left; font-size: 13px;">Data</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left; font-size: 13px;">Serviço</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left; font-size: 13px;">Cliente</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: right; font-size: 13px;">Valor</th>
          </tr>
          ${earnedNotReceived.map((e, i) => {
            const serviceDate = new Date(e.date);
            const daysOpen = Math.floor((today - serviceDate) / (1000 * 60 * 60 * 24));
            return `
              <tr style="background-color: ${i % 2 === 0 ? '#f9f9f9' : 'white'};">
                <td style="padding: 12px; border: 1px solid #ddd; font-size: 12px;">${formatDate(e.date)} (${daysOpen} dias)</td>
                <td style="padding: 12px; border: 1px solid #ddd; font-size: 12px;">${e.text}</td>
                <td style="padding: 12px; border: 1px solid #ddd; font-size: 12px;">${e.client}</td>
                <td style="padding: 12px; border: 1px solid #ddd; text-align: right; color: #00b37e; font-weight: bold; font-size: 12px;">
                  ${formatCurrency(e.amount)}
                </td>
              </tr>
            `;
          }).join('')}
        </table>
      ` : '<p style="color: #999; font-style: italic;">Nenhum serviço pendente 🎉</p>'}

      <h2 style="color: #8257e5; margin-top: 20px; border-bottom: 2px solid #8257e5; padding-bottom: 10px; font-size: 16px;">
        📋 ÚLTIMAS TRANSAÇÕES (${transactions.length} total)
      </h2>
      
      ${transactions.length > 0 ? `
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #8257e5; color: white;">
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left; font-size: 13px;">Data</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left; font-size: 13px;">Descrição</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left; font-size: 13px;">Categoria</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left; font-size: 13px;">Tipo</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: right; font-size: 13px;">Valor</th>
          </tr>
          ${transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50).map((t, i) => `
            <tr style="background-color: ${i % 2 === 0 ? '#f9f9f9' : 'white'};">
              <td style="padding: 12px; border: 1px solid #ddd; font-size: 11px;">${formatDate(t.date)}</td>
              <td style="padding: 12px; border: 1px solid #ddd; font-size: 11px;">${t.text}</td>
              <td style="padding: 12px; border: 1px solid #ddd; font-size: 11px;">${t.category}</td>
              <td style="padding: 12px; border: 1px solid #ddd; font-size: 11px; color: ${t.type === 'income' ? '#00b37e' : '#f75a68'};">
                ${t.type === 'income' ? 'Entrada' : 'Saída'}
              </td>
              <td style="padding: 12px; border: 1px solid #ddd; text-align: right; color: ${t.amount < 0 ? '#f75a68' : '#00b37e'}; font-weight: bold; font-size: 11px;">
                ${t.amount < 0 ? '-' : '+'} ${formatCurrency(Math.abs(t.amount))}
              </td>
            </tr>
          `).join('')}
        </table>
        <p style="color: #999; font-size: 11px; margin-top: 10px;">
          * Mostrando as últimas 50 transações de um total de ${transactions.length}
        </p>
      ` : '<p style="color: #999; font-style: italic;">Nenhuma transação registrada</p>'}

      <div style="margin-top: 40px; padding-top: 20px; border-top: 3px solid #8257e5; text-align: center; color: #666; font-size: 11px;">
        <p style="font-weight: bold; margin-bottom: 5px;">📱 Sistema de Controle Financeiro</p>
        <p style="color: #999; margin: 0;">Relatório gerado automaticamente | Master info</p>
      </div>
    </div>
  `;

  // Configuração do html2pdf
  const element = document.createElement('div');
  element.innerHTML = htmlContent;
  
  const opt = {
    margin: 8,
    filename: `relatorio-financeiro-${todayFormatted.replace(/\//g, '-')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
  };

  html2pdf().set(opt).from(element).save();
}

if (generatePdfBtn) {
  generatePdfBtn.addEventListener('click', generatePDF);
}

// ============================================================
// 10. CARROSSEL - DETECTAR FOCO
// ============================================================
const carouselContainer = document.querySelector('.carousel-container');
const carouselSections = document.querySelectorAll('.carousel-section');

if (carouselContainer) {
  // Atualizar opacidade ao fazer scroll
  carouselContainer.addEventListener('scroll', () => {
    carouselSections.forEach(section => {
      const rect = section.getBoundingClientRect();
      const containerRect = carouselContainer.getBoundingClientRect();
      
      // Verificar se a seção está visível
      const distanceFromCenter = Math.abs(
        rect.left + rect.width / 2 - (containerRect.left + containerRect.width / 2)
      );
      
      const maxDistance = containerRect.width / 2;
      const opacity = Math.max(0.6, 1 - distanceFromCenter / maxDistance * 0.4);
      
      section.style.opacity = opacity;
    });
  });
  
  // Primeiro scroll para atualizar opacidades
  carouselContainer.dispatchEvent(new Event('scroll'));
}

// 🚀 START
loadTransactions();
loadPendingAccounts();
loadEarnedServices();
