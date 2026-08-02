"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Transaction = {
  id: number;
  reference: string;
  date: string;
  description: string;
  department: string;
  type: "Receipt" | "Payment";
  method: string;
  amount: number;
  status: "Cleared" | "Pending" | "Flagged";
};

type Approval = {
  id: number;
  request: string;
  department: string;
  requester: string;
  amount: number;
  age: string;
};

const demoTransactions: Transaction[] = [
  { id: 1, reference: "RC-240801", date: "2026-08-02", description: "Patient counter collections", department: "Outpatient", type: "Receipt", method: "Cash", amount: 382450, status: "Cleared" },
  { id: 2, reference: "RC-240802", date: "2026-08-02", description: "Insurance remittance — Jubilee", department: "Insurance", type: "Receipt", method: "Bank", amount: 714200, status: "Cleared" },
  { id: 3, reference: "PV-240319", date: "2026-08-02", description: "Emergency medicines restock", department: "Pharmacy", type: "Payment", method: "Bank", amount: 246800, status: "Pending" },
  { id: 4, reference: "PV-240318", date: "2026-08-01", description: "CT scanner preventive maintenance", department: "Radiology", type: "Payment", method: "Cheque", amount: 185000, status: "Flagged" },
  { id: 5, reference: "RC-240799", date: "2026-08-01", description: "Inpatient discharge settlements", department: "Inpatient", type: "Receipt", method: "Card", amount: 493600, status: "Cleared" },
  { id: 6, reference: "PV-240316", date: "2026-08-01", description: "Oxygen cylinder supply", department: "ICU", type: "Payment", method: "Bank", amount: 128400, status: "Cleared" },
];

const demoApprovals: Approval[] = [
  { id: 1, request: "Dialysis consumables", department: "Nephrology", requester: "Dr. Nadia Khan", amount: 284000, age: "18 min" },
  { id: 2, request: "Generator fuel advance", department: "Facilities", requester: "Ahsan Malik", amount: 165000, age: "46 min" },
  { id: 3, request: "Surgical implant payment", department: "Operating Theatre", requester: "Dr. Faraz Ali", amount: 438500, age: "2 hr" },
];

const money = (value: number) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(value).replace("PKR", "Rs");

const compactMoney = (value: number) => {
  if (value >= 1_000_000) return `Rs ${(value / 1_000_000).toFixed(2)}m`;
  return `Rs ${(value / 1_000).toFixed(0)}k`;
};

const navItems = ["Overview", "Transactions", "Reconciliation", "Approvals", "Reports"];

