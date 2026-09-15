"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type TxType = "Cash In" | "Cash Out";
type Transaction = { id:number; voucher:string|null; date:string; type:TxType; category:string; amount:number; from:string; to:string; description:string };
type Settings = { hospitalName:string; currencySymbol:string };

const cashInCategories = ["Blood","Donation","Hospital","Lab 1","Lab 2","Pharma","Radiology","Transport","Azadar Clinic","Vaccine","ECG","Small Industry"];
const cashOutCategories = [...cashInCategories.filter(category=>category!=="Donation"),"Education","Food & Refreshment","Functions","Camps","Investment","Legal Charges","Free Medication","Packages","Printing","Projects","Ramadan / Food Packages","Repair & Maintenance","Special Persons Payment","Utilities","Free Vaccines","Salaries"];
const initialTransactions: Transaction[] = [];
const addDepartmentValue = "__add_new_department__";

function uniqueSuggestions(values:string[]){const seen=new Set<string>();return values.reduce<string[]>((items,value)=>{const suggestion=value.trim(),key=suggestion.toLowerCase();if(suggestion&&!seen.has(key)){seen.add(key);items.push(suggestion);}return items;},[]).slice(0,12);}
function uniqueValues(values:string[]){const seen=new Set<string>();return values.reduce<string[]>((items,value)=>{const item=value.trim(),key=item.toLowerCase();if(item&&!seen.has(key)){seen.add(key);items.push(item);}return items;},[]);}
function categoriesFor(type:TxType,departments:string[]){return uniqueValues([...(type==="Cash In"?cashInCategories:cashOutCategories),...departments]);}

const today = new Date().toISOString().slice(0,10);
const money = (value:number, symbol="Rs.") => `${symbol} ${new Intl.NumberFormat("en-PK",{maximumFractionDigits:0}).format(value)}`;
const dateLabel = (date:string) => new Date(`${date}T00:00:00`).toLocaleDateString("en-PK",{day:"2-digit",month:"short",year:"numeric"});
const icon:Record<string,string> = { Dashboard:"⌂", "Cash In":"↓", "Cash Out":"↑", Transactions:"↔", Reports:"▥" };
const navItems = Object.keys(icon);

