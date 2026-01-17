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

let myChart = null;
let balanceChart = null;
let incomeChart = null;

// ============================================================
// 2. ESTADO DA APLICAÇÃO
// ============================================================
let transactions = [];
let pendingAccounts = [];
let earnedServices = [];

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

// ❌ REMOVER
window.removeTransaction = async function(id) {
  await deleteDoc(doc(db, "transactions", id));
  loadTransactions();
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
      <button class="delete-btn" onclick="removeTransaction('${t.id}')">x</button>
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

  tr.innerHTML = `
    <td style="color: ${isOverdue ? 'var(--red)' : 'var(--text-color)'}">
      ${formatDate(account.date)}
    </td>
    <td>${account.text}</td>
    <td>${account.category}</td>
    <td style="color: var(--red); font-weight: bold;">
      ${formatCurrency(account.amount)}
    </td>
    <td>
      <button class="action-btn" onclick="markAsPaid('${account.id}')" title="Marcar como pago">✓</button>
      <button class="delete-btn" onclick="removePendingAccount('${account.id}')">x</button>
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

  tr.innerHTML = `
    <td>${formatDate(service.date)}</td>
    <td>${service.text}</td>
    <td>${service.client}</td>
    <td style="color: var(--green); font-weight: bold;">
      ${formatCurrency(service.amount)}
    </td>
    <td style="color: ${daysOpen > 30 ? 'var(--red)' : daysOpen > 15 ? 'var(--text-secondary)' : 'var(--green)'}">
      ${daysOpen} dias
    </td>
    <td>
      ${service.status === 'pending' ? `<button class="action-btn" onclick="markAsReceived('${service.id}')" title="Marcar como recebido">✓</button>` : ''}
      <button class="delete-btn" onclick="removeEarnedService('${service.id}')">x</button>
    </td>
  `;

  earnedList.appendChild(tr);
}

// ============================================================
// 7. INIT
// ============================================================
function init() {
  list.innerHTML = '';
  getFilteredTransactions()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach(addTransactionDOM);

  pendingList.innerHTML = '';
  pendingAccounts
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach(addPendingAccountDOM);

  earnedList.innerHTML = '';
  earnedServices
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach(addEarnedServiceDOM);

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

// ============================================================
// 9. GERAR RELATÓRIO EM PDF
// ============================================================
function generatePDF() {
  const today = new Date().toLocaleDateString('pt-BR');
  
  const values = transactions.map(t => t.amount);
  const total = values.reduce((a, b) => a + b, 0);
  const income = values.filter(v => v > 0).reduce((a, b) => a + b, 0);
  const expense = values.filter(v => v < 0).reduce((a, b) => a + b, 0) * -1;

  // Criar conteúdo HTML para o PDF
  let htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
      <h1 style="text-align: center; color: #8257e5; border-bottom: 2px solid #8257e5; padding-bottom: 10px;">
        📊 RELATÓRIO FINANCEIRO COMPLETO
      </h1>
      
      <p style="text-align: center; color: #666; margin-bottom: 30px;">
        Gerado em: ${today}
      </p>

      <h2 style="color: #8257e5; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">
        💰 RESUMO FINANCEIRO
      </h2>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr style="background-color: #f5f5f5;">
          <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Saldo Total:</td>
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

      <h2 style="color: #8257e5; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">
        📌 CONTAS A PAGAR (${pendingAccounts.filter(p => p.status === 'pending').length})
      </h2>
      
      ${pendingAccounts.length > 0 ? `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background-color: #8257e5; color: white;">
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Vencimento</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Descrição</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Categoria</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Valor</th>
          </tr>
          ${pendingAccounts.map((p, i) => `
            <tr style="background-color: ${i % 2 === 0 ? '#f9f9f9' : 'white'};">
              <td style="padding: 12px; border: 1px solid #ddd;">${formatDate(p.date)}</td>
              <td style="padding: 12px; border: 1px solid #ddd;">${p.text}</td>
              <td style="padding: 12px; border: 1px solid #ddd;">${p.category}</td>
              <td style="padding: 12px; border: 1px solid #ddd; text-align: right; color: #f75a68; font-weight: bold;">
                ${formatCurrency(p.amount)}
              </td>
            </tr>
          `).join('')}
        </table>
      ` : '<p style="color: #999; font-style: italic;">Nenhuma conta pendente 🎉</p>'}

      <h2 style="color: #8257e5; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">
        💰 SERVIÇOS NÃO RECEBIDOS (${earnedServices.filter(e => e.status === 'pending').length})
      </h2>
      
      ${earnedServices.length > 0 ? `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background-color: #8257e5; color: white;">
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Data</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Serviço</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Cliente</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Valor</th>
          </tr>
          ${earnedServices.map((e, i) => `
            <tr style="background-color: ${i % 2 === 0 ? '#f9f9f9' : 'white'};">
              <td style="padding: 12px; border: 1px solid #ddd;">${formatDate(e.date)}</td>
              <td style="padding: 12px; border: 1px solid #ddd;">${e.text}</td>
              <td style="padding: 12px; border: 1px solid #ddd;">${e.client}</td>
              <td style="padding: 12px; border: 1px solid #ddd; text-align: right; color: #00b37e; font-weight: bold;">
                ${formatCurrency(e.amount)}
              </td>
            </tr>
          `).join('')}
        </table>
      ` : '<p style="color: #999; font-style: italic;">Nenhum serviço pendente 🎉</p>'}

      <h2 style="color: #8257e5; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 10px;">
        📋 HISTÓRICO DE TRANSAÇÕES (${transactions.length})
      </h2>
      
      ${transactions.length > 0 ? `
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #8257e5; color: white;">
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Data</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Descrição</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Categoria</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Valor</th>
          </tr>
          ${transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 30).map((t, i) => `
            <tr style="background-color: ${i % 2 === 0 ? '#f9f9f9' : 'white'};">
              <td style="padding: 12px; border: 1px solid #ddd;">${formatDate(t.date)}</td>
              <td style="padding: 12px; border: 1px solid #ddd;">${t.text}</td>
              <td style="padding: 12px; border: 1px solid #ddd;">${t.category}</td>
              <td style="padding: 12px; border: 1px solid #ddd; text-align: right; color: ${t.amount < 0 ? '#f75a68' : '#00b37e'}; font-weight: bold;">
                ${t.amount < 0 ? '-' : '+'} ${formatCurrency(Math.abs(t.amount))}
              </td>
            </tr>
          `).join('')}
        </table>
        <p style="color: #999; font-size: 12px; margin-top: 10px;">
          * Mostrando as últimas 30 transações
        </p>
      ` : '<p style="color: #999; font-style: italic;">Nenhuma transação registrada</p>'}

      <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #eee; text-align: center; color: #999; font-size: 12px;">
        <p>Relatório gerado automaticamente pelo Sistema Financeiro Corp</p>
      </div>
    </div>
  `;

  // Configuração do html2pdf
  const element = document.createElement('div');
  element.innerHTML = htmlContent;
  
  const opt = {
    margin: 10,
    filename: `relatorio-financeiro-${today.replace(/\//g, '-')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
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
