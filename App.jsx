import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { Plus, Search, Trash2, Pencil, Download, TrendingUp, TrendingDown, Wallet, PiggyBank, AlertTriangle, X, Sparkles, Calendar as CalendarIcon, ChevronLeft, ChevronRight, HandCoins, CheckCircle2, Clock3 } from "lucide-react";

// A wide, distinct palette so default AND custom categories always get their own color.
const PALETTE = [
  "#B5533C", "#5A7D8C", "#6B5B95", "#B08D3D", "#4A7A6A", "#A23E3E",
  "#3B5D4E", "#8A6D2E", "#C97A9E", "#3E6B8C", "#9C5B8C", "#588C5A",
  "#C2703D", "#4F6B7A", "#7A6C4F", "#5F5E5A",
];

const DEFAULT_CATEGORIES = [
  { name: "Salary", icon: "💵", color: PALETTE[0] },
  { name: "Ammi", icon: "👩🏻", color: PALETTE[13] },
  { name: "Credit Card", icon: "💳", color: PALETTE[1] },
  { name: "KOKO", icon: "🅚", color: PALETTE[2] },
  { name: "Seetuwa", icon: "💸", color: PALETTE[3] },
  { name: "ATM", icon: "🏧", color: PALETTE[4] },
  { name: "Reload", icon: "📲", color: PALETTE[14] },
  { name: "PickMe/Uber", icon: "🚕", color: PALETTE[5] },
  { name: "Food", icon: "🍔", color: PALETTE[6] },
  { name: "Shopping", icon: "🛒", color: PALETTE[7] },
  { name: "Office", icon: "💼", color: PALETTE[8] },
  { name: "Date", icon: "💑", color: PALETTE[9] },
  { name: "Game", icon: "🎮", color: PALETTE[10] },
  { name: "Lents", icon: "🤝", color: PALETTE[11] },
  { name: "Savings", icon: "🐷", color: PALETTE[12] },
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CURRENCY = "Rs. ";

function fmt(n) {
  const v = Number(n) || 0;
  return CURRENCY + v.toLocaleString("en-LK", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function nextMonthLabel() {
  const d = new Date();
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return `${MONTHS[next.getMonth()]} ${next.getFullYear()}`;
}

const STORAGE_KEY = "ledger-app-state";

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [transactions, setTransactions] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const categories = useMemo(() => [...DEFAULT_CATEGORIES, ...customCategories], [customCategories]);

  // Load persisted state
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY);
        if (res && res.value) {
          const data = JSON.parse(res.value);
          setTransactions(data.transactions || []);
          setCustomCategories(data.customCategories || []);
          if (Array.isArray(data.budgetItems)) {
            setBudgetItems(data.budgetItems);
          } else if (data.monthlyBudget) {
            // migrate old single-number budget into an itemized entry
            setBudgetItems([{ id: uid(), name: "Budget", amount: Number(data.monthlyBudget) || 0, type: "expense" }]);
          }
        }
      } catch (e) {
        // no saved state yet
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Persist state on change
  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        const payload = JSON.stringify({ transactions, customCategories, budgetItems });
        const result = await window.storage.set(STORAGE_KEY, payload);
        setSaveError(!result);
      } catch (e) {
        setSaveError(true);
      }
    })();
  }, [transactions, customCategories, budgetItems, loaded]);

  const addTransaction = useCallback((tx) => {
    setTransactions((prev) => [{ ...tx, id: uid() }, ...prev]);
  }, []);

  const updateTransaction = useCallback((id, tx) => {
    setTransactions((prev) => prev.map((t) => (t.id === id ? { ...tx, id } : t)));
  }, []);

  const deleteTransaction = useCallback((id) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addCategory = useCallback((cat) => {
    setCustomCategories((prev) => [...prev, cat]);
  }, []);

  const addBudgetItem = useCallback((item) => {
    setBudgetItems((prev) => [...prev, { ...item, id: uid() }]);
  }, []);

  const updateBudgetItem = useCallback((id, item) => {
    setBudgetItems((prev) => prev.map((b) => (b.id === id ? { ...item, id } : b)));
  }, []);

  const deleteBudgetItem = useCallback((id) => {
    setBudgetItems((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const resetAll = useCallback(() => {
    setTransactions([]);
    setCustomCategories([]);
    setBudgetItems([]);
  }, []);

  const totals = useMemo(() => {
    let income = 0, spent = 0, savings = 0;
    transactions.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === "income") income += amt;
      else if (t.type === "savings") savings += amt;
      else spent += amt;
    });
    // Money set aside for savings is deducted as an expense too.
    const expense = spent + savings;
    return { income, expense, savings, balance: income - expense };
  }, [transactions]);

  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const monthlySpend = useMemo(() => {
    return transactions
      .filter((t) => t.type === "expense" && t.date && t.date.slice(0, 7) === thisMonthKey)
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  }, [transactions, thisMonthKey]);

  const plannedIncome = useMemo(
    () => budgetItems.filter((b) => b.type === "income").reduce((s, b) => s + (Number(b.amount) || 0), 0),
    [budgetItems]
  );
  const plannedExpense = useMemo(
    () => budgetItems.filter((b) => b.type === "expense").reduce((s, b) => s + (Number(b.amount) || 0), 0),
    [budgetItems]
  );
  const plannedSavings = useMemo(
    () => budgetItems.filter((b) => b.type === "savings").reduce((s, b) => s + (Number(b.amount) || 0), 0),
    [budgetItems]
  );

  return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .ledger-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .ledger-scroll::-webkit-scrollbar-thumb { background: #C9C0AC; border-radius: 4px; }
        input, select, textarea { font-family: 'IBM Plex Sans', sans-serif; }
        button { font-family: 'IBM Plex Sans', sans-serif; cursor: pointer; }
        .navbtn { transition: all 0.15s ease; }
      `}</style>

      <div style={styles.shell}>
        <Header tab={tab} setTab={setTab} />
        {saveError && (
          <div style={styles.errorBanner}>Couldn't save changes — your data may not persist.</div>
        )}
        <div style={styles.content} className="ledger-scroll">
          {tab === "dashboard" && (
            <Dashboard totals={totals} transactions={transactions} categories={categories} onUpdate={updateTransaction} />
          )}
          {tab === "calendar" && (
            <CalendarView transactions={transactions} categories={categories} />
          )}
          {tab === "add" && (
            <AddTransaction categories={categories} onAdd={addTransaction} onAddCategory={addCategory} setTab={setTab} />
          )}
          {tab === "history" && (
            <History transactions={transactions} categories={categories} onUpdate={updateTransaction} onDelete={deleteTransaction} onAddCategory={addCategory} />
          )}
          {tab === "reports" && (
            <Reports transactions={transactions} categories={categories} />
          )}
          {tab === "budget" && (
            <BudgetPlanner
              budgetItems={budgetItems}
              categories={categories}
              onAdd={addBudgetItem}
              onUpdate={updateBudgetItem}
              onDelete={deleteBudgetItem}
              plannedIncome={plannedIncome}
              plannedExpense={plannedExpense}
              plannedSavings={plannedSavings}
              onResetAll={resetAll}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Header({ tab, setTab }) {
  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "calendar", label: "Calendar" },
    { id: "add", label: "Add entry" },
    { id: "history", label: "History" },
    { id: "reports", label: "Reports" },
    { id: "budget", label: "Budget" },
  ];
  return (
    <div style={styles.header}>
      <div style={styles.brandRow}>
        <div style={styles.brandMark}>Ⓛ</div>
        <div>
          <div style={styles.brandTitle}>The Ledger</div>
          <div style={styles.brandSub}>personal finance, kept in order</div>
        </div>
      </div>
      <div style={styles.navRow}>
        {tabs.map((t) => (
          <button
            key={t.id}
            className="navbtn"
            onClick={() => setTab(t.id)}
            style={{
              ...styles.navBtn,
              ...(tab === t.id ? styles.navBtnActive : {}),
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, tone }) {
  const toneColor = tone === "income" ? "#3B5D4E" : tone === "expense" ? "#A23E3E" : tone === "brass" ? "#8A6D2E" : "#1F2D3D";
  return (
    <div style={styles.statCard}>
      <div style={styles.statTop}>
        <span style={styles.statLabel}>{label}</span>
        <span style={{ color: toneColor }}>{icon}</span>
      </div>
      <div style={{ ...styles.statValue, color: toneColor }}>{fmt(value)}</div>
    </div>
  );
}

function Dashboard({ totals, transactions, categories, onUpdate }) {
  const [showLent, setShowLent] = useState(false);

  const recent = useMemo(() => [...transactions].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 6), [transactions]);

  const catMap = useMemo(() => {
    const m = {};
    categories.forEach((c, i) => (m[c.name] = c.color || PALETTE[i % PALETTE.length]));
    return m;
  }, [categories]);

  const catIconMap = useMemo(() => {
    const m = {};
    categories.forEach((c) => (m[c.name] = c));
    return m;
  }, [categories]);

  const lentOutstanding = useMemo(
    () => transactions.filter((t) => t.category === "Lents" && !t.settled).reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [transactions]
  );

  const pieData = useMemo(() => {
    const sums = {};
    transactions.forEach((t) => {
      // Savings are deducted as spending too, so they share the category breakdown.
      if (t.type !== "expense" && t.type !== "savings") return;
      sums[t.category] = (sums[t.category] || 0) + (Number(t.amount) || 0);
    });
    return Object.entries(sums).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  return (
    <div>
      <div style={styles.statGrid}>
        <button
          type="button"
          onClick={() => setShowLent((s) => !s)}
          style={{ ...styles.statCard, textAlign: "left", border: "1px solid #C9C0AC" }}
        >
          <div style={styles.statTop}>
            <span style={styles.statLabel}>{showLent ? "Balance + lent money" : "Total balance"}</span>
            <span style={{ color: showLent ? "#7A6C4F" : "#1F2D3D" }}>
              {showLent ? <HandCoins size={16} /> : <Wallet size={16} />}
            </span>
          </div>
          <div style={{ ...styles.statValue, color: showLent ? "#7A6C4F" : "#1F2D3D" }}>
            {fmt(showLent ? totals.balance + lentOutstanding : totals.balance)}
          </div>
          <div style={{ fontSize: 10.5, color: "#8A8477", marginTop: 4, fontStyle: "italic" }}>
            {showLent ? `Includes ${fmt(lentOutstanding)} lent out` : "Tap to include lent money"}
          </div>
        </button>
        <StatCard label="Total income" value={totals.income} icon={<TrendingUp size={16} />} tone="income" />
        <StatCard label="Total expenses" value={totals.expense} icon={<TrendingDown size={16} />} tone="expense" />
        <StatCard label="Savings" value={totals.savings} icon={<PiggyBank size={16} />} tone="brass" />
      </div>

      <LentsWidget transactions={transactions} onUpdate={onUpdate} />

      <div style={styles.panel}>
        <div style={styles.panelTitle}>Spending by category</div>
        {pieData.length === 0 ? (
          <EmptyState text="No expenses recorded yet." />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="46%"
                outerRadius={85}
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((entry, i) => (
                  <Cell key={entry.name} fill={catMap[entry.name] || PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ fontFamily: "IBM Plex Sans", borderRadius: 6, border: "1px solid #C9C0AC" }} />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontFamily: "IBM Plex Sans", fontSize: 12, paddingTop: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={styles.panel}>
        <div style={styles.panelTitle}>Recent transactions</div>
        {recent.length === 0 ? (
          <EmptyState text="No entries yet. Add your first transaction to begin the ledger." />
        ) : (
          <div>
            {recent.map((t) => (
              <LedgerRow key={t.id} t={t} cat={catIconMap[t.category]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(todayISO());
  const target = new Date(dateStr);
  return Math.round((target - today) / 86400000);
}

function LentsWidget({ transactions, onUpdate }) {
  const allLents = useMemo(
    () =>
      transactions
        .filter((t) => t.category === "Lents")
        .sort((a, b) => {
          if (!!a.settled !== !!b.settled) return a.settled ? 1 : -1;
          return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
        }),
    [transactions]
  );
  const outstandingTotal = allLents.reduce((s, t) => s + (t.settled ? 0 : Number(t.amount) || 0), 0);

  if (allLents.length === 0) return null;

  return (
    <div style={{ ...styles.panel, background: "#F4EFE0", borderColor: "#DCC98E" }}>
      <div style={styles.panelTitleRow}>
        <span style={styles.panelTitle}><HandCoins size={15} style={{ verticalAlign: -3, marginRight: 6 }} />Lents</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 16, fontWeight: 600, color: "#7A6C4F" }}>{fmt(outstandingTotal)} outstanding</span>
      </div>
      <div>
        {allLents.slice(0, 8).map((t) => {
          const d = daysUntil(t.dueDate);
          const overdue = !t.settled && d !== null && d < 0;
          const soon = !t.settled && d !== null && d >= 0 && d <= 3;
          return (
            <div key={t.id} style={{ ...styles.ledgerRow, opacity: t.settled ? 0.55 : 1 }}>
              <div style={styles.ledgerLeft}>
                <span style={styles.ledgerIcon}>{t.settled ? "✅" : "🤝"}</span>
                <div>
                  <div style={{ ...styles.ledgerDesc, textDecoration: t.settled ? "line-through" : "none" }}>{t.notes || "Lent money"}</div>
                  <div style={{ ...styles.ledgerMeta, display: "flex", alignItems: "center", gap: 4, color: overdue ? "#A23E3E" : soon ? "#B08D3D" : "#6B6559" }}>
                    {t.settled ? (
                      "Returned"
                    ) : (
                      <>
                        <Clock3 size={11} />
                        {t.dueDate ? (overdue ? `Overdue by ${Math.abs(d)}d` : d === 0 ? "Due today" : `Due in ${d}d (${t.dueDate})`) : "No return date set"}
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div style={styles.ledgerDots} />
              <div style={styles.ledgerRight}>
                <span style={{ ...styles.ledgerAmount, color: "#7A6C4F" }}>{fmt(t.amount)}</span>
                {onUpdate && (
                  <button
                    style={styles.iconBtn}
                    title={t.settled ? "Mark as outstanding" : "Mark as returned"}
                    onClick={() => onUpdate(t.id, { ...t, settled: !t.settled })}
                  >
                    <CheckCircle2 size={13} color={t.settled ? "#3B5D4E" : "#6B6559"} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {allLents.length > 8 && (
        <div style={{ fontSize: 12.5, color: "#6B6559", marginTop: 8, fontStyle: "italic" }}>
          +{allLents.length - 8} more in History
        </div>
      )}
    </div>
  );
}

function LedgerRow({ t, cat, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isIncome = t.type === "income";
  const isSavings = t.type === "savings";
  const amountColor = isIncome ? "#3B5D4E" : isSavings ? "#8A6D2E" : "#A23E3E";
  const sign = isIncome ? "+" : isSavings ? "→" : "−";
  return (
    <div style={styles.ledgerRow}>
      <div style={styles.ledgerLeft}>
        <span style={styles.ledgerIcon}>{cat ? cat.icon : "➕"}</span>
        <div>
          <div style={styles.ledgerDesc}>{t.notes || t.category}</div>
          <div style={styles.ledgerMeta}>{t.category} · {t.date}</div>
        </div>
      </div>
      <div style={styles.ledgerDots} />
      <div style={styles.ledgerRight}>
        {confirmDelete ? (
          <>
            <span style={{ fontSize: 12, color: "#A23E3E", fontStyle: "italic" }}>Delete?</span>
            <div style={styles.rowActions}>
              <button
                style={{ ...styles.iconBtn, borderColor: "#A23E3E", color: "#A23E3E" }}
                onClick={onDelete}
                aria-label="Confirm delete"
              >
                <CheckCircle2 size={13} />
              </button>
              <button style={styles.iconBtn} onClick={() => setConfirmDelete(false)} aria-label="Cancel delete">
                <X size={13} />
              </button>
            </div>
          </>
        ) : (
          <>
            <span style={{ ...styles.ledgerAmount, color: amountColor }}>
              {sign}{fmt(t.amount)}
            </span>
            {(onEdit || onDelete) && (
              <div style={styles.rowActions}>
                {onEdit && <button style={styles.iconBtn} onClick={onEdit} aria-label="Edit"><Pencil size={13} /></button>}
                {onDelete && <button style={styles.iconBtn} onClick={() => setConfirmDelete(true)} aria-label="Delete"><Trash2 size={13} /></button>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return <div style={styles.empty}>{text}</div>;
}

function TypeToggle({ type, setType }) {
  return (
    <div style={styles.typeToggle}>
      <button type="button" onClick={() => setType("expense")} style={{ ...styles.typeBtn, ...(type === "expense" ? styles.typeBtnExpenseActive : {}) }}>Expense</button>
      <button type="button" onClick={() => setType("income")} style={{ ...styles.typeBtn, ...(type === "income" ? styles.typeBtnIncomeActive : {}) }}>Income</button>
      <button type="button" onClick={() => setType("savings")} style={{ ...styles.typeBtn, ...(type === "savings" ? styles.typeBtnSavingsActive : {}) }}>Savings</button>
    </div>
  );
}

function AddTransaction({ categories, onAdd, onAddCategory, setTab }) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState(categories[0]?.name || "");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [showCustomCat, setShowCustomCat] = useState(false);
  const [customCatName, setCustomCatName] = useState("");
  const [customCatIcon, setCustomCatIcon] = useState("🏷️");
  const [confirmMsg, setConfirmMsg] = useState("");
  const isLent = category === "Lents";

  useEffect(() => {
    if (!category && categories.length) setCategory(categories[0].name);
  }, [categories]);

  useEffect(() => {
    if (type === "savings") setCategory("Savings");
  }, [type]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0 || !category || !date) return;
    onAdd({
      amount: Number(amount), type, category, date, notes,
      ...(isLent ? { dueDate: dueDate || "", settled: false } : {}),
    });
    setAmount("");
    setNotes("");
    setDueDate("");
    setConfirmMsg(type === "savings" ? "Added to your savings." : isLent ? "Added — you'll see it in the Lents widget until it's marked returned." : "Entry added to the ledger.");
    setTimeout(() => setConfirmMsg(""), 2800);
  };

  const handleAddCustomCategory = () => {
    if (!customCatName.trim()) return;
    const newCat = { name: customCatName.trim(), icon: customCatIcon || "🏷️", color: PALETTE[categories.length % PALETTE.length] };
    onAddCategory(newCat);
    setCategory(newCat.name);
    setCustomCatName("");
    setShowCustomCat(false);
  };

  return (
    <div style={styles.panel}>
      <div style={styles.panelTitle}>Add a transaction</div>
      <form onSubmit={handleSubmit} style={styles.form}>
        <TypeToggle type={type} setType={setType} />

        {type === "savings" && (
          <div style={styles.savingsHint}>
            <Sparkles size={13} color="#8A6D2E" />
            <span>Money you set aside adds straight to your savings total.</span>
          </div>
        )}

        <label style={styles.label}>Amount</label>
        <div style={styles.amountInputWrap}>
          <span style={styles.amountPrefix}>{CURRENCY}</span>
          <input
            type="number" min="0" step="0.01" required
            value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            style={styles.amountInput}
          />
        </div>

        <label style={styles.label}>Category</label>
        <div style={styles.catGrid}>
          {categories.map((c) => (
            <button
              type="button" key={c.name}
              onClick={() => setCategory(c.name)}
              style={{ ...styles.catChip, ...(category === c.name ? styles.catChipActive : {}) }}
            >
              <span>{c.icon}</span> {c.name}
            </button>
          ))}
          <button type="button" onClick={() => setShowCustomCat((s) => !s)} style={{ ...styles.catChip, borderStyle: "dashed" }}>
            <Plus size={13} /> Custom
          </button>
        </div>

        {showCustomCat && (
          <div style={styles.customCatRow}>
            <input value={customCatIcon} onChange={(e) => setCustomCatIcon(e.target.value)} maxLength={2} style={{ ...styles.input, width: 52, textAlign: "center" }} />
            <input value={customCatName} onChange={(e) => setCustomCatName(e.target.value)} placeholder="Category name" style={{ ...styles.input, flex: 1 }} />
            <button type="button" onClick={handleAddCustomCategory} style={styles.smallBtn}>Add</button>
          </div>
        )}

        <label style={styles.label}>Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={styles.input} />

        {isLent && (
          <>
            <div style={styles.savingsHint}>
              <HandCoins size={13} color="#7A6C4F" />
              <span>Money lent out. Add when you expect it back — it'll show as outstanding until you mark it returned.</span>
            </div>
            <label style={styles.label}>Expected return date (optional)</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={styles.input} />
          </>
        )}

        <label style={styles.label}>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was this for?" rows={2} style={{ ...styles.input, resize: "vertical" }} />

        <button type="submit" style={styles.primaryBtn}>Add entry</button>
        {confirmMsg && <div style={styles.confirmMsg}>{confirmMsg}</div>}
      </form>
    </div>
  );
}

function History({ transactions, categories, onUpdate, onDelete, onAddCategory }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [editing, setEditing] = useState(null);

  const months = useMemo(() => {
    const set = new Set();
    transactions.forEach((t) => t.date && set.add(t.date.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [transactions]);

  const catMap = useMemo(() => {
    const m = {};
    categories.forEach((c) => (m[c.name] = c));
    return m;
  }, [categories]);

  const filtered = useMemo(() => {
    return transactions
      .filter((t) => (catFilter === "all" ? true : t.category === catFilter))
      .filter((t) => (monthFilter === "all" ? true : (t.date || "").slice(0, 7) === monthFilter))
      .filter((t) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (t.notes || "").toLowerCase().includes(q) || (t.category || "").toLowerCase().includes(q);
      })
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [transactions, search, catFilter, monthFilter]);

  return (
    <div style={styles.panel}>
      <div style={styles.panelTitle}>Transaction history</div>
      <div style={styles.filterRow}>
        <div style={styles.searchWrap}>
          <Search size={14} color="#8A8477" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes or category" style={styles.searchInput} />
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={styles.select}>
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
        </select>
        <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} style={styles.select}>
          <option value="all">All months</option>
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState text="No transactions match. Adjust the search or filters." />
      ) : (
        <div>
          {filtered.map((t) => (
            <LedgerRow
              key={t.id} t={t} cat={catMap[t.category]}
              onEdit={() => setEditing(t)}
              onDelete={() => onDelete(t.id)}
            />
          ))}
        </div>
      )}

      {editing && (
        <EditModal
          tx={editing}
          categories={categories}
          onAddCategory={onAddCategory}
          onClose={() => setEditing(null)}
          onSave={(tx) => { onUpdate(editing.id, tx); setEditing(null); }}
        />
      )}
    </div>
  );
}

function EditModal({ tx, categories, onAddCategory, onClose, onSave }) {
  const [amount, setAmount] = useState(tx.amount);
  const [type, setType] = useState(tx.type);
  const [category, setCategory] = useState(tx.category);
  const [date, setDate] = useState(tx.date);
  const [notes, setNotes] = useState(tx.notes || "");
  const [dueDate, setDueDate] = useState(tx.dueDate || "");
  const [settled, setSettled] = useState(!!tx.settled);
  const isLent = category === "Lents";

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <span style={styles.panelTitle}>Edit entry</span>
          <button style={styles.iconBtn} onClick={onClose}><X size={16} /></button>
        </div>
        <TypeToggle type={type} setType={setType} />
        <label style={styles.label}>Amount</label>
        <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} style={styles.input} />
        <label style={styles.label}>Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={styles.select}>
          {categories.map((c) => <option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
        </select>
        <label style={styles.label}>Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={styles.input} />

        {isLent && (
          <>
            <label style={styles.label}>Expected return date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={styles.input} />
            <label style={{ ...styles.label, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={settled} onChange={(e) => setSettled(e.target.checked)} style={{ width: 14, height: 14 }} />
              Returned / settled
            </label>
          </>
        )}

        <label style={styles.label}>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...styles.input, resize: "vertical" }} />
        <button
          style={styles.primaryBtn}
          onClick={() => onSave({
            amount: Number(amount), type, category, date, notes,
            ...(isLent ? { dueDate, settled } : {}),
          })}
        >
          Save changes
        </button>
      </div>
    </div>
  );
}

function CalendarView({ transactions, categories }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const catMap = useMemo(() => {
    const m = {};
    categories.forEach((c) => (m[c.name] = c));
    return m;
  }, [categories]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const dayData = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      if (!t.date || t.date.slice(0, 7) !== monthKey) return;
      if (!map[t.date]) map[t.date] = { expense: 0, income: 0, count: 0 };
      if (t.type === "expense") map[t.date].expense += Number(t.amount) || 0;
      else if (t.type === "income") map[t.date].income += Number(t.amount) || 0;
      map[t.date].count += 1;
    });
    return map;
  }, [transactions, monthKey]);

  const monthTotals = useMemo(() => {
    return Object.values(dayData).reduce(
      (acc, d) => ({ expense: acc.expense + d.expense, income: acc.income + d.income }),
      { expense: 0, income: 0 }
    );
  }, [dayData]);

  const maxDaySpend = useMemo(() => Math.max(1, ...Object.values(dayData).map((d) => d.expense)), [dayData]);

  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const goPrev = () => { setViewDate(new Date(year, month - 1, 1)); setSelectedDate(null); };
  const goNext = () => { setViewDate(new Date(year, month + 1, 1)); setSelectedDate(null); };
  const goToday = () => { setViewDate(new Date()); setSelectedDate(null); };

  const selectedTx = useMemo(
    () => (selectedDate ? transactions.filter((t) => t.date === selectedDate).sort((a, b) => (b.id > a.id ? 1 : -1)) : []),
    [transactions, selectedDate]
  );

  const isCurrentMonth = monthKey === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const todayStr = todayISO();

  return (
    <div>
      <div style={styles.panel}>
        <div style={styles.calNavRow}>
          <button style={styles.iconBtn} onClick={goPrev} aria-label="Previous month"><ChevronLeft size={16} /></button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
              <CalendarIcon size={15} />{MONTHS[month]} {year}
            </div>
            {!isCurrentMonth && (
              <button onClick={goToday} style={styles.todayLink}>Jump to today</button>
            )}
          </div>
          <button style={styles.iconBtn} onClick={goNext} aria-label="Next month"><ChevronRight size={16} /></button>
        </div>

        <div style={styles.statGrid}>
          <StatCard label="Spent this month" value={monthTotals.expense} icon={<TrendingDown size={16} />} tone="expense" />
          <StatCard label="Received this month" value={monthTotals.income} icon={<TrendingUp size={16} />} tone="income" />
        </div>

        <div style={styles.calWeekRow}>
          {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => <div key={d} style={styles.calWeekLabel}>{d}</div>)}
        </div>
        <div style={styles.calGrid}>
          {cells.map((d, i) => {
            if (d === null) return <div key={`empty-${i}`} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const info = dayData[dateStr];
            const intensity = info && info.expense > 0 ? Math.min(1, info.expense / maxDaySpend) : 0;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                style={{
                  ...styles.calCell,
                  ...(isToday ? styles.calCellToday : {}),
                  ...(isSelected ? styles.calCellSelected : {}),
                  background: isSelected ? "#1F2D3D" : intensity > 0 ? `rgba(162,62,62,${0.12 + intensity * 0.55})` : "#FFFEF9",
                }}
              >
                <span style={{ ...styles.calDayNum, color: isSelected ? "#F6F3EA" : "#1F2D3D" }}>{d}</span>
                {info && info.expense > 0 && (
                  <span style={{ ...styles.calDayAmt, color: isSelected ? "#F6F3EA" : intensity > 0.5 ? "#FCEBEB" : "#A23E3E" }}>
                    {info.expense >= 1000 ? `${(info.expense / 1000).toFixed(1)}k` : Math.round(info.expense)}
                  </span>
                )}
                {info && info.income > 0 && !info.expense && (
                  <span style={{ ...styles.calDayAmt, color: isSelected ? "#F6F3EA" : "#3B5D4E" }}>+</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div style={styles.panel}>
          <div style={styles.panelTitle}>{selectedDate}</div>
          {selectedTx.length === 0 ? (
            <EmptyState text="No transactions on this day." />
          ) : (
            selectedTx.map((t) => <LedgerRow key={t.id} t={t} cat={catMap[t.category]} />)
          )}
        </div>
      )}
    </div>
  );
}


function Reports({ transactions, categories }) {
  const monthly = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      if (!t.date) return;
      const key = t.date.slice(0, 7);
      if (!map[key]) map[key] = { month: key, income: 0, expense: 0, savings: 0 };
      if (t.type === "income") map[key].income += Number(t.amount) || 0;
      else if (t.type === "savings") map[key].savings += Number(t.amount) || 0;
      else map[key].expense += Number(t.amount) || 0;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [transactions]);

  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = monthly.find((m) => m.month === thisMonthKey) || { income: 0, expense: 0, savings: 0 };
  const thisMonthNet = thisMonth.income - thisMonth.expense - thisMonth.savings;

  const downloadCSV = () => {
    const rows = [["Date", "Type", "Category", "Amount", "Notes"]];
    transactions.forEach((t) => rows.push([t.date, t.type, t.category, t.amount, (t.notes || "").replace(/,/g, ";")]));
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={styles.panel}>
        <div style={styles.panelTitle}>This month: income vs. expenses</div>
        <div style={styles.statGrid}>
          <StatCard label="Income" value={thisMonth.income} icon={<TrendingUp size={16} />} tone="income" />
          <StatCard label="Expenses" value={thisMonth.expense} icon={<TrendingDown size={16} />} tone="expense" />
          <StatCard label="Savings" value={thisMonth.savings} icon={<PiggyBank size={16} />} tone="brass" />
        </div>
        <div style={{ ...styles.statCard, marginTop: 12 }}>
          <div style={styles.statTop}>
            <span style={styles.statLabel}>Net for {MONTHS[now.getMonth()]}</span>
            <span style={{ color: thisMonthNet >= 0 ? "#3B5D4E" : "#A23E3E" }}>{thisMonthNet >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}</span>
          </div>
          <div style={{ ...styles.statValue, color: thisMonthNet >= 0 ? "#3B5D4E" : "#A23E3E" }}>{fmt(thisMonthNet)}</div>
        </div>
      </div>

      <div style={styles.panel}>
        <div style={styles.panelTitle}>Income vs. expenses by month</div>
        {monthly.length === 0 ? (
          <EmptyState text="No data yet to summarize." />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthly} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#C9C0AC" vertical={false} />
              <XAxis dataKey="month" tick={{ fontFamily: "IBM Plex Sans", fontSize: 11, fill: "#4A5A68" }} axisLine={{ stroke: "#C9C0AC" }} tickLine={false} />
              <YAxis tick={{ fontFamily: "IBM Plex Mono", fontSize: 11, fill: "#4A5A68" }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => CURRENCY + v} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ fontFamily: "IBM Plex Sans", borderRadius: 6, border: "1px solid #C9C0AC" }} />
              <Legend wrapperStyle={{ fontFamily: "IBM Plex Sans", fontSize: 12 }} />
              <Bar dataKey="income" fill="#3B5D4E" radius={[3, 3, 0, 0]} name="Income" />
              <Bar dataKey="expense" fill="#A23E3E" radius={[3, 3, 0, 0]} name="Expenses" />
              <Bar dataKey="savings" fill="#8A6D2E" radius={[3, 3, 0, 0]} name="Savings" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={styles.panel}>
        <div style={styles.panelTitle}>Export</div>
        <p style={{ fontSize: 13, color: "#4A5A68", margin: "0 0 12px" }}>
          Download every transaction as a CSV file, which opens directly in Excel or Google Sheets. PDF export isn't available in this environment.
        </p>
        <button style={styles.primaryBtn} onClick={downloadCSV}>
          <Download size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
          Download CSV
        </button>
      </div>
    </div>
  );
}

function BudgetPlanner({ budgetItems, categories, onAdd, onUpdate, onDelete, plannedIncome, plannedExpense, plannedSavings, onResetAll }) {
  const [name, setName] = useState("Estimated Salary");
  const [amount, setAmount] = useState("");
  const [itemType, setItemType] = useState("expense");
  const [category, setCategory] = useState(categories[0]?.name || "");
  const [editingId, setEditingId] = useState(null);
  const [resetConfirm, setResetConfirm] = useState(false);

  const incomeItems = budgetItems.filter((b) => b.type === "income");
  const expenseItems = budgetItems.filter((b) => b.type === "expense");
  const savingsItems = budgetItems.filter((b) => b.type === "savings");
  // Planned savings are deducted as an expense too, so net for next month accounts for both.
  const netForNextMonth = plannedIncome - plannedExpense - plannedSavings;

  const resetForm = () => {
    setName("Estimated Salary");
    setAmount("");
    setItemType("expense");
    setCategory(categories[0]?.name || "");
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    if (itemType === "income") {
      if (!name.trim()) return;
      const item = { name: name.trim(), amount: Number(amount), type: "income" };
      if (editingId) onUpdate(editingId, item);
      else onAdd(item);
    } else if (itemType === "savings") {
      const item = { name: name.trim() || "Savings", amount: Number(amount), type: "savings" };
      if (editingId) onUpdate(editingId, item);
      else onAdd(item);
    } else {
      if (!category) return;
      const item = { name: category, amount: Number(amount), type: "expense" };
      if (editingId) onUpdate(editingId, item);
      else onAdd(item);
    }
    resetForm();
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setItemType(item.type);
    setAmount(item.amount);
    if (item.type === "expense") setCategory(item.name);
    else setName(item.name);
  };

  const handleResetClick = () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      return;
    }
    onResetAll();
    setResetConfirm(false);
  };

  return (
    <div>
      <div style={styles.panel}>
        <div style={styles.panelTitle}>Budget Plan For Next Month</div>
        <p style={{ fontSize: 13, color: "#4A5A68", margin: "-6px 0 14px" }}>
          Lay out what you expect to earn and spend for {nextMonthLabel()}.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.typeToggle}>
            <button type="button" onClick={() => setItemType("expense")} style={{ ...styles.typeBtn, ...(itemType === "expense" ? styles.typeBtnExpenseActive : {}) }}>Expense</button>
            <button type="button" onClick={() => setItemType("income")} style={{ ...styles.typeBtn, ...(itemType === "income" ? styles.typeBtnIncomeActive : {}) }}>Income</button>
            <button type="button" onClick={() => { setItemType("savings"); setName((n) => (n === "Estimated Salary" ? "Savings" : n)); }} style={{ ...styles.typeBtn, ...(itemType === "savings" ? styles.typeBtnSavingsActive : {}) }}>Savings</button>
          </div>

          {itemType === "income" && (
            <>
              <label style={styles.label}>Estimated Salary</label>
              <input
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Estimated Salary"
                style={styles.input}
              />
            </>
          )}

          {itemType === "savings" && (
            <>
              <label style={styles.label}>Savings goal</label>
              <input
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Savings"
                style={styles.input}
              />
            </>
          )}

          {itemType === "expense" && (
            <>
              <label style={styles.label}>Category</label>
              <div style={styles.catGrid}>
                {categories.map((c) => (
                  <button
                    type="button" key={c.name}
                    onClick={() => setCategory(c.name)}
                    style={{ ...styles.catChip, ...(category === c.name ? styles.catChipActive : {}) }}
                  >
                    <span>{c.icon}</span> {c.name}
                  </button>
                ))}
              </div>
            </>
          )}

          <label style={styles.label}>Amount</label>
          <div style={styles.amountInputWrap}>
            <span style={styles.amountPrefix}>{CURRENCY}</span>
            <input
              type="number" min="0" step="0.01"
              value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              style={styles.amountInput}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button type="submit" style={{ ...styles.primaryBtn, marginTop: 0, flex: 1 }}>
              {editingId ? "Save item" : "Add to plan"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} style={{ ...styles.smallBtn, background: "transparent", color: "#4A5A68", border: "1px solid #C9C0AC" }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div style={styles.panel}>
        <div style={styles.panelTitle}>Projected for Next Month</div>
        <div style={styles.statGrid}>
          <StatCard label="Planned income" value={plannedIncome} icon={<TrendingUp size={16} />} tone="income" />
          <StatCard label="Planned expenses" value={plannedExpense} icon={<TrendingDown size={16} />} tone="expense" />
          <StatCard label="Savings" value={plannedSavings} icon={<PiggyBank size={16} />} tone="brass" />
        </div>
        <div style={{ ...styles.statCard, marginTop: 12 }}>
          <div style={styles.statTop}>
            <span style={styles.statLabel}>Net for next month</span>
            <span style={{ color: netForNextMonth >= 0 ? "#3B5D4E" : "#A23E3E" }}>{netForNextMonth >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}</span>
          </div>
          <div style={{ ...styles.statValue, color: netForNextMonth >= 0 ? "#3B5D4E" : "#A23E3E" }}>{fmt(netForNextMonth)}</div>
        </div>

        {incomeItems.length > 0 && (
          <div style={{ marginTop: 14 }}>
            {incomeItems.map((b) => (
              <BudgetRow key={b.id} item={b} onEdit={() => startEdit(b)} onDelete={() => onDelete(b.id)} />
            ))}
          </div>
        )}

        {savingsItems.length > 0 && (
          <div style={{ marginTop: 6 }}>
            {savingsItems.map((b) => (
              <BudgetRow key={b.id} item={b} onEdit={() => startEdit(b)} onDelete={() => onDelete(b.id)} />
            ))}
          </div>
        )}
      </div>

      <div style={styles.panel}>
        <div style={styles.panelTitle}>Planned expenses</div>
        {expenseItems.length === 0 ? (
          <EmptyState text="No expense items yet — choose a category above and add what you expect to spend." />
        ) : (
          expenseItems.map((b) => <BudgetRow key={b.id} item={b} onEdit={() => startEdit(b)} onDelete={() => onDelete(b.id)} />)
        )}
      </div>

      <div style={{ ...styles.panel, borderColor: resetConfirm ? "#A23E3E" : "#C9C0AC" }}>
        <div style={styles.panelTitle}>Reset</div>
        {resetConfirm ? (
          <>
            <p style={{ fontSize: 13, color: "#A23E3E", margin: "-6px 0 12px" }}>
              Are you sure? This will permanently erase all transactions, categories, and budget items.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={handleResetClick}
                style={{ ...styles.primaryBtn, marginTop: 0, flex: 1, background: "#A23E3E" }}
              >
                Yes, reset everything
              </button>
              <button
                type="button"
                onClick={() => setResetConfirm(false)}
                style={{ ...styles.smallBtn, background: "transparent", color: "#4A5A68", border: "1px solid #C9C0AC" }}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "#4A5A68", margin: "-6px 0 12px" }}>
              Wipe all transactions, categories, and budget plans and start fresh.
            </p>
            <button
              type="button"
              onClick={handleResetClick}
              style={{ ...styles.primaryBtn, marginTop: 0, background: "#A23E3E" }}
            >
              Reset all data
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function BudgetRow({ item, onEdit, onDelete }) {
  const isIncome = item.type === "income";
  const isSavings = item.type === "savings";
  const icon = isIncome ? "💵" : isSavings ? "🐷" : "🧾";
  const color = isIncome ? "#3B5D4E" : isSavings ? "#8A6D2E" : "#A23E3E";
  return (
    <div style={styles.ledgerRow}>
      <div style={styles.ledgerLeft}>
        <span style={styles.ledgerIcon}>{icon}</span>
        <div>
          <div style={styles.ledgerDesc}>{item.name}</div>
        </div>
      </div>
      <div style={styles.ledgerDots} />
      <div style={styles.ledgerRight}>
        <span style={{ ...styles.ledgerAmount, color }}>
          {fmt(item.amount)}
        </span>
        <div style={styles.rowActions}>
          <button style={styles.iconBtn} onClick={onEdit} aria-label="Edit"><Pencil size={13} /></button>
          <button style={styles.iconBtn} onClick={onDelete} aria-label="Delete"><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  app: {
    fontFamily: "'IBM Plex Sans', sans-serif",
    background: "#EDE8DC",
    minHeight: "100vh",
    padding: "24px 16px",
    color: "#1F2D3D",
  },
  shell: { maxWidth: 720, margin: "0 auto" },
  header: {
    background: "#F6F3EA",
    border: "1px solid #C9C0AC",
    borderRadius: 12,
    padding: "18px 20px",
    marginBottom: 16,
  },
  brandRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  brandMark: {
    width: 40, height: 40, borderRadius: "50%", border: "1.5px solid #1F2D3D",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, flexShrink: 0,
  },
  brandTitle: { fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, letterSpacing: "0.01em" },
  brandSub: { fontSize: 12.5, color: "#6B6559", fontStyle: "italic", marginTop: 2 },
  navRow: { display: "flex", gap: 6, flexWrap: "wrap" },
  navBtn: {
    background: "transparent", border: "1px solid transparent", borderRadius: 8,
    padding: "7px 12px", fontSize: 13.5, color: "#4A5A68", fontWeight: 500,
  },
  navBtnActive: { background: "#1F2D3D", color: "#F6F3EA", borderColor: "#1F2D3D" },
  content: {},
  errorBanner: {
    background: "#FCEBEB", color: "#791F1F", border: "1px solid #E24B4A",
    borderRadius: 8, padding: "8px 14px", fontSize: 13, marginBottom: 12,
  },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 16 },
  statCard: {
    background: "#F6F3EA", border: "1px solid #C9C0AC", borderRadius: 12,
    padding: "14px 16px",
  },
  statTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  statLabel: { fontSize: 12.5, color: "#6B6559", textTransform: "uppercase", letterSpacing: "0.04em" },
  statValue: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 600 },
  panel: {
    background: "#F6F3EA", border: "1px solid #C9C0AC", borderRadius: 12,
    padding: "18px 20px", marginBottom: 16,
  },
  panelTitleRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  panelTitle: { fontFamily: "'Fraunces', serif", fontSize: 16.5, fontWeight: 600, marginBottom: 14, display: "block" },
  budgetBarTrack: { height: 10, borderRadius: 6, background: "#E2DCCB", overflow: "hidden", border: "1px solid #C9C0AC" },
  budgetBarFill: { height: "100%", borderRadius: 6, transition: "width 0.3s ease" },
  budgetStripFoot: { display: "flex", justifyContent: "space-between", marginTop: 8 },
  warnRow: { display: "flex", alignItems: "center", gap: 6, marginTop: 10 },
  savingsHint: {
    display: "flex", alignItems: "center", gap: 6, background: "#F4EFE0",
    border: "1px solid #DCC98E", borderRadius: 8, padding: "8px 10px",
    fontSize: 12.5, color: "#6B5A22", marginBottom: 4,
  },
  ledgerRow: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "11px 0", borderBottom: "1px dashed #C9C0AC",
  },
  ledgerLeft: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
  ledgerIcon: { fontSize: 18, flexShrink: 0 },
  ledgerDesc: { fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 },
  ledgerMeta: { fontSize: 12, color: "#6B6559", marginTop: 1 },
  ledgerDots: { flex: 1 },
  ledgerRight: { display: "flex", alignItems: "center", gap: 10, flexShrink: 0 },
  ledgerAmount: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 14.5, fontWeight: 600 },
  rowActions: { display: "flex", gap: 4 },
  iconBtn: {
    background: "transparent", border: "1px solid #C9C0AC", borderRadius: 6,
    padding: "4px 6px", color: "#4A5A68", display: "flex", alignItems: "center",
  },
  empty: { fontSize: 13.5, color: "#6B6559", fontStyle: "italic", padding: "16px 0", textAlign: "center" },
  form: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 12.5, color: "#6B6559", fontWeight: 500, marginTop: 10, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" },
  input: {
    width: "100%", border: "1px solid #C9C0AC", borderRadius: 8, padding: "9px 11px",
    fontSize: 14, background: "#FFFEF9", color: "#1F2D3D",
  },
  select: {
    border: "1px solid #C9C0AC", borderRadius: 8, padding: "9px 11px",
    fontSize: 13.5, background: "#FFFEF9", color: "#1F2D3D",
  },
  amountInputWrap: { display: "flex", alignItems: "center", border: "1px solid #C9C0AC", borderRadius: 8, background: "#FFFEF9", overflow: "hidden" },
  amountPrefix: { padding: "9px 4px 9px 12px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, color: "#6B6559" },
  amountInput: { border: "none", flex: 1, padding: "9px 11px 9px 2px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 18, fontWeight: 600, background: "transparent", outline: "none" },
  typeToggle: { display: "flex", gap: 8, marginBottom: 6 },
  typeBtn: { flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid #C9C0AC", background: "#FFFEF9", fontSize: 13.5, fontWeight: 500, color: "#4A5A68" },
  typeBtnExpenseActive: { background: "#A23E3E", color: "#FCEBEB", borderColor: "#A23E3E" },
  typeBtnIncomeActive: { background: "#3B5D4E", color: "#EAF3DE", borderColor: "#3B5D4E" },
  typeBtnSavingsActive: { background: "#8A6D2E", color: "#FBF3DE", borderColor: "#8A6D2E" },
  catGrid: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 2 },
  catChip: {
    display: "flex", alignItems: "center", gap: 6, border: "1px solid #C9C0AC", borderRadius: 20,
    padding: "6px 12px", fontSize: 13, background: "#FFFEF9", color: "#4A5A68",
  },
  catChipActive: { background: "#1F2D3D", color: "#F6F3EA", borderColor: "#1F2D3D" },
  customCatRow: { display: "flex", gap: 8, marginTop: 8, alignItems: "center" },
  smallBtn: { border: "1px solid #1F2D3D", background: "#1F2D3D", color: "#F6F3EA", borderRadius: 8, padding: "8px 14px", fontSize: 13 },
  primaryBtn: {
    marginTop: 16, background: "#1F2D3D", color: "#F6F3EA", border: "none",
    borderRadius: 8, padding: "11px 0", fontSize: 14.5, fontWeight: 600,
  },
  confirmMsg: { marginTop: 10, fontSize: 13, color: "#3B5D4E", fontStyle: "italic" },
  filterRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 },
  searchWrap: { display: "flex", alignItems: "center", gap: 6, border: "1px solid #C9C0AC", borderRadius: 8, padding: "0 10px", background: "#FFFEF9", flex: "1 1 160px" },
  searchInput: { border: "none", background: "transparent", padding: "9px 0", fontSize: 13.5, outline: "none", width: "100%" },
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(31,45,61,0.45)", display: "flex",
    alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
  },
  modalCard: {
    background: "#F6F3EA", border: "1px solid #C9C0AC", borderRadius: 12,
    padding: 20, width: "100%", maxWidth: 380, maxHeight: "90vh", overflowY: "auto",
  },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  calNavRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  todayLink: { border: "none", background: "transparent", color: "#5A7D8C", fontSize: 11.5, textDecoration: "underline", padding: 0, marginTop: 2 },
  calWeekRow: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 },
  calWeekLabel: { textAlign: "center", fontSize: 11, color: "#8A8477", fontWeight: 600, textTransform: "uppercase" },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 },
  calCell: {
    aspectRatio: "1", border: "1px solid #C9C0AC", borderRadius: 8, background: "#FFFEF9",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 2, padding: 2, minHeight: 44,
  },
  calCellToday: { borderColor: "#1F2D3D", borderWidth: 1.5 },
  calCellSelected: { borderColor: "#1F2D3D" },
  calDayNum: { fontSize: 12.5, fontWeight: 600 },
  calDayAmt: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, fontWeight: 600 },
  catBreakdownRow: { display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px dashed #C9C0AC" },
  catBreakdownBar: { flex: 1, height: 6, borderRadius: 4, background: "#E2DCCB", overflow: "hidden" },
  catBreakdownFill: { height: "100%", borderRadius: 4 },
};