export default function Home() {
  const [active, setActive] = useState("Overview");
  const [transactions, setTransactions] = useState<Transaction[]>(demoTransactions);
  const [approvals, setApprovals] = useState<Approval[]>(demoApprovals);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All types");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/finance")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (data.transactions?.length) setTransactions(data.transactions);
        if (data.approvals?.length) setApprovals(data.approvals);
      })
      .catch(() => undefined);
  }, []);

  const filtered = useMemo(() => transactions.filter((item) => {
    const haystack = `${item.reference} ${item.description} ${item.department}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) &&
      (typeFilter === "All types" || item.type === typeFilter) &&
      (statusFilter === "All statuses" || item.status === statusFilter);
  }), [transactions, search, typeFilter, statusFilter]);

  const totalBalance = 4_820_000;
  const todayInflow = transactions.filter((t) => t.type === "Receipt" && t.date === "2026-08-02").reduce((s, t) => s + t.amount, 0);
  const todayOutflow = transactions.filter((t) => t.type === "Payment" && t.date === "2026-08-02").reduce((s, t) => s + t.amount, 0);

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  async function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      description: String(form.get("description") || ""),
      department: String(form.get("department") || ""),
      type: String(form.get("type") || "Receipt"),
      method: String(form.get("method") || "Cash"),
      amount: Number(form.get("amount") || 0),
    };
    const optimistic: Transaction = {
      id: Date.now(), reference: `${payload.type === "Receipt" ? "RC" : "PV"}-${String(Date.now()).slice(-6)}`,
      date: "2026-08-02", description: payload.description, department: payload.department,
      type: payload.type as Transaction["type"], method: payload.method, amount: payload.amount, status: "Pending",
    };
    setTransactions((items) => [optimistic, ...items]);
    setModalOpen(false);
    flash("Transaction recorded successfully");
    try {
      const response = await fetch("/api/finance", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (response.ok) {
        const { transaction } = await response.json();
        setTransactions((items) => items.map((item) => item.id === optimistic.id ? transaction : item));
      }
    } catch { /* The optimistic record remains visible if the preview database is unavailable. */ }
  }

  async function approve(id: number) {
    setApprovals((items) => items.filter((item) => item.id !== id));
    flash("Payment approved and sent to treasury");
    try { await fetch("/api/finance", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) }); } catch { }
  }

  function exportLedger() {
    const rows = [["Reference", "Date", "Description", "Department", "Type", "Method", "Amount", "Status"], ...filtered.map((t) => [t.reference, t.date, t.description, t.department, t.type, t.method, String(t.amount), t.status])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "hospital-cash-ledger.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    flash("Ledger exported as CSV");
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand"><span className="brand-mark">H+</span><span><strong>Horizon</strong><small>Hospital Finance</small></span></div>
        <nav aria-label="Main navigation">
          <p className="nav-label">Workspace</p>
          {navItems.map((item) => <button key={item} className={active === item ? "active" : ""} onClick={() => { setActive(item); setMenuOpen(false); }}><span>{item === "Overview" ? "⌂" : item === "Transactions" ? "↔" : item === "Reconciliation" ? "✓" : item === "Approvals" ? "◷" : "▥"}</span>{item}{item === "Approvals" && approvals.length > 0 && <b>{approvals.length}</b>}</button>)}
        </nav>
        <div className="sidebar-card"><span className="pulse-dot"/><p>Bank sync is healthy</p><small>Last checked 4 minutes ago</small></div>
        <div className="user-card"><span className="avatar">SA</span><span><strong>Sarah Ahmed</strong><small>Finance Manager</small></span><button aria-label="Account options">•••</button></div>
      </aside>

      <section className="content">
        <header className="topbar">
          <button className="menu-button" aria-label="Toggle menu" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
          <div><p>Finance workspace</p><strong>Sunday, 2 August 2026</strong></div>
          <div className="top-actions"><button className="icon-button" aria-label="Notifications">♢<span /></button><button className="secondary-button" onClick={exportLedger}>⇩ Export</button><button className="primary-button" onClick={() => setModalOpen(true)}>＋ New transaction</button></div>
        </header>

        <div className="page">
          <div className="page-heading"><div><span className="eyebrow">CASH COMMAND CENTER</span><h1>{active === "Overview" ? "Good morning, Sarah" : active}</h1><p>{active === "Overview" ? "Here’s your hospital’s cash position and what needs attention today." : `Review and manage hospital ${active.toLowerCase()} from one workspace.`}</p></div><div className="live-chip"><span className="pulse-dot"/>Live data</div></div>

          {active === "Overview" && <>
            <section className="metric-grid" aria-label="Cash summary">
              <article className="metric-card featured"><div className="metric-top"><span>Available cash</span><i>All accounts</i></div><strong>{compactMoney(totalBalance)}</strong><div className="metric-foot"><span className="up">↑ 8.4%</span><small>vs. last month</small><div className="mini-bars"><i/><i/><i/><i/><i/><i/></div></div></article>
              <article className="metric-card"><div className="metric-icon green">↙</div><span>Today’s inflow</span><strong>{compactMoney(todayInflow || 1_240_000)}</strong><small>Patient + insurance receipts</small><div className="progress"><i style={{ width: "78%" }}/></div></article>
              <article className="metric-card"><div className="metric-icon coral">↗</div><span>Today’s outflow</span><strong>{compactMoney(todayOutflow || 780_000)}</strong><small>Payments and operating costs</small><div className="progress coral"><i style={{ width: "54%" }}/></div></article>
              <article className="metric-card"><div className="metric-icon amber">⌁</div><span>Receivables</span><strong>Rs 12.6m</strong><small><b>Rs 2.1m</b> overdue 30+ days</small><div className="progress amber"><i style={{ width: "67%" }}/></div></article>
            </section>

            <section className="overview-grid">
              <article className="panel cash-flow"><div className="panel-head"><div><h2>Cash flow</h2><p>Collections and payments across the last 7 days</p></div><select aria-label="Cash flow period"><option>Last 7 days</option><option>Last 30 days</option></select></div>
                <div className="chart-legend"><span><i className="green-dot"/>Inflow <strong>Rs 6.82m</strong></span><span><i className="blue-dot"/>Outflow <strong>Rs 4.31m</strong></span></div>
                <div className="chart"><div className="y-labels"><span>1.5m</span><span>1.0m</span><span>500k</span><span>0</span></div><div className="bars">{[[64,38],[78,48],[56,32],[88,58],[70,44],[96,61],[81,50]].map((pair, i) => <div className="bar-day" key={i}><div className="bar-pair"><i className="in" style={{height:`${pair[0]}%`}}/><i className="out" style={{height:`${pair[1]}%`}}/></div><span>{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}</span></div>)}</div></div>
              </article>
              <article className="panel attention"><div className="panel-head"><div><h2>Needs attention</h2><p>Items requiring your review</p></div><span className="count-chip">{approvals.length + 2}</span></div>
                <button onClick={() => setActive("Approvals")}><span className="attention-icon amber">◷</span><span><strong>{approvals.length} payments awaiting approval</strong><small>Highest request: Rs 438,500</small></span><b>›</b></button>
                <button onClick={() => setActive("Reconciliation")}><span className="attention-icon coral">!</span><span><strong>2 unmatched bank entries</strong><small>Total variance: Rs 86,400</small></span><b>›</b></button>
                <button onClick={() => setActive("Transactions")}><span className="attention-icon blue">⌁</span><span><strong>7 insurance claims overdue</strong><small>Outstanding: Rs 2.1m</small></span><b>›</b></button>
                <button className="review-all" onClick={() => setActive("Approvals")}>Review all items →</button>
              </article>
            </section>

            <section className="panel department-panel"><div className="panel-head"><div><h2>Department cash position</h2><p>Today’s movement by hospital unit</p></div><button className="text-button" onClick={() => setActive("Reports")}>View full report →</button></div><div className="department-row"><div><span className="dept-icon opd">OP</span><span><strong>Outpatient</strong><small>418 receipts</small></span></div><strong>Rs 1.42m</strong><span className="positive">+12.6%</span><div><span className="dept-icon inp">IP</span><span><strong>Inpatient</strong><small>86 discharges</small></span></div><strong>Rs 2.18m</strong><span className="positive">+6.8%</span><div><span className="dept-icon pha">RX</span><span><strong>Pharmacy</strong><small>1,204 orders</small></span></div><strong>Rs 842k</strong><span className="negative">−3.2%</span></div></section>
          </>}

          {active === "Transactions" && <section className="panel data-panel"><div className="toolbar"><label className="search-box">⌕<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reference, department, or description" /></label><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option>All types</option><option>Receipt</option><option>Payment</option></select><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option>All statuses</option><option>Cleared</option><option>Pending</option><option>Flagged</option></select></div><TransactionTable rows={filtered}/></section>}

          {active === "Approvals" && <section className="approval-grid">{approvals.length ? approvals.map((item) => <article className="approval-card" key={item.id}><div className="approval-top"><span className="dept-icon inp">{item.department.slice(0,2).toUpperCase()}</span><span className="age-chip">Waiting {item.age}</span></div><p>{item.department}</p><h2>{item.request}</h2><strong>{money(item.amount)}</strong><small>Requested by {item.requester}</small><div><button className="secondary-button" onClick={() => flash("Request returned for clarification")}>Request details</button><button className="primary-button" onClick={() => approve(item.id)}>Approve</button></div></article>) : <div className="empty-state"><span>✓</span><h2>All caught up</h2><p>There are no payments waiting for approval.</p></div>}</section>}

          {active === "Reconciliation" && <section className="panel reconcile-panel"><div className="reconcile-summary"><span className="ring">94%</span><div><h2>Bank reconciliation</h2><p>78 of 83 entries matched for August 2026</p></div><button className="primary-button" onClick={() => flash("Auto-match completed — 3 new entries matched")}>Run auto-match</button></div><div className="match-list"><div><span className="attention-icon coral">!</span><span><strong>Bank transfer — MEDSUPPLY LTD</strong><small>02 Aug · Bank statement only</small></span><b>Rs 64,800</b><button onClick={() => flash("Matching panel opened")}>Find match</button></div><div><span className="attention-icon amber">?</span><span><strong>Cheque 008831</strong><small>01 Aug · Ledger only</small></span><b>Rs 21,600</b><button onClick={() => flash("Matching panel opened")}>Find match</button></div></div></section>}

          {active === "Reports" && <section className="report-grid"><article className="panel report-hero"><span className="eyebrow">MONTH TO DATE</span><h2>Net cash improved by 18.4%</h2><p>Higher outpatient collections offset increased pharmacy and facilities spending.</p><div className="report-number"><strong>Rs 8.42m</strong><span>Net cash movement</span></div><button className="primary-button" onClick={exportLedger}>Download management report</button></article>{["Daily collection summary","Department variance","Insurance aging","Payment register"].map((name, i) => <button className="report-card" key={name} onClick={exportLedger}><span>{["▤","▥","◷","↗"][i]}</span><div><strong>{name}</strong><small>Updated today at 09:{15 + i * 8}</small></div><b>⇩</b></button>)}</section>}

          {active !== "Transactions" && active !== "Overview" && <section className="panel recent-panel"><div className="panel-head"><div><h2>Recent transactions</h2><p>Latest activity across hospital accounts</p></div><button className="text-button" onClick={() => setActive("Transactions")}>View ledger →</button></div><TransactionTable rows={transactions.slice(0,4)}/></section>}
        </div>
      </section>

      {modalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.currentTarget === e.target) setModalOpen(false); }}><form className="modal" onSubmit={addTransaction}><div className="modal-head"><div><span className="eyebrow">NEW ENTRY</span><h2>Record transaction</h2></div><button type="button" aria-label="Close" onClick={() => setModalOpen(false)}>×</button></div><label>Description<input name="description" required placeholder="e.g. Lab counter collections" autoFocus /></label><div className="form-row"><label>Department<select name="department"><option>Outpatient</option><option>Inpatient</option><option>Emergency</option><option>Pharmacy</option><option>Radiology</option><option>Facilities</option></select></label><label>Transaction type<select name="type"><option>Receipt</option><option>Payment</option></select></label></div><div className="form-row"><label>Amount (PKR)<input name="amount" type="number" min="1" required placeholder="0" /></label><label>Payment method<select name="method"><option>Cash</option><option>Bank</option><option>Card</option><option>Cheque</option></select></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="primary-button">Save transaction</button></div></form></div>}
      {notice && <div className="toast"><span>✓</span>{notice}</div>}
    </main>
  );
}

function TransactionTable({ rows }: { rows: Transaction[] }) {
  return <div className="table-wrap"><table><thead><tr><th>Reference</th><th>Description</th><th>Department</th><th>Method</th><th>Amount</th><th>Status</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td><strong>{item.reference}</strong><small>{new Date(`${item.date}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</small></td><td>{item.description}</td><td>{item.department}</td><td>{item.method}</td><td className={item.type === "Receipt" ? "amount-in" : "amount-out"}>{item.type === "Receipt" ? "+" : "−"}{money(item.amount)}</td><td><span className={`status ${item.status.toLowerCase()}`}>{item.status}</span></td></tr>)}</tbody></table>{rows.length === 0 && <div className="empty-table">No transactions match your filters.</div>}</div>;
}
