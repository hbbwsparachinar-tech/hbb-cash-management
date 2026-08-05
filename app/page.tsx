"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type TxType = "Cash In" | "Cash Out";
type Transaction = { id:number; voucher:string|null; date:string; type:TxType; category:string; amount:number; from:string; to:string; description:string };
type Location = { id:number; name:string; openingBalance:number };
type Settings = { hospitalName:string; currencySymbol:string };

const cashInCategories = ["Blood","Donation","Hospital","Lab 1","Lab 2","Pharma","Radiology","Transport","Azadar Clinic","Vaccine","ECG","Small Industry"];
const cashOutCategories = [...cashInCategories,"Education","Food & Refreshment","Functions","Camps","Investment","Legal Charges","Free Medication","Packages","Printing","Projects","Ramadan / Food Packages","Repair & Maintenance","Special Persons Payment","Utilities","Free Vaccines","Salaries"];
const initialLocations: Location[] = [
  { id:1, name:"Main Cash", openingBalance:1250000 }, { id:2, name:"Bank Account", openingBalance:3200000 },
  { id:3, name:"Petty Cash", openingBalance:85000 }, { id:4, name:"Hospital Cash Counter", openingBalance:150000 },
  { id:5, name:"Pharmacy Cash Counter", openingBalance:120000 }, { id:6, name:"Lab Cash Counter", openingBalance:90000 },
  { id:7, name:"Transport Cash", openingBalance:65000 },
];
const initialTransactions: Transaction[] = [
  { id:1,voucher:"HBB-260805-01",date:"2026-08-05",type:"Cash In",category:"Hospital",amount:185000,from:"Patient collections",to:"Hospital Cash Counter",description:"Morning counter collection" },
  { id:2,voucher:"HBB-260805-02",date:"2026-08-05",type:"Cash In",category:"Pharma",amount:96500,from:"Pharmacy sales",to:"Pharmacy Cash Counter",description:"Daily cash sales" },
  { id:3,voucher:"HBB-260805-03",date:"2026-08-05",type:"Cash Out",category:"Utilities",amount:68500,from:"Bank Account",to:"K-Electric",description:"Electricity bill" },
  { id:4,voucher:"HBB-260804-06",date:"2026-08-04",type:"Cash In",category:"Donation",amount:250000,from:"Community donor",to:"Main Cash",description:"General hospital donation" },
  { id:5,voucher:"HBB-260804-07",date:"2026-08-04",type:"Cash Out",category:"Free Medication",amount:124000,from:"Main Cash",to:"Al-Shifa Medical Store",description:"Medicines for welfare patients" },
  { id:6,voucher:"HBB-260803-04",date:"2026-08-03",type:"Cash In",category:"Lab 1",amount:118750,from:"Lab collections",to:"Lab Cash Counter",description:"Lab test receipts" },
];

const today = new Date().toISOString().slice(0,10);
const money = (value:number, symbol="Rs.") => `${symbol} ${new Intl.NumberFormat("en-PK",{maximumFractionDigits:0}).format(value)}`;
const dateLabel = (date:string) => new Date(`${date}T00:00:00`).toLocaleDateString("en-PK",{day:"2-digit",month:"short",year:"numeric"});
const icon:Record<string,string> = { Dashboard:"⌂", "Cash In":"↓", "Cash Out":"↑", Transactions:"↔", "Cash Locations":"⌖", Reports:"▥", Settings:"⚙" };
const navItems = Object.keys(icon);

