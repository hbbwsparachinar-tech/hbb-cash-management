import { env } from "cloudflare:workers";

type Db = D1Database;

async function initialize(db: Db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      department TEXT NOT NULL,
      type TEXT NOT NULL,
      method TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS transactions_date_idx ON transactions (date DESC)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request TEXT NOT NULL,
      department TEXT NOT NULL,
      requester TEXT NOT NULL,
      amount REAL NOT NULL,
      age TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending'
    )`),
  ]);

  const count = await db.prepare("SELECT COUNT(*) AS total FROM transactions").first<{ total: number }>();
  if (!count?.total) {
    await db.batch([
      db.prepare("INSERT INTO transactions (reference,date,description,department,type,method,amount,status) VALUES (?,?,?,?,?,?,?,?)").bind("RC-240801","2026-08-02","Patient counter collections","Outpatient","Receipt","Cash",382450,"Cleared"),
      db.prepare("INSERT INTO transactions (reference,date,description,department,type,method,amount,status) VALUES (?,?,?,?,?,?,?,?)").bind("RC-240802","2026-08-02","Insurance remittance — Jubilee","Insurance","Receipt","Bank",714200,"Cleared"),
      db.prepare("INSERT INTO transactions (reference,date,description,department,type,method,amount,status) VALUES (?,?,?,?,?,?,?,?)").bind("PV-240319","2026-08-02","Emergency medicines restock","Pharmacy","Payment","Bank",246800,"Pending"),
      db.prepare("INSERT INTO transactions (reference,date,description,department,type,method,amount,status) VALUES (?,?,?,?,?,?,?,?)").bind("PV-240318","2026-08-01","CT scanner preventive maintenance","Radiology","Payment","Cheque",185000,"Flagged"),
      db.prepare("INSERT INTO transactions (reference,date,description,department,type,method,amount,status) VALUES (?,?,?,?,?,?,?,?)").bind("RC-240799","2026-08-01","Inpatient discharge settlements","Inpatient","Receipt","Card",493600,"Cleared"),
      db.prepare("INSERT INTO transactions (reference,date,description,department,type,method,amount,status) VALUES (?,?,?,?,?,?,?,?)").bind("PV-240316","2026-08-01","Oxygen cylinder supply","ICU","Payment","Bank",128400,"Cleared"),
    ]);
  }
  const approvalCount = await db.prepare("SELECT COUNT(*) AS total FROM approvals").first<{ total: number }>();
  if (!approvalCount?.total) {
    await db.batch([
      db.prepare("INSERT INTO approvals (request,department,requester,amount,age) VALUES (?,?,?,?,?)").bind("Dialysis consumables","Nephrology","Dr. Nadia Khan",284000,"18 min"),
      db.prepare("INSERT INTO approvals (request,department,requester,amount,age) VALUES (?,?,?,?,?)").bind("Generator fuel advance","Facilities","Ahsan Malik",165000,"46 min"),
      db.prepare("INSERT INTO approvals (request,department,requester,amount,age) VALUES (?,?,?,?,?)").bind("Surgical implant payment","Operating Theatre","Dr. Faraz Ali",438500,"2 hr"),
    ]);
  }
}

export async function GET() {
  const db = env.DB;
  await initialize(db);
  const [transactions, approvals] = await Promise.all([
    db.prepare("SELECT id, reference, date, description, department, type, method, amount, status FROM transactions ORDER BY date DESC, id DESC LIMIT 100").all(),
    db.prepare("SELECT id, request, department, requester, amount, age FROM approvals WHERE status = 'Pending' ORDER BY id").all(),
  ]);
  return Response.json({ transactions: transactions.results, approvals: approvals.results });
}

export async function POST(request: Request) {
  const db = env.DB;
  await initialize(db);
  const body = await request.json() as { description?: string; department?: string; type?: string; method?: string; amount?: number };
  if (!body.description?.trim() || !body.department || !body.type || !body.amount || body.amount <= 0) return Response.json({ error: "Valid transaction details are required" }, { status: 400 });
  const reference = `${body.type === "Receipt" ? "RC" : "PV"}-${String(Date.now()).slice(-6)}`;
  const result = await db.prepare("INSERT INTO transactions (reference,date,description,department,type,method,amount,status) VALUES (?,?,?,?,?,?,?,?) RETURNING id, reference, date, description, department, type, method, amount, status")
    .bind(reference, "2026-08-02", body.description.trim(), body.department, body.type, body.method || "Cash", body.amount, "Pending").first();
  return Response.json({ transaction: result }, { status: 201 });
}

export async function PATCH(request: Request) {
  const db = env.DB;
  await initialize(db);
  const body = await request.json() as { id?: number };
  if (!body.id) return Response.json({ error: "Approval id is required" }, { status: 400 });
  await db.prepare("UPDATE approvals SET status = 'Approved' WHERE id = ?").bind(body.id).run();
  return Response.json({ ok: true });
}
