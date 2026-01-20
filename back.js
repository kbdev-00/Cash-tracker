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
const currencySymbols = document.querySelectorAll("#currencySymbol");

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
if (setSalaryBtn) {
  setSalaryBtn.addEventListener("click", () => {
    const val = Number(salaryInput.value);
    if (!val || val <= 0 || isNaN(val)) {
      alert("Please enter valid salary");
      return;
    }

    salary = val;
    salaryInput.value = "";
    alertShown = false;

    updateUI();
    saveToLocalStorage();
  });
}

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
    amount: amount / exchangeRate
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
      alert("⚠️ Warning: Your remaining balance is below 10% of your salary!");
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

    // 🔥 SYMBOL UPDATE
    const symbol = currentCurrency === "USD" ? "$" : "₹";
    currencySymbols.forEach(el => el.innerText = symbol);

    if (currentCurrency === "USD") {
      try {
        const res = await fetch(
          "https://api.frankfurter.app/latest?from=INR&to=USD"
        );
        const data = await res.json();
        exchangeRate = data.rates.USD;
      } catch (err) {
        exchangeRate = 1;
        currentCurrency = "INR";
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

    let y = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ===== PREMIUM HEADER =====
    // Header gradient effect with two colors
    doc.setFillColor(37, 99, 235); // Darker blue
    doc.rect(0, 0, pageWidth, 45, "F");
    
    doc.setFillColor(59, 130, 246); // Lighter blue
    doc.rect(0, 35, pageWidth, 10, "F");

    // Title
    doc.setFontSize(28);
    doc.setFont(undefined, "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("CASH-FLOW REPORT", pageWidth / 2, 18, { align: "center" });

    // Subtitle
    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.setTextColor(220, 235, 255);
    doc.text("Smart Financial Dashboard", pageWidth / 2, 28, { align: "center" });

    // Date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()} | ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 20, 40);

    // Reset text color
    doc.setTextColor(0, 0, 0);
    y = 55;

    // ===== SUMMARY CARDS WITH BORDERS =====
    const cardHeight = 28;
    const cardWidth = (pageWidth - 50) / 3;
    const cardY = y;

    const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);
    const balance = salary - totalExpense;

    // Card 1: Salary (Green)
    doc.setFillColor(16, 185, 129);
    doc.rect(15, cardY, cardWidth, cardHeight, "F");
    doc.setDrawColor(10, 140, 100);
    doc.setLineWidth(0.5);
    doc.rect(15, cardY, cardWidth, cardHeight);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text("TOTAL SALARY", 18, cardY + 7);
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text(`${(salary * exchangeRate).toFixed(2)}`, 18, cardY + 18);
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.text(currentCurrency, 18, cardY + 24);

    // Card 2: Expenses (Red)
    doc.setFillColor(239, 68, 68);
    doc.rect(15 + cardWidth + 10, cardY, cardWidth, cardHeight, "F");
    doc.setDrawColor(200, 40, 40);
    doc.setLineWidth(0.5);
    doc.rect(15 + cardWidth + 10, cardY, cardWidth, cardHeight);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text("TOTAL EXPENSES", 20 + cardWidth + 10, cardY + 7);
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text(`${(totalExpense * exchangeRate).toFixed(2)}`, 20 + cardWidth + 10, cardY + 18);
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.text(currentCurrency, 20 + cardWidth + 10, cardY + 24);

    // Card 3: Balance (Dynamic color)
    const balanceColor = balance < 0 ? [220, 38, 38] : [34, 197, 94];
    const borderColor = balance < 0 ? [180, 30, 30] : [22, 160, 70];
    doc.setFillColor(...balanceColor);
    doc.rect(15 + (cardWidth + 10) * 2, cardY, cardWidth, cardHeight, "F");
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.5);
    doc.rect(15 + (cardWidth + 10) * 2, cardY, cardWidth, cardHeight);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text("REMAINING BALANCE", 20 + (cardWidth + 10) * 2, cardY + 7);
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text(`${(balance * exchangeRate).toFixed(2)}`, 20 + (cardWidth + 10) * 2, cardY + 18);
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.text(currentCurrency, 20 + (cardWidth + 10) * 2, cardY + 24);

    y += 45;

    // ===== DIVIDER LINE =====
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(15, y, pageWidth - 15, y);

    y += 8;

    // ===== EXPENSE DETAILS SECTION HEADER =====
    doc.setFillColor(99, 102, 241); // Indigo
    doc.rect(15, y - 4, pageWidth - 30, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, "bold");
    doc.setFontSize(12);
    doc.text("EXPENSE BREAKDOWN", 20, y + 2);

    y += 12;

    // ===== TABLE HEADER =====
    doc.setFillColor(79, 70, 229); // Darker indigo
    doc.rect(15, y - 5, pageWidth - 30, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("S.No", 20, y + 1);
    doc.text("Item Name", 40, y + 1);
    doc.text("Amount", 140, y + 1);

    y += 10;

    // ===== TABLE DATA =====
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);

    if (expenses.length === 0) {
      doc.setFont(undefined, "italic");
      doc.setTextColor(100, 100, 100);
      doc.text("No expenses recorded yet", 20, y);
    } else {
      expenses.forEach((item, index) => {
        if (y > pageHeight - 30) {
          doc.addPage();
          y = 20;
        }

        // Alternating row colors
        if (index % 2 === 0) {
          doc.setFillColor(245, 248, 252);
          doc.rect(15, y - 5, pageWidth - 30, 7, "F");
        }

        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, "normal");
        doc.text(`${index + 1}`, 20, y);
        doc.text(item.name, 40, y);
        doc.text(`${(item.amount * exchangeRate).toFixed(2)} ${currentCurrency}`, 140, y);
        y += 8;
      });
    }

    // ===== FOOTER =====
    y = pageHeight - 12;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(15, y - 2, pageWidth - 15, y - 2);

    doc.setFontSize(8);
    doc.setFont(undefined, "italic");
    doc.setTextColor(120, 120, 120);
    doc.text("CashFlow Pro • Smart Financial Dashboard", pageWidth / 2, y + 3, { align: "center" });
    doc.text(`Page 1 of ${doc.internal.pages.length - 1}`, pageWidth / 2, y + 7, { align: "center" });

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