export default function Home(){
  const [active,setActive] = useState("Dashboard");
  const [transactions,setTransactions] = useState<Transaction[]>(initialTransactions);
  const [locations,setLocations] = useState<Location[]>(initialLocations);
  const [settings,setSettings] = useState<Settings>({hospitalName:"HBB Hospital",currencySymbol:"Rs."});
  const [menuOpen,setMenuOpen] = useState(false);
  const [notice,setNotice] = useState("");
  const [loading,setLoading] = useState(true);

  useEffect(()=>{ fetch("/api/finance").then(r=>r.ok?r.json():Promise.reject()).then(data=>{
    if(data.transactions) setTransactions(data.transactions);
    if(data.locations) setLocations(data.locations);
    if(data.settings) setSettings(data.settings);
  }).catch(()=>undefined).finally(()=>setLoading(false)); },[]);

  function flash(message:string){ setNotice(message); window.setTimeout(()=>setNotice(""),2600); }
  function go(page:string){ setActive(page); setMenuOpen(false); window.scrollTo({top:0,behavior:"smooth"}); }

  async function saveTransaction(tx:Omit<Transaction,"id">, id?:number){
    const duplicate=Boolean(tx.voucher)&&transactions.some(t=>t.voucher?.toLowerCase()===tx.voucher?.toLowerCase()&&t.id!==id);
    if(duplicate){ flash("That voucher / bill number already exists"); return false; }
    if(id){ setTransactions(items=>items.map(t=>t.id===id?{...tx,id}:t)); }
    else { setTransactions(items=>[{...tx,id:Date.now()},...items]); }
    try{
      const response=await fetch("/api/finance",{method:id?"PUT":"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"transaction",id,...tx})});
      if(response.ok){ const data=await response.json(); if(!id&&data.transaction) setTransactions(items=>items.map(t=>t.id>1e12?data.transaction:t)); }
    }catch{}
    flash(id?"Transaction updated":"Transaction saved successfully"); return true;
  }

  async function deleteTransaction(id:number){
    if(!window.confirm("Delete this transaction? This action cannot be undone.")) return;
    setTransactions(items=>items.filter(t=>t.id!==id));
    try{ await fetch(`/api/finance?kind=transaction&id=${id}`,{method:"DELETE"}); }catch{}
    flash("Transaction deleted");
  }

  const locationStats=useMemo(()=>locations.map(location=>{
    const received=transactions.filter(t=>t.type==="Cash In"&&t.to===location.name).reduce((s,t)=>s+t.amount,0);
    const paid=transactions.filter(t=>t.type==="Cash Out"&&t.from===location.name).reduce((s,t)=>s+t.amount,0);
    return {...location,received,paid,balance:location.openingBalance+received-paid};
  }),[locations,transactions]);
  const totalAvailable=locationStats.reduce((s,l)=>s+l.balance,0);

  return <main className="app-shell">
    <aside className={`sidebar ${menuOpen?"open":""}`}>
      <div className="brand"><span className="brand-mark">H+</span><span><strong>{settings.hospitalName}</strong><small>Cash Management</small></span></div>
      <nav aria-label="Main navigation">{navItems.map(item=><button key={item} className={active===item?"active":""} onClick={()=>go(item)}><span>{icon[item]}</span>{item}</button>)}</nav>
      <div className="sidebar-help"><span>i</span><div><strong>Simple cash book</strong><small>All balances update automatically.</small></div></div>
      <footer><span className="status-dot"/> Data saved securely</footer>
    </aside>
    {menuOpen&&<button className="mobile-scrim" aria-label="Close navigation" onClick={()=>setMenuOpen(false)}/>}
    <section className="content">
      <header className="topbar"><button className="menu-button" onClick={()=>setMenuOpen(!menuOpen)} aria-label="Open navigation">☰</button><div><small>Hospital Cash Management</small><strong>{active}</strong></div><div className="top-date"><span>Today</span><strong>{new Date().toLocaleDateString("en-PK",{day:"2-digit",month:"long",year:"numeric"})}</strong></div></header>
      <div className="page">
        {loading&&<div className="loading-line"/>}
        {active==="Dashboard"&&<Dashboard transactions={transactions} locationStats={locationStats} settings={settings} go={go}/>}
        {active==="Cash In"&&<EntryPage type="Cash In" settings={settings} onSave={saveTransaction} go={go}/>}
        {active==="Cash Out"&&<EntryPage type="Cash Out" settings={settings} onSave={saveTransaction} go={go}/>}
        {active==="Transactions"&&<TransactionsPage transactions={transactions} locations={locations} settings={settings} onSave={saveTransaction} onDelete={deleteTransaction}/>}
        {active==="Cash Locations"&&<LocationsPage locations={locations} setLocations={setLocations} stats={locationStats} settings={settings} flash={flash}/>}
        {active==="Reports"&&<Reports transactions={transactions} locationStats={locationStats} settings={settings}/>}
        {active==="Settings"&&<SettingsPage settings={settings} setSettings={setSettings} flash={flash}/>}
      </div>
    </section>
    {notice&&<div className="toast"><b>✓</b>{notice}</div>}
  </main>;
}

function PageHeading({eyebrow,title,description,action}:{eyebrow:string;title:string;description:string;action?:React.ReactNode}){
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function Dashboard({transactions,locationStats,settings,go}:{transactions:Transaction[];locationStats:Array<Location&{received:number;paid:number;balance:number}>;settings:Settings;go:(p:string)=>void}){
  const [from,setFrom]=useState(today.slice(0,8)+"01"), [to,setTo]=useState(today);
  const filtered=transactions.filter(t=>t.date>=from&&t.date<=to);
  const cashIn=filtered.filter(t=>t.type==="Cash In").reduce((s,t)=>s+t.amount,0), cashOut=filtered.filter(t=>t.type==="Cash Out").reduce((s,t)=>s+t.amount,0);
  const todayIn=transactions.filter(t=>t.type==="Cash In"&&t.date===today).reduce((s,t)=>s+t.amount,0), todayOut=transactions.filter(t=>t.type==="Cash Out"&&t.date===today).reduce((s,t)=>s+t.amount,0);
  const available=locationStats.reduce((s,l)=>s+l.balance,0);
  const summarize=(type:TxType)=>Object.entries(filtered.filter(t=>t.type===type).reduce<Record<string,number>>((a,t)=>{a[t.category]=(a[t.category]||0)+t.amount;return a;},{})).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const inSummary=summarize("Cash In"), outSummary=summarize("Cash Out");
  return <>
    <PageHeading eyebrow="CASH OVERVIEW" title="Dashboard" description="A clear view of cash received, paid, and currently available." action={<div className="date-filter"><label>From<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>To<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></div>}/>
    <section className="metrics">
      <Metric label="Total Cash In" value={money(cashIn,settings.currencySymbol)} tone="green" icon="↓" note="Selected period"/>
      <Metric label="Total Cash Out" value={money(cashOut,settings.currencySymbol)} tone="red" icon="↑" note="Selected period"/>
      <Metric label="Available Cash" value={money(available,settings.currencySymbol)} tone="blue" icon="≋" note="Across all locations" featured/>
      <Metric label="Today’s Cash In" value={money(todayIn,settings.currencySymbol)} tone="green" icon="＋" note={dateLabel(today)}/>
      <Metric label="Today’s Cash Out" value={money(todayOut,settings.currencySymbol)} tone="red" icon="−" note={dateLabel(today)}/>
    </section>
    <section className="dashboard-grid">
      <article className="panel recent"><PanelHead title="Recent Transactions" subtitle="Latest cash activity" action={<button className="link-button" onClick={()=>go("Transactions")}>View all →</button>}/><TransactionTable rows={filtered.slice(0,6)} symbol={settings.currencySymbol} compact/></article>
      <article className="panel balance-panel"><PanelHead title="Cash by Location" subtitle="Current available balance" action={<button className="link-button" onClick={()=>go("Cash Locations")}>Manage →</button>}/><div className="location-list">{locationStats.map((l,i)=><div key={l.id}><span className={`location-icon c${i%4}`}>{l.name.slice(0,2).toUpperCase()}</span><span><strong>{l.name}</strong><small>{Math.round(l.balance/Math.max(available,1)*100)}% of available cash</small></span><b>{money(l.balance,settings.currencySymbol)}</b></div>)}</div></article>
    </section>
    <section className="summary-grid"><SummaryCard title="Cash In by Category" data={inSummary} total={cashIn} symbol={settings.currencySymbol} tone="green"/><SummaryCard title="Cash Out by Category" data={outSummary} total={cashOut} symbol={settings.currencySymbol} tone="blue"/></section>
  </>;
}

function Metric({label,value,tone,icon,note,featured=false}:{label:string;value:string;tone:string;icon:string;note:string;featured?:boolean}){ return <article className={`metric ${featured?"featured":""}`}><span className={`metric-icon ${tone}`}>{icon}</span><small>{label}</small><strong>{value}</strong><p>{note}</p></article>; }
function PanelHead({title,subtitle,action}:{title:string;subtitle:string;action?:React.ReactNode}){ return <div className="panel-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>; }
function SummaryCard({title,data,total,symbol,tone}:{title:string;data:[string,number][];total:number;symbol:string;tone:string}){return <article className="panel summary-card"><PanelHead title={title} subtitle="Selected reporting period"/><div className="summary-bars">{data.length?data.map(([name,value])=><div key={name}><span><strong>{name}</strong><b>{money(value,symbol)}</b></span><i><em className={tone} style={{width:`${Math.max(7,value/Math.max(total,1)*100)}%`}}/></i></div>):<Empty message="No transactions in this period."/>}</div></article>}

function EntryPage({type,settings,onSave,go}:{type:TxType;settings:Settings;onSave:(tx:Omit<Transaction,"id">)=>Promise<boolean>;go:(p:string)=>void}){
  const categories=type==="Cash In"?cashInCategories:cashOutCategories;
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget,fd=new FormData(form);const ok=await onSave({voucher:type==="Cash Out"?String(fd.get("voucher")).trim():null,date:String(fd.get("date")),type,category:String(fd.get("category")),amount:Number(fd.get("amount")),from:type==="Cash In"?String(fd.get("from")).trim():"",to:type==="Cash Out"?String(fd.get("to")).trim():"",description:String(fd.get("description")).trim()});if(ok) form.reset();}
  return <>
    <PageHeading eyebrow={type.toUpperCase()} title={`Record ${type}`} description={type==="Cash In"?"Record cash received from a person, department, or source.":"Record a payment and who it was paid to."}/>
    <section className="form-layout"><form className="panel entry-form" onSubmit={submit}><div className="form-title"><span className={type==="Cash In"?"green-bg":"red-bg"}>{type==="Cash In"?"↓":"↑"}</span><div><h2>{type} Entry</h2><p>Fields marked with * are required.</p></div></div>
      <div className="form-grid">{type==="Cash Out"&&<label>Voucher / Bill Number *<input name="voucher" required placeholder="Enter hard-copy bill number"/></label>}<label>Date *<input name="date" type="date" required defaultValue={today}/></label><label className={type==="Cash Out"?"wide":""}>{type==="Cash In"?"Category / Department":"Expense Category"} *<select name="category" required defaultValue=""><option value="" disabled>Select category</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Amount ({settings.currencySymbol}) *<input name="amount" type="number" min="1" step="0.01" required placeholder="0"/></label>
      {type==="Cash In"?<label>From *<input name="from" required placeholder="Person, department, or source"/></label>:<label>To / Paid To *<input name="to" required placeholder="Person, supplier, or department"/></label>}
      <label className="wide">Description / Remarks<textarea name="description" rows={4} placeholder="Add optional details about this transaction"/></label></div>
      <div className="form-actions"><button type="reset" className="secondary">Clear Form</button><button className={`primary ${type==="Cash Out"?"danger":""}`}>Save {type}</button></div></form>
      <aside className="entry-aside"><article><span>✓</span><h3>Before you save</h3><ul>{type==="Cash Out"&&<li>Use the number printed on the hard-copy bill.</li>}<li>Check the transaction date and amount.</li><li>Check the category and {type==="Cash In"?"cash source":"recipient"}.</li></ul></article><button onClick={()=>go("Transactions")}>View all transactions <b>→</b></button></aside></section>
  </>;
}

function TransactionsPage({transactions,locations,settings,onSave,onDelete}:{transactions:Transaction[];locations:Location[];settings:Settings;onSave:(tx:Omit<Transaction,"id">,id?:number)=>Promise<boolean>;onDelete:(id:number)=>void}){
  const [search,setSearch]=useState(""),[type,setType]=useState("All"),[category,setCategory]=useState("All"),[location,setLocation]=useState("All"),[from,setFrom]=useState(""),[to,setTo]=useState(""),[editing,setEditing]=useState<Transaction|null>(null);
  const rows=useMemo(()=>transactions.filter(t=>{const q=search.toLowerCase();return (!q||`${t.voucher??""} ${t.description} ${t.category}`.toLowerCase().includes(q))&&(type==="All"||t.type===type)&&(category==="All"||t.category===category)&&(location==="All"||t.from===location||t.to===location)&&(!from||t.date>=from)&&(!to||t.date<=to)}),[transactions,search,type,category,location,from,to]);
  return <><PageHeading eyebrow="CASH BOOK" title="Transactions" description={`${rows.length} of ${transactions.length} records shown`}/><section className="panel data-panel"><div className="filters"><label className="search">⌕<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Voucher, category, or description"/></label><select value={type} onChange={e=>setType(e.target.value)}><option>All</option><option>Cash In</option><option>Cash Out</option></select><select value={category} onChange={e=>setCategory(e.target.value)}><option>All</option>{cashOutCategories.map(c=><option key={c}>{c}</option>)}</select><select value={location} onChange={e=>setLocation(e.target.value)}><option>All</option>{locations.map(l=><option key={l.id}>{l.name}</option>)}</select><label className="mini-label">From<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label className="mini-label">To<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></div><TransactionTable rows={rows} symbol={settings.currencySymbol} onEdit={setEditing} onDelete={onDelete}/></section>{editing&&<EditModal tx={editing} settings={settings} close={()=>setEditing(null)} save={async tx=>{if(await onSave(tx,editing.id))setEditing(null)}}/>}</>;
}

function TransactionTable({rows,symbol,compact=false,onEdit,onDelete}:{rows:Transaction[];symbol:string;compact?:boolean;onEdit?:(t:Transaction)=>void;onDelete?:(id:number)=>void}){return <div className="table-wrap"><table><thead><tr><th>Voucher / Bill No.</th><th>Date</th><th>Type</th><th>Category</th><th>Amount</th>{!compact&&<><th>From</th><th>To</th><th>Description</th><th>Actions</th></>}</tr></thead><tbody>{rows.map(t=><tr key={t.id}><td><strong>{t.type==="Cash In"?"—":t.voucher||"—"}</strong></td><td>{dateLabel(t.date)}</td><td><span className={`type-pill ${t.type==="Cash In"?"in":"out"}`}>{t.type}</span></td><td>{t.category}</td><td className={t.type==="Cash In"?"amount-in":"amount-out"}>{t.type==="Cash In"?"+":"−"}{money(t.amount,symbol)}</td>{!compact&&<><td>{t.from||"—"}</td><td>{t.to||"—"}</td><td className="description-cell">{t.description||"—"}</td><td><div className="row-actions"><button onClick={()=>onEdit?.(t)}>Edit</button><button className="delete" onClick={()=>onDelete?.(t.id)}>Delete</button></div></td></>}</tr>)}</tbody></table>{!rows.length&&<Empty message="No transactions match these filters."/>}</div>}

function EditModal({tx,settings,close,save}:{tx:Transaction;settings:Settings;close:()=>void;save:(t:Omit<Transaction,"id">)=>void}){const [type,setType]=useState<TxType>(tx.type);return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><form className="modal" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);save({voucher:type==="Cash Out"?String(f.get("voucher")):null,date:String(f.get("date")),type,category:String(f.get("category")),amount:Number(f.get("amount")),from:type==="Cash In"?String(f.get("from")):"",to:type==="Cash Out"?String(f.get("to")):"",description:String(f.get("description"))})}}><div className="modal-head"><div><span className="eyebrow">EDIT RECORD</span><h2>Update transaction</h2></div><button type="button" onClick={close}>×</button></div><div className="form-grid">{type==="Cash Out"&&<label>Voucher / Bill Number *<input name="voucher" required defaultValue={tx.voucher||""}/></label>}<label>Date *<input name="date" type="date" required defaultValue={tx.date}/></label><label>Type *<select value={type} onChange={e=>setType(e.target.value as TxType)}><option>Cash In</option><option>Cash Out</option></select></label><label>Category *<select name="category" defaultValue={tx.category}>{(type==="Cash In"?cashInCategories:cashOutCategories).map(c=><option key={c}>{c}</option>)}</select></label><label>Amount ({settings.currencySymbol}) *<input name="amount" type="number" min="1" required defaultValue={tx.amount}/></label>{type==="Cash In"?<label>From *<input name="from" required defaultValue={tx.from}/></label>:<label>To / Paid To *<input name="to" required defaultValue={tx.to}/></label>}<label className="wide">Description<textarea name="description" defaultValue={tx.description}/></label></div><div className="form-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Save Changes</button></div></form></div>}

function LocationsPage({locations,setLocations,stats,settings,flash}:{locations:Location[];setLocations:React.Dispatch<React.SetStateAction<Location[]>>;stats:Array<Location&{received:number;paid:number;balance:number}>;settings:Settings;flash:(m:string)=>void}){
  const [editing,setEditing]=useState<Location|null>(null);
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const fd=new FormData(e.currentTarget),name=String(fd.get("name")).trim(),openingBalance=Number(fd.get("openingBalance")),id=editing?.id;if(id)setLocations(items=>items.map(l=>l.id===id?{id,name,openingBalance}:l));else setLocations(items=>[...items,{id:Date.now(),name,openingBalance}]);try{const r=await fetch("/api/finance",{method:id?"PUT":"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"location",id,name,openingBalance})});if(r.ok&&!id){const d=await r.json();setLocations(items=>items.map(l=>l.id>1e12?d.location:l))}}catch{}setEditing(null);e.currentTarget.reset();flash(id?"Cash location updated":"Cash location added");}
  async function remove(id:number){if(!window.confirm("Remove this cash location? Existing transaction records will not be deleted."))return;setLocations(items=>items.filter(l=>l.id!==id));try{await fetch(`/api/finance?kind=location&id=${id}`,{method:"DELETE"})}catch{}flash("Cash location removed")}
  return <><PageHeading eyebrow="CASH SETTINGS" title="Cash Locations" description="Add the places where hospital cash is held and monitor each balance."/><section className="location-metrics">{stats.map((l,i)=><article className="panel location-card" key={l.id}><div><span className={`location-icon c${i%4}`}>{l.name.slice(0,2).toUpperCase()}</span><button onClick={()=>setEditing(l)}>Edit</button><button className="delete-text" onClick={()=>remove(l.id)}>Remove</button></div><h3>{l.name}</h3><small>Available balance</small><strong>{money(l.balance,settings.currencySymbol)}</strong><dl><div><dt>Opening</dt><dd>{money(l.openingBalance,settings.currencySymbol)}</dd></div><div><dt>Received</dt><dd className="amount-in">+{money(l.received,settings.currencySymbol)}</dd></div><div><dt>Paid out</dt><dd className="amount-out">−{money(l.paid,settings.currencySymbol)}</dd></div></dl></article>)}</section><form className="panel inline-form" onSubmit={submit} key={editing?.id||"new"}><div><h2>{editing?"Edit cash location":"Add cash location"}</h2><p>Opening balance is the amount held before recorded transactions.</p></div><label>Location Name *<input name="name" required defaultValue={editing?.name} placeholder="e.g. Main Cash"/></label><label>Opening Balance *<input name="openingBalance" type="number" min="0" required defaultValue={editing?.openingBalance||0}/></label><div><button type="button" className="secondary" onClick={()=>setEditing(null)}>Clear</button><button className="primary">{editing?"Update Location":"Add Location"}</button></div></form></>;
}
function Reports({transactions,locationStats,settings}:{transactions:Transaction[];locationStats:Array<Location&{received:number;paid:number;balance:number}>;settings:Settings}){
  const [report,setReport]=useState("Daily Cash Report"),[date,setDate]=useState(today),[month,setMonth]=useState(today.slice(0,7));
  const rows=transactions.filter(t=>report==="Daily Cash Report"?t.date===date:report==="Monthly Cash Report"||report==="Complete Cash Book"?t.date.startsWith(month):true);
  const totalIn=rows.filter(t=>t.type==="Cash In").reduce((s,t)=>s+t.amount,0),totalOut=rows.filter(t=>t.type==="Cash Out").reduce((s,t)=>s+t.amount,0);
  const categoryRows=(type:TxType)=>Object.entries(transactions.filter(t=>t.type===type&&t.date.startsWith(month)).reduce<Record<string,{count:number,total:number}>>((a,t)=>{a[t.category]??={count:0,total:0};a[t.category].count++;a[t.category].total+=t.amount;return a},{}));
  function exportExcel(){let csv="";if(report.includes("Category-wise")){const data=categoryRows(report.includes("Cash In")?"Cash In":"Cash Out");csv=[["Category","Transactions","Total Amount"],...data.map(([c,v])=>[c,v.count,v.total])].map(r=>r.join(",")).join("\n")}else if(report==="Cash Location Balance Report"){csv=[["Location","Opening Balance","Cash Received","Cash Paid Out","Available Balance"],...locationStats.map(l=>[l.name,l.openingBalance,l.received,l.paid,l.balance])].map(r=>r.join(",")).join("\n")}else csv=[["Voucher","Date","Type","Category","Amount","From","To","Description"],...rows.map(t=>[t.type==="Cash In"?"":t.voucher||"",t.date,t.type,t.category,t.amount,t.from,t.to,`"${t.description.replaceAll('"','""')}"`])].map(r=>r.join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=`${report.toLowerCase().replaceAll(" ","-")}.csv`;a.click();URL.revokeObjectURL(a.href)}
  const reports=["Daily Cash Report","Monthly Cash Report","Category-wise Cash In Report","Category-wise Cash Out Report","Cash Location Balance Report","Complete Cash Book"];
  return <><PageHeading eyebrow="REPORTING" title="Reports" description="Review, print, and export the hospital cash book."/><section className="reports-layout"><aside className="panel report-nav">{reports.map(r=><button key={r} className={report===r?"active":""} onClick={()=>setReport(r)}><span>▤</span>{r}</button>)}</aside><article className="panel report-sheet"><div className="report-toolbar"><div><h2>{report}</h2><p>{settings.hospitalName}</p></div><div className="report-controls">{report==="Daily Cash Report"?<input type="date" value={date} onChange={e=>setDate(e.target.value)}/>:report!=="Cash Location Balance Report"&&<input type="month" value={month} onChange={e=>setMonth(e.target.value)}/>}<button className="secondary" onClick={()=>window.print()}>⌁ Print</button><button className="primary" onClick={exportExcel}>⇩ Export Excel</button></div></div>{report!=="Cash Location Balance Report"&&!report.includes("Category-wise")&&<><div className="report-totals"><div><small>Cash In</small><strong className="amount-in">{money(totalIn,settings.currencySymbol)}</strong></div><div><small>Cash Out</small><strong className="amount-out">{money(totalOut,settings.currencySymbol)}</strong></div><div><small>Net Movement</small><strong>{money(totalIn-totalOut,settings.currencySymbol)}</strong></div></div><TransactionTable rows={rows} symbol={settings.currencySymbol}/></>}{report.includes("Category-wise")&&<CategoryReport rows={categoryRows(report.includes("Cash In")?"Cash In":"Cash Out")} symbol={settings.currencySymbol}/>} {report==="Cash Location Balance Report"&&<LocationReport rows={locationStats} symbol={settings.currencySymbol}/>}</article></section></>;
}
function CategoryReport({rows,symbol}:{rows:[string,{count:number;total:number}][];symbol:string}){return <div className="table-wrap"><table><thead><tr><th>Category</th><th>Transactions</th><th>Total Amount</th></tr></thead><tbody>{rows.map(([c,v])=><tr key={c}><td><strong>{c}</strong></td><td>{v.count}</td><td><strong>{money(v.total,symbol)}</strong></td></tr>)}</tbody></table>{!rows.length&&<Empty message="No report data available."/>}</div>}
function LocationReport({rows,symbol}:{rows:Array<Location&{received:number;paid:number;balance:number}>;symbol:string}){return <div className="table-wrap"><table><thead><tr><th>Cash Location</th><th>Opening Balance</th><th>Cash Received</th><th>Cash Paid Out</th><th>Available Balance</th></tr></thead><tbody>{rows.map(l=><tr key={l.id}><td><strong>{l.name}</strong></td><td>{money(l.openingBalance,symbol)}</td><td className="amount-in">+{money(l.received,symbol)}</td><td className="amount-out">−{money(l.paid,symbol)}</td><td><strong>{money(l.balance,symbol)}</strong></td></tr>)}</tbody></table></div>}

function SettingsPage({settings,setSettings,flash}:{settings:Settings;setSettings:React.Dispatch<React.SetStateAction<Settings>>;flash:(m:string)=>void}){async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget),next={hospitalName:String(f.get("hospitalName")),currencySymbol:String(f.get("currencySymbol"))};setSettings(next);try{await fetch("/api/finance",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"settings",...next})})}catch{}flash("Settings saved")};return <><PageHeading eyebrow="APPLICATION" title="Settings" description="Set the hospital name and currency shown across the cash book."/><form className="panel settings-form" onSubmit={submit}><div className="form-title"><span className="blue-bg">⚙</span><div><h2>General Settings</h2><p>These details appear on dashboards and reports.</p></div></div><label>Hospital Name *<input name="hospitalName" required defaultValue={settings.hospitalName}/></label><label>Currency Symbol *<input name="currencySymbol" required defaultValue={settings.currencySymbol}/></label><div className="form-actions"><button className="primary">Save Settings</button></div></form></>}
function Empty({message}:{message:string}){return <div className="empty"><span>▤</span><p>{message}</p></div>}
