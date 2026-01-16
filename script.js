import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


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

// Chave para o LocalStorage
const STORAGE_KEY = 'empresa_financas_v1';

// Variável global para o gráfico (para poder destruir e recriar)
let myChart = null;

// ============================================================
// 2. ESTADO DA APLICAÇÃO
// ============================================================
let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

// ============================================================
// 3. FUNÇÕES UTILITÁRIAS (FORMATADORES)
// ============================================================
const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

const formatDate = (dateString) => {
    if(!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

// ============================================================
// 4. FUNÇÕES PRINCIPAIS
// ============================================================

// --- Adicionar Transação ---
function addTransaction(e) {
    e.preventDefault();

    if (text.value.trim() === '' || amount.value.trim() === '' || date.value === '') {
        alert('Por favor, preencha todos os campos');
        return;
    }

    const transactionType = type.value;
    let transactionAmount = parseFloat(amount.value);
    
    // Se for despesa, converte para negativo
    if (transactionType === 'expense') {
        transactionAmount = Math.abs(transactionAmount) * -1;
    } else {
        transactionAmount = Math.abs(transactionAmount);
    }

    const transaction = {
        id: generateID(),
        text: text.value,
        amount: transactionAmount,
        date: date.value,
        category: category.value,
        type: transactionType
    };

    transactions.push(transaction);
    updateLocalStorage();
    init(); // Atualiza tudo (tabela, cards e gráfico)

    // Limpar formulário
    text.value = '';
    amount.value = '';
    date.value = '';
}

// --- Gerar ID aleatório ---
function generateID() {
    return Math.floor(Math.random() * 100000000);
}

// --- Remover Transação ---
// Precisamos expor essa função ao escopo global para o botão "onclick" do HTML funcionar
window.removeTransaction = function(id) {
    transactions = transactions.filter(transaction => transaction.id !== id);
    updateLocalStorage();
    init();
}

// --- Filtrar Transações (Mês ou Tudo) ---
function getFilteredTransactions() {
    const filterValue = filterMonth.value; // YYYY-MM
    if (!filterValue) return transactions;

    return transactions.filter(t => t.date.startsWith(filterValue));
}

// --- Atualizar Cards do Dashboard ---
function updateValues() {
    const currentTransactions = getFilteredTransactions();
    const amounts = currentTransactions.map(transaction => transaction.amount);

    const total = amounts.reduce((acc, item) => (acc += item), 0);

    const income = amounts
        .filter(item => item > 0)
        .reduce((acc, item) => (acc += item), 0);

    const expense = (amounts
        .filter(item => item < 0)
        .reduce((acc, item) => (acc += item), 0) * -1);

    balance.innerText = formatCurrency(total);
    moneyPlus.innerText = formatCurrency(income);
    moneyMinus.innerText = formatCurrency(expense);
}

// --- Atualizar Tabela HTML ---
function addTransactionDOM(transaction) {
    const tr = document.createElement('tr');
    const amountWithoutSign = Math.abs(transaction.amount);

    tr.innerHTML = `
        <td>${formatDate(transaction.date)}</td>
        <td>${transaction.text}</td>
        <td>${transaction.category}</td>
        <td class="transaction-amount" style="color: ${transaction.amount < 0 ? 'var(--red)' : 'var(--green)'}">
            ${transaction.amount < 0 ? '- ' : '+ '}${formatCurrency(amountWithoutSign)}
        </td>
        <td>
            <button class="delete-btn" onclick="removeTransaction(${transaction.id})">x</button>
        </td>
    `;

    list.appendChild(tr);
}

// --- ATUALIZAR GRÁFICO (Chart.js) ---
function updateChart() {
    const ctx = document.getElementById('expenseChart');
    if (!ctx) return; // Segurança caso o canvas não exista

    // 1. Pega dados filtrados
    const currentTransactions = getFilteredTransactions();

    // 2. Filtra apenas SAÍDAS (Despesas)
    const expenses = currentTransactions.filter(t => t.type === 'expense');

    // 3. Soma por categoria
    const totalsByCategory = {};
    expenses.forEach(t => {
        const cat = t.category;
        const val = Math.abs(t.amount);
        if (totalsByCategory[cat]) {
            totalsByCategory[cat] += val;
        } else {
            totalsByCategory[cat] = val;
        }
    });

    const labels = Object.keys(totalsByCategory);
    const dataValues = Object.values(totalsByCategory);

    // 4. Se não houver despesas, esconde ou mostra vazio? 
    // Vamos deixar vazio mas destruir o gráfico anterior
    if (myChart) {
        myChart.destroy();
    }

    // Se não tiver dados para mostrar, paramos aqui
    if (labels.length === 0) return;

    // 5. Cria o Gráfico
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: [
                    '#f75a68', // Vermelho (Impostos/Saídas padrão)
                    '#8257e5', // Roxo (Marketing)
                    '#fba94c', // Laranja (Ferramentas)
                    '#00b37e', // Verde (Serviços - irônico para gasto, mas bom contraste)
                    '#12a454', // Outro verde
                    '#008f65',
                    '#e1e1e6'
                ],
                borderColor: '#202024', // Cor do fundo do card para "recortar" as fatias
                borderWidth: 2,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#a8a8b3', // Cor da fonte da legenda
                        font: { size: 12 }
                    }
                },
                title: {
                    display: true,
                    text: 'Despesas por Categoria',
                    color: '#e1e1e6',
                    font: { size: 16, weight: 'normal' },
                    padding: { bottom: 20 }
                }
            }
        }
    });
}

// --- Salvar no LocalStorage ---
function updateLocalStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

// ============================================================
// 5. INICIALIZAÇÃO
// ============================================================
function init() {
    list.innerHTML = '';
    const filtered = getFilteredTransactions();
    
    // Ordenar por data (recente primeiro)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    filtered.forEach(addTransactionDOM);
    updateValues();
    updateChart(); // <--- CHAMA A ATUALIZAÇÃO DO GRÁFICO
}

// Event Listeners
form.addEventListener('submit', addTransaction);
filterMonth.addEventListener('change', init);
clearFilterBtn.addEventListener('click', () => {
    filterMonth.value = '';
    init();
});

// Inicia ao carregar a página
init();