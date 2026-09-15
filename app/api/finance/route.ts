import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TransactionType = "Cash In" | "Cash Out";

type TransactionInput = {
  id?: unknown;
  voucher?: unknown;
  date?: unknown;
  type?: unknown;
  category?: unknown;
  amount?: unknown;
  from?: unknown;
  to?: unknown;
  description?: unknown;
};

type DepartmentInput = {
  name?: unknown;
};

type FinanceInput = TransactionInput & DepartmentInput & {
  kind?: unknown;
};

type StoredTransaction = {
  id: number;
  voucher: string | null;
  date: string;
  type: TransactionType;
  category: string;
  amount: number | string;
  from: string;
  to: string;
  description: string;
};

type StoredDepartment = {
  id: number;
  name: string;
};

const transactionSelect =
  "id,voucher,date:transaction_date,type:transaction_type,category,amount,from:source,to:destination,description";
const settingsSelect = "hospitalName:hospital_name,currencySymbol:currency_symbol";
const departmentSelect = "id,name";
const builtInCategoryNames = new Set([
  "Blood", "Donation", "Hospital", "Lab 1", "Lab 2", "Pharma", "Radiology", "Transport",
  "Azadar Clinic", "Vaccine", "ECG", "Small Industry", "Education", "Food & Refreshment",
  "Functions", "Camps", "Investment", "Legal Charges", "Free Medication", "Packages", "Printing",
  "Projects", "Ramadan / Food Packages", "Repair & Maintenance", "Special Persons Payment",
  "Utilities", "Free Vaccines", "Salaries",
].map((name) => name.toLowerCase()));

function configuration() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secretKey) {
    throw new Error("The Supabase server connection has not been configured.");
  }

  return { url, secretKey };
}

