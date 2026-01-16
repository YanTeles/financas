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
  doc
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

let myChart = null;

// ============================================================
// 2. ESTADO DA APLICAÇÃO
// ============================================================
let transactions = [];

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

// ============================================================
// 7. INIT
// ============================================================
function init() {
  list.innerHTML = '';
  getFilteredTransactions()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach(addTransactionDOM);

  updateValues();
  updateChart();
}

// ============================================================
// 8. EVENTOS
// ============================================================
form.addEventListener('submit', addTransaction);
filterMonth.addEventListener('change', init);
clearFilterBtn.addEventListener('click', () => {
  filterMonth.value = '';
  init();
});

// 🚀 START
loadTransactions();
