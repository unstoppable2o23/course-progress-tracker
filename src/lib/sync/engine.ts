import "server-only";
import { createServerClient } from "@/lib/supabase/server";
import {
  normalizeEmail,
  normalizeName,
  normalizePhone,
} from "@/lib/utils";
import { LIVE_SESSIONS } from "@/lib/utils";

type Row = Record<string, string>;

interface MatchResult {
  studentId: string;
  created: boolean;
  matchedByPhone: boolean;
}

async function loadContext(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const { data: students } = await supabase
    .from("students")
    .select("id, name, primary_email, phone");

  const studentById = new Map<string, { id: string; name: string; primary_email?: string; phone?: string }>();
  const emailToId = new Map<string, string>();
  const phoneToId = new Map<string, string>();
  const nameToId = new Map<string, string>();

  for (const s of students ?? []) {
    studentById.set(s.id, s);
    if (s.primary_email) emailToId.set(normalizeEmail(s.primary_email), s.id);
    if (s.phone) phoneToId.set(normalizePhone(s.phone), s.id);
    if (s.name) nameToId.set(normalizeName(s.id), s.id);
  }

  return { studentById, emailToId, phoneToId, nameToId };
}

function findMatch(
  row: Row,
  emailCol: string,
  phoneCol: string,
  nameCol: string,
  ctx: Awaited<ReturnType<typeof loadContext>>
): { studentId?: string; matchedByPhone: boolean } {
  const email = normalizeEmail(row[emailCol] ?? row[findKey(row, emailCol)]);
  const phone = normalizePhone(row[phoneCol] ?? row[findKey(row, phoneCol)]);
  const name = row[nameCol] ?? row[findKey(row, nameCol)];

  if (email && ctx.emailToId.has(email)) {
    return { studentId: ctx.emailToId.get(email), matchedByPhone: false };
  }
  if (phone && ctx.phoneToId.has(phone)) {
    return { studentId: ctx.phoneToId.get(phone), matchedByPhone: true };
  }
  const nameKey = normalizeName(name);
  if (nameKey && ctx.nameToId.has(nameKey)) {
    return { studentId: ctx.nameToId.get(nameKey), matchedByPhone: false };
  }
  return { matchedByPhone: false };
}

function findKey(row: Row, header: string): string {
  if (!header) return "";
  const lower = header.toLowerCase();
  return Object.keys(row).find((k) => k.toLowerCase() === lower) ?? header;
}

function extractCell(row: Row, header: string | undefined): string {
  if (!header) return "";
  const key = findKey(row, header);
  return row[key] ?? "";
}

export interface SyncResult {
  sourcesProcessed: number;
  rowsRead: number;
  studentsUpdated: number;
  newStudents: number;
  errors: string[];
}

export interface SourceConfig {
  sourceId: string;
  name: string;
  type: "master" | "ucla" | "live";
  rows: Row[];
  emailColumn?: string;
  phoneColumn?: string;
  nameColumn?: string;
  dateColumn?: string;
  statusColumn?: string;
  interestColumn?: string;
  advisorColumn?: string;
  amountColumn?: string;
  feeColumn?: string;
  installmentColumn?: string;
  batchMeta?: { title: string; startDate: string; endDate: string };
}