export default function Home(){
  const [active,setActive] = useState("Dashboard");
  const [transactions,setTransactions] = useState<Transaction[]>(initialTransactions);
  const [departments,setDepartments] = useState<string[]>([]);
  const [settings,setSettings] = useState<Settings>({hospitalName:"HBB Hospital",currencySymbol:"Rs."});
  const [menuOpen,setMenuOpen] = useState(false);
  const [notice,setNotice] = useState("");
  const [loading,setLoading] = useState(true);

  useEffect(()=>{ fetch("/api/finance").then(r=>r.ok?r.json():Promise.reject()).then(data=>{
    if(data.transactions) setTransactions(data.transactions);
    if(data.settings) setSettings(data.settings);
    if(data.departments) setDepartments(data.departments);
  }).catch(()=>undefined).finally(()=>setLoading(false)); },[]);

  function flash(message:string){ setNotice(message); window.setTimeout(()=>setNotice(""),2600); }
  function go(page:string){ setActive(page); setMenuOpen(false); window.scrollTo({top:0,behavior:"smooth"}); }

  async function responseError(response:Response, fallback:string){
    try{const data=await response.json() as {error?:string};return data.error||fallback;}catch{return fallback;}
  }

  async function saveTransaction(tx:Omit<Transaction,"id">, id?:number){
    const duplicate=Boolean(tx.voucher)&&transactions.some(t=>t.voucher?.toLowerCase()===tx.voucher?.toLowerCase()&&t.id!==id);
    if(duplicate){ flash("That voucher / bill number already exists"); return false; }
    const previous=id?transactions.find(t=>t.id===id):undefined;
    const temporaryId=Date.now();
    if(id){ setTransactions(items=>items.map(t=>t.id===id?{...tx,id}:t)); }
    else { setTransactions(items=>[{...tx,id:temporaryId},...items]); }
    try{
      const response=await fetch("/api/finance",{method:id?"PUT":"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"transaction",id,...tx})});
      if(!response.ok) throw new Error(await responseError(response,"Could not save this transaction."));
      const data=await response.json() as {transaction?:Transaction};
      if(data.transaction) setTransactions(items=>items.map(t=>t.id===(id||temporaryId)?data.transaction!:t));
      flash(id?"Transaction updated":"Transaction saved successfully"); return true;
    }catch(error){
      if(id&&previous) setTransactions(items=>items.map(t=>t.id===id?previous:t));
      else setTransactions(items=>items.filter(t=>t.id!==temporaryId));
      flash(error instanceof Error?error.message:"Could not save this transaction."); return false;
    }
  }

  async function addDepartment(name:string){
    try{
      const response=await fetch("/api/finance",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({kind:"department",name})});
      if(!response.ok) throw new Error(await responseError(response,"Could not add this department."));
      const data=await response.json() as {department?:{name:string}};
      if(!data.department?.name) throw new Error("Could not add this department.");
      setDepartments(items=>uniqueValues([...items,data.department!.name]));
      flash(`${data.department.name} was added to both category lists`);
      return data.department.name;
    }catch(error){
      flash(error instanceof Error?error.message:"Could not add this department.");
      return null;
    }
  }

  async function deleteTransaction(id:number){
    if(!window.confirm("Delete this transaction? This action cannot be undone.")) return;
    const previous=transactions.find(t=>t.id===id), previousIndex=transactions.findIndex(t=>t.id===id);
    setTransactions(items=>items.filter(t=>t.id!==id));
    try{
      const response=await fetch(`/api/finance?kind=transaction&id=${id}`,{method:"DELETE"});
      if(!response.ok) throw new Error(await responseError(response,"Could not delete this transaction."));
      flash("Transaction deleted");
    }catch(error){
      if(previous) setTransactions(items=>{const restored=[...items];restored.splice(previousIndex,0,previous);return restored;});
      flash(error instanceof Error?error.message:"Could not delete this transaction.");
    }
  }

  return <main className="app-shell">
    <aside className={`sidebar ${menuOpen?"open":""}`}>
      <div className="brand"><span className="brand-mark">H+</span><span><strong>{settings.hospitalName}</strong><small>Cash Management</small></span></div>
      <nav aria-label="Main navigation">{navItems.map(item=><button key={item} className={active===item?"active":""} onClick={()=>go(item)}><span>{icon[item]}</span>{item}</button>)}</nav>
      <footer><span className="status-dot"/> Data saved securely</footer>
    </aside>
    {menuOpen&&<button className="mobile-scrim" aria-label="Close navigation" onClick={()=>setMenuOpen(false)}/>}
    <section className="content">
      <header className="topbar"><button className="menu-button" onClick={()=>setMenuOpen(!menuOpen)} aria-label="Open navigation">☰</button><div><small>Hospital Cash Management</small><strong>{active}</strong></div><div className="top-date"><span>Today</span><strong>{new Date().toLocaleDateString("en-PK",{day:"2-digit",month:"long",year:"numeric"})}</strong></div></header>
      <div className="page">
        {loading&&<div className="loading-line"/>}
        {active==="Dashboard"&&<Dashboard transactions={transactions} settings={settings} go={go}/>}
        {active==="Cash In"&&<EntryPage type="Cash In" settings={settings} transactions={transactions} departments={departments} onAddDepartment={addDepartment} onSave={saveTransaction}/>}
        {active==="Cash Out"&&<EntryPage type="Cash Out" settings={settings} transactions={transactions} departments={departments} onAddDepartment={addDepartment} onSave={saveTransaction}/>}
        {active==="Transactions"&&<TransactionsPage transactions={transactions} settings={settings} departments={departments} onSave={saveTransaction} onDelete={deleteTransaction}/>}
        {active==="Reports"&&<Reports transactions={transactions} settings={settings}/>}
      </div>
    </section>
    {notice&&<div className="toast"><b>✓</b>{notice}</div>}
  </main>;
}

function PageHeading({eyebrow,title,description,action}:{eyebrow:string;title:string;description:string;action?:React.ReactNode}){
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function Dashboard({transactions,settings,go}:{transactions:Transaction[];settings:Settings;go:(p:string)=>void}){
  const [from,setFrom]=useState(today.slice(0,8)+"01"), [to,setTo]=useState(today);
  const filtered=transactions.filter(t=>t.date>=from&&t.date<=to);
  const cashIn=filtered.filter(t=>t.type==="Cash In").reduce((s,t)=>s+t.amount,0), cashOut=filtered.filter(t=>t.type==="Cash Out").reduce((s,t)=>s+t.amount,0);
  const todayIn=transactions.filter(t=>t.type==="Cash In"&&t.date===today).reduce((s,t)=>s+t.amount,0), todayOut=transactions.filter(t=>t.type==="Cash Out"&&t.date===today).reduce((s,t)=>s+t.amount,0);
  const available=transactions.reduce((sum,t)=>sum+(t.type==="Cash In"?t.amount:-t.amount),0);
  const summarize=(type:TxType)=>Object.entries(filtered.filter(t=>t.type===type).reduce<Record<string,number>>((a,t)=>{a[t.category]=(a[t.category]||0)+t.amount;return a;},{})).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const inSummary=summarize("Cash In"), outSummary=summarize("Cash Out");
  return <>
    <PageHeading eyebrow="CASH OVERVIEW" title="Dashboard" description="A clear view of cash received, paid, and currently available." action={<div className="date-filter"><label>From<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>To<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></div>}/>
    <section className="metrics">
      <Metric label="Total Cash In" value={money(cashIn,settings.currencySymbol)} tone="green" icon="↓" note="Selected period"/>
      <Metric label="Total Cash Out" value={money(cashOut,settings.currencySymbol)} tone="red" icon="↑" note="Selected period"/>
      <Metric label="Available Cash" value={money(available,settings.currencySymbol)} tone="blue" icon="≋" note="Total Cash In minus Cash Out" featured/>
      <Metric label="Today’s Cash In" value={money(todayIn,settings.currencySymbol)} tone="green" icon="＋" note={dateLabel(today)}/>
      <Metric label="Today’s Cash Out" value={money(todayOut,settings.currencySymbol)} tone="red" icon="−" note={dateLabel(today)}/>
    </section>
    <section className="dashboard-grid single">
      <article className="panel recent"><PanelHead title="Recent Transactions" subtitle="Latest cash activity" action={<button className="link-button" onClick={()=>go("Transactions")}>View all →</button>}/><TransactionTable rows={filtered.slice(0,6)} symbol={settings.currencySymbol} compact/></article>
    </section>
    <section className="summary-grid"><SummaryCard title="Cash In by Category" data={inSummary} total={cashIn} symbol={settings.currencySymbol} tone="green"/><SummaryCard title="Cash Out by Category" data={outSummary} total={cashOut} symbol={settings.currencySymbol} tone="blue"/></section>
  </>;
}

function Metric({label,value,tone,icon,note,featured=false}:{label:string;value:string;tone:string;icon:string;note:string;featured?:boolean}){ return <article className={`metric ${featured?"featured":""}`}><span className={`metric-icon ${tone}`}>{icon}</span><small>{label}</small><strong>{value}</strong><p>{note}</p></article>; }
function PanelHead({title,subtitle,action}:{title:string;subtitle:string;action?:React.ReactNode}){ return <div className="panel-head"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>; }
function SummaryCard({title,data,total,symbol,tone}:{title:string;data:[string,number][];total:number;symbol:string;tone:string}){return <article className="panel summary-card"><PanelHead title={title} subtitle="Selected reporting period"/><div className="summary-bars">{data.length?data.map(([name,value])=><div key={name}><span><strong>{name}</strong><b>{money(value,symbol)}</b></span><i><em className={tone} style={{width:`${Math.max(7,value/Math.max(total,1)*100)}%`}}/></i></div>):<Empty message="No transactions in this period."/>}</div></article>}

function EntryPage({type,settings,transactions,departments,onAddDepartment,onSave}:{type:TxType;settings:Settings;transactions:Transaction[];departments:string[];onAddDepartment:(name:string)=>Promise<string|null>;onSave:(tx:Omit<Transaction,"id">)=>Promise<boolean>}){
  const categories=categoriesFor(type,departments);
  const [category,setCategory]=useState("");
  const [newDepartment,setNewDepartment]=useState("");
  const [addingDepartment,setAddingDepartment]=useState(false);
  const [departmentMessage,setDepartmentMessage]=useState("");
  const suggestions=useMemo(()=>({from:uniqueSuggestions(transactions.filter(t=>t.type==="Cash In").map(t=>t.from)),to:uniqueSuggestions(transactions.filter(t=>t.type==="Cash Out").map(t=>t.to))}),[transactions]);
  async function addNewDepartment(){
    const name=newDepartment.trim();
    if(!name){setDepartmentMessage("Enter a department name first.");return;}
    setAddingDepartment(true);setDepartmentMessage("");
    const saved=await onAddDepartment(name);
    setAddingDepartment(false);
    if(saved){setCategory(saved);setNewDepartment("");}
    else setDepartmentMessage("Department could not be saved. Please try again.");
  }
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(category===addDepartmentValue){setDepartmentMessage("Add the new department before saving this transaction.");return;}const form=e.currentTarget,fd=new FormData(form);const ok=await onSave({voucher:type==="Cash Out"?String(fd.get("voucher")).trim():null,date:String(fd.get("date")),type,category,amount:Number(fd.get("amount")),from:type==="Cash In"?String(fd.get("from")).trim():"",to:type==="Cash Out"?String(fd.get("to")).trim():"",description:String(fd.get("description")).trim()});if(ok){form.reset();setCategory("");}}
  return <>
    <section className="entry-heading"><span className={`entry-badge ${type==="Cash In"?"in":"out"}`}>{type}</span><div><h1>{type} Entry</h1><p>{type==="Cash In"?"Record money received from a person, department, or source.":"Record a payment with its manual voucher or bill number."}</p></div></section>
    <section className="form-layout"><form className="panel entry-form" onSubmit={submit}><div className="entry-form-top"><div><h2>Transaction details</h2><p>Fields marked with * are required.</p></div></div>
      <div className={`form-grid ${type==="Cash In"?"cash-in-fields":"cash-out-fields"}`}>{type==="Cash Out"&&<label>Voucher / Bill Number *<input name="voucher" required placeholder="Enter hard-copy bill number"/></label>}<label>Date *<input name="date" type="date" required defaultValue={today}/></label><label>{type==="Cash In"?"Category / Department":"Expense Category"} *<select name="category" required value={category} onChange={e=>{setCategory(e.target.value);setDepartmentMessage("")}}><option value="" disabled>Select category</option>{categories.map(c=><option key={c}>{c}</option>)}<option value={addDepartmentValue}>+ Add a new department…</option></select></label>{category===addDepartmentValue&&<div className="department-adder"><div><strong>Add a new department</strong><p>It will be saved permanently and available in Cash In and Cash Out.</p></div><input value={newDepartment} onChange={e=>setNewDepartment(e.target.value)} placeholder="Department name" maxLength={80}/><button type="button" className="secondary" onClick={addNewDepartment} disabled={addingDepartment}>{addingDepartment?"Adding…":"Add Department"}</button>{departmentMessage&&<small>{departmentMessage}</small>}</div>}<label>Amount ({settings.currencySymbol}) *<input name="amount" type="number" min="1" step="0.01" required placeholder="0"/></label>
      {type==="Cash In"?<label className="source-field">From *<input name="from" list="cash-in-source-suggestions" required placeholder="Person, department, or source"/>{suggestions.from.length>0&&<small className="suggestion-note">Previously used sources appear as you type.</small>}</label>:<label className="recipient-field">To / Paid To *<input name="to" list="cash-out-recipient-suggestions" required placeholder="Person, supplier, or department"/>{suggestions.to.length>0&&<small className="suggestion-note">Previously used recipients appear as you type.</small>}</label>}
      <label className="wide">Description / Remarks<textarea name="description" rows={4} placeholder="Add optional details about this transaction"/></label></div>
      <datalist id="cash-in-source-suggestions">{suggestions.from.map(value=><option key={value} value={value}/>)}</datalist><datalist id="cash-out-recipient-suggestions">{suggestions.to.map(value=><option key={value} value={value}/>)}</datalist>
      <div className="form-actions"><button type="reset" className="secondary" onClick={()=>{setCategory("");setNewDepartment("");setDepartmentMessage("")}}>Clear Form</button><button className={`primary ${type==="Cash Out"?"danger":""}`}>Save {type}</button></div></form></section>
  </>;
}

function TransactionsPage({transactions,settings,departments,onSave,onDelete}:{transactions:Transaction[];settings:Settings;departments:string[];onSave:(tx:Omit<Transaction,"id">,id?:number)=>Promise<boolean>;onDelete:(id:number)=>void}){
  const [search,setSearch]=useState(""),[type,setType]=useState("All"),[category,setCategory]=useState("All"),[from,setFrom]=useState(""),[to,setTo]=useState(""),[editing,setEditing]=useState<Transaction|null>(null);
  const categories=uniqueValues([...cashInCategories,...cashOutCategories,...departments]);
  const rows=useMemo(()=>transactions.filter(t=>{const q=search.toLowerCase();return (!q||`${t.voucher??""} ${t.description} ${t.category}`.toLowerCase().includes(q))&&(type==="All"||t.type===type)&&(category==="All"||t.category===category)&&(!from||t.date>=from)&&(!to||t.date<=to)}),[transactions,search,type,category,from,to]);
  return <><PageHeading eyebrow="CASH BOOK" title="Transactions" description={`${rows.length} of ${transactions.length} records shown`}/><section className="panel data-panel"><div className="filters"><label className="search">⌕<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Voucher, category, or description"/></label><select value={type} onChange={e=>setType(e.target.value)}><option>All</option><option>Cash In</option><option>Cash Out</option></select><select value={category} onChange={e=>setCategory(e.target.value)}><option>All</option>{categories.map(c=><option key={c}>{c}</option>)}</select><label className="mini-label">From<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label className="mini-label">To<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></div><TransactionTable rows={rows} symbol={settings.currencySymbol} onEdit={setEditing} onDelete={onDelete}/></section>{editing&&<EditModal tx={editing} settings={settings} transactions={transactions} departments={departments} close={()=>setEditing(null)} save={async tx=>{if(await onSave(tx,editing.id))setEditing(null)}}/>}</>;
}

function TransactionTable({rows,symbol,compact=false,onEdit,onDelete}:{rows:Transaction[];symbol:string;compact?:boolean;onEdit?:(t:Transaction)=>void;onDelete?:(id:number)=>void}){return <div className="table-wrap"><table><thead><tr><th>Voucher / Bill No.</th><th>Date</th><th>Type</th><th>Category</th><th>Amount</th>{!compact&&<><th>From</th><th>To</th><th>Description</th><th>Actions</th></>}</tr></thead><tbody>{rows.map(t=><tr key={t.id}><td><strong>{t.type==="Cash In"?"—":t.voucher||"—"}</strong></td><td>{dateLabel(t.date)}</td><td><span className={`type-pill ${t.type==="Cash In"?"in":"out"}`}>{t.type}</span></td><td>{t.category}</td><td className={t.type==="Cash In"?"amount-in":"amount-out"}>{t.type==="Cash In"?"+":"−"}{money(t.amount,symbol)}</td>{!compact&&<><td>{t.from||"—"}</td><td>{t.to||"—"}</td><td className="description-cell">{t.description||"—"}</td><td><div className="row-actions"><button onClick={()=>onEdit?.(t)}>Edit</button><button className="delete" onClick={()=>onDelete?.(t.id)}>Delete</button></div></td></>}</tr>)}</tbody></table>{!rows.length&&<Empty message="No transactions match these filters."/>}</div>}

function EditModal({tx,settings,transactions,departments,close,save}:{tx:Transaction;settings:Settings;transactions:Transaction[];departments:string[];close:()=>void;save:(t:Omit<Transaction,"id">)=>void}){
  const [type,setType]=useState<TxType>(tx.type);
  const suggestions=useMemo(()=>({
    from:uniqueSuggestions(transactions.filter(t=>t.type==="Cash In").map(t=>t.from)),
    to:uniqueSuggestions(transactions.filter(t=>t.type==="Cash Out").map(t=>t.to)),
  }),[transactions]);
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}>
    <form className="modal" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);save({voucher:type==="Cash Out"?String(f.get("voucher")):null,date:String(f.get("date")),type,category:String(f.get("category")),amount:Number(f.get("amount")),from:type==="Cash In"?String(f.get("from")):"",to:type==="Cash Out"?String(f.get("to")):"",description:String(f.get("description"))})}}>
      <div className="modal-head"><div><span className="eyebrow">EDIT RECORD</span><h2>Update transaction</h2></div><button type="button" onClick={close}>×</button></div>
      <div className="form-grid">
        {type==="Cash Out"&&<label>Voucher / Bill Number *<input name="voucher" required defaultValue={tx.voucher||""}/></label>}
        <label>Date *<input name="date" type="date" required defaultValue={tx.date}/></label>
        <label>Type *<select value={type} onChange={e=>setType(e.target.value as TxType)}><option>Cash In</option><option>Cash Out</option></select></label>
        <label>Category *<select name="category" defaultValue={tx.category}>{categoriesFor(type,departments).map(c=><option key={c}>{c}</option>)}</select></label>
        <label>Amount ({settings.currencySymbol}) *<input name="amount" type="number" min="1" required defaultValue={tx.amount}/></label>
        {type==="Cash In"
          ? <label>From *<input name="from" list="edit-cash-in-source-suggestions" required defaultValue={tx.from}/></label>
          : <label>To / Paid To *<input name="to" list="edit-cash-out-recipient-suggestions" required defaultValue={tx.to}/></label>}
        <label className="wide">Description<textarea name="description" defaultValue={tx.description}/></label>
      </div>
      <datalist id="edit-cash-in-source-suggestions">{suggestions.from.map(value=><option key={value} value={value}/>)}</datalist>
      <datalist id="edit-cash-out-recipient-suggestions">{suggestions.to.map(value=><option key={value} value={value}/>)}</datalist>
      <div className="form-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Save Changes</button></div>
    </form>
  </div>
}