async function requestSupabase(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const { url, secretKey } = configuration();
  const headers = new Headers(init.headers);
  headers.set("apikey", secretKey);
  headers.set("authorization", `Bearer ${secretKey}`);
  headers.set("accept", "application/json");

  if (init.body) {
    headers.set("content-type", "application/json");
  }

  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseTransaction(input: TransactionInput) {
  const type = input.type === "Cash In" || input.type === "Cash Out" ? input.type : null;
  const date = text(input.date);
  const category = text(input.category);
  const amount = Number(input.amount);
  const voucher = text(input.voucher);
  const source = text(input.from);
  const destination = text(input.to);
  const description = text(input.description);

  if (!type || !date || !category || !Number.isFinite(amount) || amount <= 0) {
    return { error: "Date, category, and a valid amount are required." } as const;
  }

  if (type === "Cash In" && !source) {
    return { error: "Cash In source is required." } as const;
  }

  if (type === "Cash Out" && (!voucher || !destination)) {
    return { error: "Cash Out voucher / bill number and paid-to details are required." } as const;
  }

  return {
    value: {
      voucher: type === "Cash Out" ? voucher : null,
      transaction_date: date,
      transaction_type: type,
      category,
      amount,
      source: type === "Cash In" ? source : "",
      destination: type === "Cash Out" ? destination : "",
      description,
    },
  } as const;
}

function parseDepartment(input: DepartmentInput) {
  const name = text(input.name).replace(/\s+/g, " ");
  if (!name) return { error: "Department name is required." } as const;
  if (name.length > 80) return { error: "Department name must be 80 characters or fewer." } as const;
  if (builtInCategoryNames.has(name.toLowerCase())) {
    return { error: "This department is already in the list." } as const;
  }
  return { value: { name } } as const;
}

function normalizeTransaction(transaction: StoredTransaction) {
  return { ...transaction, amount: Number(transaction.amount) };
}

async function errorFrom(response: Response, duplicateMessage = "Cash Out voucher / bill number must be unique.") {
  const fallback = response.status === 409
    ? duplicateMessage
    : "The database request could not be completed.";

  try {
    const data = (await response.json()) as { message?: string; details?: string; code?: string };
    if (data.code === "23505") return duplicateMessage;
    return data.message ?? data.details ?? fallback;
  } catch {
    return fallback;
  }
}

export async function GET() {
  try {
    const query = new URLSearchParams({
      select: transactionSelect,
      order: "transaction_date.desc,id.desc",
    });
    const settingsQuery = new URLSearchParams({ select: settingsSelect, id: "eq.1" });
    const departmentsQuery = new URLSearchParams({ select: departmentSelect, order: "name.asc" });
    const [transactionsResponse, settingsResponse, departmentsResponse] = await Promise.all([
      requestSupabase(`cash_transactions?${query}`),
      requestSupabase(`cash_settings?${settingsQuery}`),
      requestSupabase(`cash_departments?${departmentsQuery}`),
    ]);

    if (!transactionsResponse.ok) {
      return NextResponse.json({ error: await errorFrom(transactionsResponse) }, { status: transactionsResponse.status });
    }

    if (!settingsResponse.ok) {
      return NextResponse.json({ error: await errorFrom(settingsResponse) }, { status: settingsResponse.status });
    }

    if (!departmentsResponse.ok) {
      return NextResponse.json({ error: await errorFrom(departmentsResponse, "This department already exists.") }, { status: departmentsResponse.status });
    }

    const transactions = (await transactionsResponse.json()) as StoredTransaction[];
    const settings = (await settingsResponse.json()) as Array<{
      hospitalName: string;
      currencySymbol: string;
    }>;
    const departments = (await departmentsResponse.json()) as StoredDepartment[];

    return NextResponse.json({
      transactions: transactions.map(normalizeTransaction),
      settings: settings[0] ?? { hospitalName: "HBB Hospital", currencySymbol: "Rs." },
      departments: departments.map((department) => department.name),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The database connection could not be established.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function createDepartment(input: DepartmentInput) {
  const parsed = parseDepartment(input);
  if ("error" in parsed) return NextResponse.json(parsed, { status: 400 });

  const response = await requestSupabase(`cash_departments?select=${encodeURIComponent(departmentSelect)}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(parsed.value),
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: await errorFrom(response, "This department already exists.") },
      { status: response.status },
    );
  }

  const rows = (await response.json()) as StoredDepartment[];
  return NextResponse.json({ department: rows[0] }, { status: 201 });
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as FinanceInput;
    if (input.kind === "department") return await createDepartment(input);

    const parsed = parseTransaction(input);
    if ("error" in parsed) return NextResponse.json(parsed, { status: 400 });

    const response = await requestSupabase(`cash_transactions?select=${encodeURIComponent(transactionSelect)}`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(parsed.value),
    });

    if (!response.ok) return NextResponse.json({ error: await errorFrom(response) }, { status: response.status });

    const rows = (await response.json()) as StoredTransaction[];
    return NextResponse.json({ transaction: normalizeTransaction(rows[0]) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The transaction could not be saved.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const input = (await request.json()) as TransactionInput;
    const id = Number(input.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json({ error: "A valid transaction id is required." }, { status: 400 });
    }

    const parsed = parseTransaction(input);
    if ("error" in parsed) return NextResponse.json(parsed, { status: 400 });

    const response = await requestSupabase(`cash_transactions?id=eq.${id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(parsed.value),
    });

    if (!response.ok) return NextResponse.json({ error: await errorFrom(response) }, { status: response.status });

    const rows = (await response.json()) as StoredTransaction[];
    if (!rows[0]) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
    return NextResponse.json({ transaction: normalizeTransaction(rows[0]) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The transaction could not be updated.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json({ error: "A valid transaction id is required." }, { status: 400 });
    }

    const response = await requestSupabase(`cash_transactions?id=eq.${id}`, {
      method: "DELETE",
      headers: { Prefer: "return=representation" },
    });

    if (!response.ok) return NextResponse.json({ error: await errorFrom(response) }, { status: response.status });

    const rows = (await response.json()) as StoredTransaction[];
    if (!rows[0]) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The transaction could not be deleted.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
