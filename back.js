// ===============================
// GLOBAL VARIABLES
// ===============================
let salary = 0;
let expenses = [];
let expenseChart = null;

// Currency & alert globals
let currentCurrency = "INR";
let exchangeRate = 1; // default INR
let alertShown = false;

// ===============================
// DOM ELEMENTS
// ===============================
const salaryInput = document.getElementById("salaryInput");
const setSalaryBtn = document.getElementById("setSalaryBtn");

const expenseNameInput = document.getElementById("expenseName");
const expenseAmountInput = document.getElementById("expenseAmount");
const addExpenseBtn = document.getElementById("addExpenseBtn");

const salaryDisplay = document.getElementById("salaryDisplay");
const expenseDisplay = document.getElementById("expenseDisplay");
const balanceDisplay = document.getElementById("balanceDisplay");

const expenseList = document.getElementById("expenseList");
const emptyMsg = document.getElementById("emptyMsg");

const currencySelect = document.getElementById("currencySelect");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");

// ===============================
// PAGE LOAD
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  loadFromLocalStorage();
  updateUI();
});

// ===============================
// SET SALARY
// ===============================
setSalaryBtn.addEventListener("click", () => {
  const value = Number(salaryInput.value);

  if (value <= 0 || isNaN(value)) {
    alert("Please enter a valid salary");
    return;
  }

  salary = value;
  salaryInput.value = "";

  updateUI();
  saveToLocalStorage();
});

// ===============================
// ADD EXPENSE
// ===============================
addExpenseBtn.addEventListener("click", () => {
  const name = expenseNameInput.value.trim();
  const amount = Number(expenseAmountInput.value);

  if (name === "" || amount <= 0 || isNaN(amount)) {
    alert("Please enter valid expense details");
    return;
  }

  expenses.push({
    id: Date.now(),
    name,
    amount
  });

  expenseNameInput.value = "";
  expenseAmountInput.value = "";

  updateUI();
  saveToLocalStorage();
});

// ===============================
// DELETE EXPENSE
// ===============================
function deleteExpense(id) {
  expenses = expenses.filter(item => item.id !== id);
  updateUI();
  saveToLocalStorage();
}

// ===============================
// UPDATE UI
// ===============================
function updateUI() {
  const totalExpense = expenses.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const balance = salary - totalExpense;

  // Display (converted)
  salaryDisplay.innerText = (salary * exchangeRate).toFixed(2);
  expenseDisplay.innerText = (totalExpense * exchangeRate).toFixed(2);
  balanceDisplay.innerText = (balance * exchangeRate).toFixed(2);

  // Budget alert (10% rule)
  if (salary > 0 && balance < salary * 0.1) {
    balanceDisplay.style.color = "red";

    if (!alertShown) {
      alert("⚠️ Warning: Remaining balance below 10%");
      alertShown = true;
    }
  } else {
    balanceDisplay.style.color = "";
    alertShown = false;
  }

  renderExpenseList();
  renderChart();
}

// ===============================
// RENDER EXPENSE LIST
// ===============================
function renderExpenseList() {
  expenseList.innerHTML = "";

  if (expenses.length === 0) {
    emptyMsg.style.display = "block";
  } else {
    emptyMsg.style.display = "none";
  }

  expenses.forEach(item => {
    const li = document.createElement("li");

    li.innerHTML = `
      <span>
        ${item.name} - ${(item.amount * exchangeRate).toFixed(2)} ${currentCurrency}
      </span>
      <button onclick="deleteExpense(${item.id})">🗑️</button>
    `;

    expenseList.appendChild(li);
  });
}

// ===============================
// CHART.JS (SAFE PIE CHART)
// ===============================
function renderChart() {
  const canvas = document.getElementById("expenseChart");
  if (!canvas) return;

  const totalExpense = expenses.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const remaining = salary - totalExpense;

  // No data → no chart
  if (salary === 0 && expenses.length === 0) {
    if (expenseChart) {
      expenseChart.destroy();
      expenseChart = null;
    }
    return;
  }

  const ctx = canvas.getContext("2d");

  if (expenseChart) {
    expenseChart.destroy();
  }

  expenseChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Expenses", "Remaining"],
      datasets: [
        {
          data: [
            totalExpense,
            remaining > 0 ? remaining : 0
          ],
          backgroundColor: ["#dc2626", "#16a34a"]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });
}

// ===============================
// LOCAL STORAGE
// ===============================
function saveToLocalStorage() {
  const data = { salary, expenses };
  localStorage.setItem("cashflowData", JSON.stringify(data));
}

function loadFromLocalStorage() {
  const data = localStorage.getItem("cashflowData");
  if (data) {
    const parsed = JSON.parse(data);
    salary = parsed.salary || 0;
    expenses = parsed.expenses || [];
  }
}

// ===============================
// CURRENCY CONVERTER
// ===============================
if (currencySelect) {
  currencySelect.addEventListener("change", async () => {
    currentCurrency = currencySelect.value;

    if (currentCurrency === "USD") {
      try {
        const res = await fetch(
          "https://api.frankfurter.app/latest?from=INR&to=USD"
        );
        const data = await res.json();
        exchangeRate = data.rates.USD;
      } catch (err) {
        alert("Currency conversion failed. Using INR.");
        exchangeRate = 1;
        currentCurrency = "INR";
        currencySelect.value = "INR";
      }
    } else {
      exchangeRate = 1;
    }

    updateUI();
  });
}

// ===============================
// PDF DOWNLOAD (jsPDF)
// ===============================
if (downloadPdfBtn) {
  downloadPdfBtn.addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let y = 20;

    doc.setFontSize(16);
    doc.text("Cash-Flow Report", 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.text(`Currency: ${currentCurrency}`, 20, y);
    y += 10;

    const totalExpense = expenses.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    const balance = salary - totalExpense;

    doc.text(
      `Total Salary: ${(salary * exchangeRate).toFixed(2)} ${currentCurrency}`,
      20,
      y
    );
    y += 8;

    doc.text(
      `Total Expenses: ${(totalExpense * exchangeRate).toFixed(2)} ${currentCurrency}`,
      20,
      y
    );
    y += 8;

    doc.text(
      `Remaining Balance: ${(balance * exchangeRate).toFixed(2)} ${currentCurrency}`,
      20,
      y
    );
    y += 12;

    doc.setFontSize(13);
    doc.text("Expense Details:", 20, y);
    y += 8;

    doc.setFontSize(11);

    if (expenses.length === 0) {
      doc.text("No expenses added.", 20, y);
    } else {
      expenses.forEach((item, index) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        doc.text(
          `${index + 1}. ${item.name} - ${(item.amount * exchangeRate).toFixed(
            2
          )} ${currentCurrency}`,
          20,
          y
        );
        y += 7;
      });
    }

    doc.save("Cash-Flow-Report.pdf");
  });
}
function renderChart() {
  const canvas = document.getElementById("expenseChart");
  if (!canvas || typeof Chart === "undefined") return;

  const totalExpense = expenses.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const remaining = salary - totalExpense;

  // ❗ Agar salary bhi nahi aur expense bhi nahi → chart mat banao
  if (salary === 0 && totalExpense === 0) {
    if (expenseChart) {
      expenseChart.destroy();
      expenseChart = null;
    }
    return;
  }

  const ctx = canvas.getContext("2d");

  if (expenseChart) {
    expenseChart.destroy();
  }

  expenseChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Expenses", "Remaining"],
      datasets: [
        {
          data: [
            totalExpense,
            remaining > 0 ? remaining : 0
          ],
          backgroundColor: ["#ef4444", "#22c55e"]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}