export async function runSync(configs: SourceConfig[]): Promise<SyncResult> {
  const supabase = await createServerClient();
  const result: SyncResult = {
    sourcesProcessed: 0,
    rowsRead: 0,
    studentsUpdated: 0,
    newStudents: 0,
    errors: [],
  };

  const log = await supabase.from("sync_logs").insert({ status: "running" }).select().single();
  const logId = log.data?.id;

  const ctx = await loadContext(supabase);

  const newStudents: {
    id: string; name: string; primary_email?: string; phone?: string; advisor?: string;
    sales_type?: string; payment_date?: string; sale_month?: string; installment?: string;
    amount?: number; payment_mode?: string; full_course_fee?: number; source_id?: string;
  }[] = [];
  const newAliases: { student_id: string; email?: string; phone?: string; source: string }[] = [];
  const patches: { id: string; phone?: string; advisor?: string; sales_type?: string; payment_date?: string }[] = [];
  const uclaRows: { student_id?: string; email?: string; phone?: string; full_name?: string; interest_flag?: string; batch_title?: string; batch_start_date?: string; batch_end_date?: string; form_timestamp?: string; source_id: string }[] = [];
  const liveRows: { student_id?: string; session_name: string; attended_at?: string; source_id: string }[] = [];
  const seenStudents = new Set<string>();

  const uid = () => crypto.randomUUID();

  for (const cfg of configs) {
    try {
      result.sourcesProcessed += 1;
      for (const row of cfg.rows) {
        result.rowsRead += 1;

        const email = extractCell(row, cfg.emailColumn);
        const phone = extractCell(row, cfg.phoneColumn);
        const name = extractCell(row, cfg.nameColumn);

        if (!email && !phone && !name) {
          result.errors.push(`${cfg.name}: row missing identity fields`);
          continue;
        }

        // Find or create student
        const match = findMatch(row, cfg.emailColumn || "", cfg.phoneColumn || "", cfg.nameColumn || "", ctx);
        let studentId = match.studentId;
        let created = false;

        if (!studentId) {
          studentId = uid();
          created = true;
          newStudents.push({
            id: studentId,
            name: name || email || "Unknown",
            primary_email: email || undefined,
            phone: normalizePhone(phone) || undefined,
            source_id: cfg.sourceId,
          });
          ctx.studentById.set(studentId, { id: studentId, name, primary_email: email, phone });
          if (email) ctx.emailToId.set(normalizeEmail(email), studentId);
          if (phone) ctx.phoneToId.set(normalizePhone(phone), studentId);
          if (name) ctx.nameToId.set(normalizeName(name), studentId);
          result.newStudents += 1;
        }

        if (!created) {
          const student = ctx.studentById.get(studentId)!;
          // Alias tracking: if matched by name but contact differs
          if (email && normalizeEmail(email) !== normalizeEmail(student.primary_email ?? "")) {
            newAliases.push({ student_id: studentId, email, source: cfg.name });
          }
          if (phone && normalizePhone(phone) !== normalizePhone(student.phone ?? "")) {
            newAliases.push({ student_id: studentId, phone: normalizePhone(phone), source: cfg.name });
          }
        }

        // Type-specific logic
        if (cfg.type === "master") {
          const advisor = extractCell(row, cfg.advisorColumn);
          const paymentDate = extractCell(row, cfg.dateColumn);
          patches.push({
            id: studentId,
            advisor: advisor || undefined,
            payment_date: paymentDate || undefined,
          });
          seenStudents.add(studentId);
        }

        if (cfg.type === "ucla") {
          const ts = extractCell(row, cfg.statusColumn);
          const interest = extractCell(row, cfg.interestColumn);
          uclaRows.push({
            student_id: studentId,
            email: email || undefined,
            phone: phone || undefined,
            full_name: name || undefined,
            interest_flag: interest || undefined,
            batch_title: cfg.batchMeta?.title,
            batch_start_date: cfg.batchMeta?.startDate,
            batch_end_date: cfg.batchMeta?.endDate,
            form_timestamp: ts || undefined,
            source_id: cfg.sourceId,
          });
          seenStudents.add(studentId);
        }

        if (cfg.type === "live") {
          const sessionValue = extractCell(row, cfg.statusColumn);
          const sessionName = LIVE_SESSIONS.find(
            (s) => s.toLowerCase() === sessionValue.trim().toLowerCase()
          );
          if (sessionName) {
            const ts = extractCell(row, cfg.dateColumn);
            liveRows.push({
              student_id: studentId,
              session_name: sessionName,
              attended_at: ts || undefined,
              source_id: cfg.sourceId,
            });
          }
          seenStudents.add(studentId);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`${cfg.name}: ${msg}`);
    }
  }

  // Flush
  try {
    if (newStudents.length) await supabase.from("students").insert(newStudents);
    if (newAliases.length) await supabase.from("student_aliases").insert(newAliases);
    if (uclaRows.length) await supabase.from("ucla_enrollments").insert(uclaRows);
    if (liveRows.length) await supabase.from("live_sessions").upsert(liveRows, { onConflict: "student_id,session_name" });
    for (const p of patches) {
      await supabase.from("students").update(p).eq("id", p.id);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Writing results: ${msg}`);
  }

  result.studentsUpdated = seenStudents.size;
  const status = result.errors.length ? "partial" : "success";
  if (logId) {
    await supabase.from("sync_logs").update({ status, ...result, ended_at: new Date().toISOString() }).eq("id", logId);
  }

  return result;
}
