import { env } from "cloudflare:workers";
type Db=D1Database;
async function initialize(db:Db){
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS cash_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT,voucher TEXT UNIQUE,date TEXT NOT NULL,type TEXT NOT NULL,category TEXT NOT NULL,amount REAL NOT NULL,source TEXT NOT NULL,destination TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_cash_transactions_date_type ON cash_transactions(date,type)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS cash_settings (id INTEGER PRIMARY KEY CHECK(id=1),hospital_name TEXT NOT NULL,currency_symbol TEXT NOT NULL)`),
  ]);
  await db.prepare("INSERT OR IGNORE INTO cash_settings(id,hospital_name,currency_symbol) VALUES(1,'HBB Hospital','Rs.')").run();
  const txCount=await db.prepare("SELECT COUNT(*) total FROM cash_transactions").first<{total:number}>();
  if(!txCount?.total) await db.batch([
    ["HBB-260805-01","2026-08-05","Cash In","Hospital",185000,"Patient collections","Hospital Cash Counter","Morning counter collection"],
    ["HBB-260805-02","2026-08-05","Cash In","Pharma",96500,"Pharmacy sales","Pharmacy Cash Counter","Daily cash sales"],
    ["HBB-260805-03","2026-08-05","Cash Out","Utilities",68500,"Bank Account","K-Electric","Electricity bill"],
    ["HBB-260804-06","2026-08-04","Cash In","Donation",250000,"Community donor","Main Cash","General hospital donation"],
    ["HBB-260804-07","2026-08-04","Cash Out","Free Medication",124000,"Main Cash","Al-Shifa Medical Store","Medicines for welfare patients"],
    ["HBB-260803-04","2026-08-03","Cash In","Lab 1",118750,"Lab collections","Lab Cash Counter","Lab test receipts"],
  ].map(v=>db.prepare("INSERT INTO cash_transactions(voucher,date,type,category,amount,source,destination,description) VALUES(?,?,?,?,?,?,?,?)").bind(...v)));
  await db.prepare("PRAGMA optimize").run();
}
const txSelect="id,voucher,date,type,category,amount,source AS 'from',destination AS 'to',description";
export async function GET(){const db=env.DB;await initialize(db);const [transactions,settings]=await Promise.all([db.prepare(`SELECT ${txSelect} FROM cash_transactions ORDER BY date DESC,id DESC`).all(),db.prepare("SELECT hospital_name AS hospitalName,currency_symbol AS currencySymbol FROM cash_settings WHERE id=1").first()]);return Response.json({transactions:transactions.results,settings});}
export async function POST(request:Request){const db=env.DB;await initialize(db);const b=await request.json() as Record<string,unknown>;if(!b.date||!b.type||!b.category||!b.amount||(b.type==="Cash In"&&!b.from)||(b.type==="Cash Out"&&(!b.voucher||!b.to)))return Response.json({error:"All required fields must be completed"},{status:400});try{const transaction=await db.prepare(`INSERT INTO cash_transactions(voucher,date,type,category,amount,source,destination,description) VALUES(?,?,?,?,?,?,?,?) RETURNING ${txSelect}`).bind(b.type==="Cash Out"?String(b.voucher).trim():null,b.date,b.type,b.category,Number(b.amount),b.type==="Cash In"?String(b.from).trim():"",b.type==="Cash Out"?String(b.to).trim():"",String(b.description||"").trim()).first();return Response.json({transaction},{status:201})}catch{return Response.json({error:"Cash Out voucher / bill number must be unique"},{status:409})}}
export async function PUT(request:Request){const db=env.DB;await initialize(db);const b=await request.json() as Record<string,unknown>;if(!b.id)return Response.json({error:"Transaction id is required"},{status:400});if(b.type==="Cash In"&&!b.from)return Response.json({error:"Cash source is required"},{status:400});if(b.type==="Cash Out"&&(!b.voucher||!b.to))return Response.json({error:"Cash Out voucher and recipient are required"},{status:400});try{await db.prepare("UPDATE cash_transactions SET voucher=?,date=?,type=?,category=?,amount=?,source=?,destination=?,description=? WHERE id=?").bind(b.type==="Cash Out"?String(b.voucher).trim():null,b.date,b.type,b.category,Number(b.amount),b.type==="Cash In"?String(b.from).trim():"",b.type==="Cash Out"?String(b.to).trim():"",String(b.description||"").trim(),b.id).run();return Response.json({ok:true})}catch{return Response.json({error:"Cash Out voucher / bill number must be unique"},{status:409})}}
export async function DELETE(request:Request){const db=env.DB;await initialize(db);const id=Number(new URL(request.url).searchParams.get("id"));if(!id)return Response.json({error:"Valid id is required"},{status:400});await db.prepare("DELETE FROM cash_transactions WHERE id=?").bind(id).run();return Response.json({ok:true});}
