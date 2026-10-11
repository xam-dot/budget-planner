const categoryColors = {
  Housing: "#527d5e",
  Food: "#d99c52",
  Transport: "#6f91bd",
  Utilities: "#9c82bc",
  Health: "#d27d72",
  Lifestyle: "#d0b653",
  Education: "#5aa89a",
  Other: "#a2aaa1"
};

const expenseList = document.getElementById("expense-list");
const rowTemplate = document.getElementById("expense-row-template");
const incomeInput = document.getElementById("monthly-income");
const goalInput = document.getElementById("savings-goal");
const monthInput = document.getElementById("budget-month");
const printMonth = document.getElementById("print-month");
const expenseCount = document.getElementById("expense-count");
const expenseTotal = document.getElementById("planned-expenses");
const panelTotal = document.getElementById("panel-total");
const remainingAmount = document.getElementById("remaining-amount");
const remainingHint = document.getElementById("remaining-hint");
const emptyState = document.getElementById("empty-state");
const donutChart = document.getElementById("donut-chart");
const chartTotal = document.getElementById("chart-total");
const chartEmpty = document.getElementById("chart-empty");
const categoryLegend = document.getElementById("category-legend");
const progressFill = document.getElementById("goal-progress-fill");
const progressBar = document.getElementById("goal-progress");
const progressLabel = document.getElementById("goal-progress-label");
const progressPercent = document.getElementById("goal-progress-percent");
let rowId = 0;

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function amountValue(input) {
  const amount = Number(input.value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function formatMoney(amount) {
  return `K${amount.toLocaleString("en-ZM", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function addExpenseRow() {
  const fragment = rowTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".expense-row");
  const nameInput = row.querySelector(".expense-name");
  const categorySelect = row.querySelector(".expense-category");
  const amountInput = row.querySelector(".expense-amount");
  const id = ++rowId;

  nameInput.id = `expense-name-${id}`;
  row.querySelector(".item-label").htmlFor = nameInput.id;
  categorySelect.id = `expense-category-${id}`;
  row.querySelector(".category-label").htmlFor = categorySelect.id;
  amountInput.id = `expense-amount-${id}`;
  row.querySelector(".amount-label").htmlFor = amountInput.id;

  nameInput.value = "";
  categorySelect.value = "Housing";
  amountInput.value = "0";

  expenseList.appendChild(fragment);
}

function collectPlan() {
  const expenses = [...expenseList.querySelectorAll(".expense-row")].map(row => ({
    name: row.querySelector(".expense-name").value.trim(),
    category: row.querySelector(".expense-category").value,
    amount: amountValue(row.querySelector(".expense-amount"))
  }));

  return {
    month: monthInput.value || currentMonth(),
    income: amountValue(incomeInput),
    goal: amountValue(goalInput),
    expenses
  };
}

function updateBreakdown(expenses, total) {
  const totalsByCategory = new Map();
  expenses.forEach(expense => {
    if (expense.amount > 0) {
      totalsByCategory.set(
        expense.category,
        (totalsByCategory.get(expense.category) || 0) + expense.amount
      );
    }
  });

  const categories = [...totalsByCategory.entries()].sort((a, b) => b[1] - a[1]);
  chartTotal.textContent = total > 0 ? `K${total.toLocaleString("en-ZM", { maximumFractionDigits: 0 })}` : "K0";
  chartEmpty.hidden = total > 0;
  categoryLegend.replaceChildren();

  if (total <= 0) {
    donutChart.style.background = "conic-gradient(#ecf0e9 0deg 360deg)";
    return;
  }

  let degrees = 0;
  const slices = categories.map(([category, amount]) => {
    const start = degrees;
    degrees += amount / total * 360;
    return `${categoryColors[category] || categoryColors.Other} ${start}deg ${degrees}deg`;
  });
  donutChart.style.background = `conic-gradient(${slices.join(", ")})`;

  categories.forEach(([category, amount]) => {
    const item = document.createElement("li");
    item.className = "legend-item";
    const name = document.createElement("span");
    name.className = "legend-name";
    const swatch = document.createElement("span");
    swatch.className = "legend-swatch";
    swatch.style.backgroundColor = categoryColors[category] || categoryColors.Other;
    const label = document.createElement("span");
    label.textContent = category;
    name.append(swatch, label);
    const value = document.createElement("strong");
    value.textContent = `${formatMoney(amount)} · ${Math.round(amount / total * 100)}%`;
    item.append(name, value);
    categoryLegend.appendChild(item);
  });
}

function updateGoalProgress(remaining, goal) {
  const progress = goal > 0 ? Math.max(0, Math.min(100, remaining / goal * 100)) : 0;
  progressFill.style.width = `${progress}%`;
  progressBar.setAttribute("aria-valuenow", String(Math.round(progress)));
  progressPercent.textContent = `${Math.round(progress)}%`;

  if (goal <= 0) {
    progressLabel.textContent = "Add a goal to track your progress";
  } else if (remaining < 0) {
    progressLabel.textContent = "Adjust your plan to make room to save";
  } else {
    progressLabel.textContent = `${formatMoney(remaining)} available toward your goal`;
  }
}

function updateDashboard() {
  const expenses = collectPlan().expenses;
  const income = amountValue(incomeInput);
  const goal = amountValue(goalInput);
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remaining = income - total;

  expenseCount.textContent = String(expenses.length);
  expenseTotal.textContent = formatMoney(total);
  panelTotal.textContent = formatMoney(total);
  remainingAmount.textContent = remaining < 0
    ? `-${formatMoney(Math.abs(remaining))}`
    : formatMoney(remaining);
  remainingHint.textContent = income <= 0
    ? "Add your income to get started"
    : remaining < 0
      ? "Over budget — review your plan"
      : "Available after planned expenses";
  remainingAmount.classList.toggle("over-budget", remaining < 0);
  emptyState.hidden = expenses.length > 0;
  updateBreakdown(expenses, total);
  updateGoalProgress(remaining, goal);
}

function refreshPlan() {
  updateDashboard();
  updatePrintMonth();
}

function updatePrintMonth() {
  const [year, month] = monthInput.value.split("-").map(Number);
  if (year && month) {
    printMonth.textContent = new Date(year, month - 1).toLocaleDateString("en", {
      month: "long",
      year: "numeric"
    });
  }
}

function downloadCsv() {
  const plan = collectPlan();
  const total = plan.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const rows = [
    ["Monthly budget", plan.month],
    ["Income", formatMoney(plan.income)],
    ["Savings goal", formatMoney(plan.goal)],
    [],
    ["Expense", "Category", "Planned amount"],
    ...plan.expenses.map(expense => [expense.name, expense.category, formatMoney(expense.amount)]),
    [],
    ["Total planned expenses", formatMoney(total)],
    ["Left to plan", formatMoney(plan.income - total)]
  ];
  const csv = rows.map(row => row.map(value => {
    const text = String(value ?? "");
    return `"${text.replaceAll('"', '""')}"`;
  }).join(",")).join("\r\n");
  const file = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = `Budget-${plan.month || currentMonth()}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

document.getElementById("add-expense-btn").addEventListener("click", () => {
  addExpenseRow();
  refreshPlan();
  expenseList.lastElementChild.querySelector(".expense-name").focus();
});
document.getElementById("empty-add-btn").addEventListener("click", () => {
  document.getElementById("add-expense-btn").click();
});
expenseList.addEventListener("input", refreshPlan);
expenseList.addEventListener("change", refreshPlan);
expenseList.addEventListener("click", event => {
  const removeButton = event.target.closest(".remove-btn");
  if (removeButton) {
    removeButton.closest(".expense-row").remove();
    refreshPlan();
  }
});
incomeInput.addEventListener("input", refreshPlan);
goalInput.addEventListener("input", refreshPlan);
monthInput.addEventListener("input", refreshPlan);
document.getElementById("export-btn").addEventListener("click", downloadCsv);
document.getElementById("print-btn").addEventListener("click", () => window.print());

monthInput.value = currentMonth();
incomeInput.value = "0";
goalInput.value = "0";
updateDashboard();
updatePrintMonth();