function Reports({transactions,settings}:{transactions:Transaction[];settings:Settings}){
  const [report,setReport]=useState("Daily Cash Report"),[date,setDate]=useState(today),[month,setMonth]=useState(today.slice(0,7));
  const rows=transactions.filter(t=>report==="Daily Cash Report"?t.date===date:report==="Monthly Cash Report"||report==="Complete Cash Book"?t.date.startsWith(month):true);
  const totalIn=rows.filter(t=>t.type==="Cash In").reduce((s,t)=>s+t.amount,0),totalOut=rows.filter(t=>t.type==="Cash Out").reduce((s,t)=>s+t.amount,0);
  const categoryRows=(type:TxType)=>Object.entries(transactions.filter(t=>t.type===type&&t.date.startsWith(month)).reduce<Record<string,{count:number,total:number}>>((a,t)=>{a[t.category]??={count:0,total:0};a[t.category].count++;a[t.category].total+=t.amount;return a},{}));
  function exportExcel(){let csv="";if(report.includes("Category-wise")){const data=categoryRows(report.includes("Cash In")?"Cash In":"Cash Out");csv=[["Category","Transactions","Total Amount"],...data.map(([c,v])=>[c,v.count,v.total])].map(r=>r.join(",")).join("\n")}else csv=[["Voucher","Date","Type","Category","Amount","From","To","Description"],...rows.map(t=>[t.type==="Cash In"?"":t.voucher||"",t.date,t.type,t.category,t.amount,t.from,t.to,`"${t.description.replaceAll('"','""')}"`])].map(r=>r.join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=`${report.toLowerCase().replaceAll(" ","-")}.csv`;a.click();URL.revokeObjectURL(a.href)}
  const reports=["Daily Cash Report","Monthly Cash Report","Category-wise Cash In Report","Category-wise Cash Out Report","Complete Cash Book"];
  return <><PageHeading eyebrow="REPORTING" title="Reports" description="Review, print, and export the hospital cash book."/><section className="reports-layout"><aside className="panel report-nav">{reports.map(r=><button key={r} className={report===r?"active":""} onClick={()=>setReport(r)}><span>▤</span>{r}</button>)}</aside><article className="panel report-sheet"><div className="report-toolbar"><div><h2>{report}</h2><p>{settings.hospitalName}</p></div><div className="report-controls">{report==="Daily Cash Report"?<input type="date" value={date} onChange={e=>setDate(e.target.value)}/>:<input type="month" value={month} onChange={e=>setMonth(e.target.value)}/>}<button className="secondary" onClick={()=>window.print()}>⌁ Print</button><button className="primary" onClick={exportExcel}>⇩ Export Excel</button></div></div>{!report.includes("Category-wise")&&<><div className="report-totals"><div><small>Cash In</small><strong className="amount-in">{money(totalIn,settings.currencySymbol)}</strong></div><div><small>Cash Out</small><strong className="amount-out">{money(totalOut,settings.currencySymbol)}</strong></div><div><small>Net Movement</small><strong>{money(totalIn-totalOut,settings.currencySymbol)}</strong></div></div><TransactionTable rows={rows} symbol={settings.currencySymbol}/></>}{report.includes("Category-wise")&&<CategoryReport rows={categoryRows(report.includes("Cash In")?"Cash In":"Cash Out")} symbol={settings.currencySymbol}/>}</article></section></>;
}
function CategoryReport({rows,symbol}:{rows:[string,{count:number;total:number}][];symbol:string}){return <div className="table-wrap"><table><thead><tr><th>Category</th><th>Transactions</th><th>Total Amount</th></tr></thead><tbody>{rows.map(([c,v])=><tr key={c}><td><strong>{c}</strong></td><td>{v.count}</td><td><strong>{money(v.total,symbol)}</strong></td></tr>)}</tbody></table>{!rows.length&&<Empty message="No report data available."/>}</div>}

function Empty({message}:{message:string}){return <div className="empty"><span>▤</span><p>{message}</p></div>}
