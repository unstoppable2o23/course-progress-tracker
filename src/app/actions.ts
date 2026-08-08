"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/app/auth-actions";
import { createServerClient } from "@/lib/supabase/server";
import { parseBlob } from "@/lib/sync/parse";
import { runSync, type SourceConfig, type SyncResult } from "@/lib/sync/engine";
import { LIVE_SESSIONS } from "@/lib/utils";

export type UploadState = { ok?: boolean; error?: string; rows?: number };

export async function uploadSourceAction(
  _prev: UploadState,
  formData: FormData
): Promise<UploadState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Not authorized. Please log in as admin." };
  }

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file selected." };

  const type = String(formData.get("type")) as "master" | "ucla" | "live";
  const name = String(formData.get("name") || "").trim();
  const emailColumn = String(formData.get("emailColumn") || "").trim();
  const phoneColumn = String(formData.get("phoneColumn") || "").trim();
  const nameColumn = String(formData.get("nameColumn") || "").trim();
  const dateColumn = String(formData.get("dateColumn") || "").trim();
  const statusColumn = String(formData.get("statusColumn") || "").trim();
  const interestColumn = String(formData.get("interestColumn") || "").trim();
  const advisorColumn = String(formData.get("advisorColumn") || "").trim();

  if (!name || !emailColumn) return { error: "Name and email column are required." };

  const supabase = await createServerClient();

  // Upload to Supabase Storage (no size limit)
  const filePath = `${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("uploads")
    .upload(filePath, file, { upsert: true });
  if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

  // Download and parse
  const { data: fileData, error: dlError } = await supabase.storage
    .from("uploads")
    .download(filePath);
  if (dlError || !fileData) return { error: `Download failed: ${dlError?.message}` };

  const blob = fileData;
  const parsed = await parseBlob(blob, file.name);
  if (!parsed.rows.length) return { error: "No data rows found." };

  // Create source record
  const { data: source, error: srcError } = await supabase
    .from("sources")
    .insert({ name, type, file_name: file.name })
    .select()
    .single();
  if (srcError) return { error: `Database error: ${srcError.message}` };

  const config: SourceConfig = {
    sourceId: source.id,
    name,
    type,
    rows: parsed.rows,
    emailColumn,
    phoneColumn,
    nameColumn,
    dateColumn,
    statusColumn,
    interestColumn,
    advisorColumn,
    batchMeta: parsed.batchMeta,
  };

  let result: SyncResult;
  try {
    result = await runSync([config]);
  } catch (e) {
    return { error: `Sync failed: ${e instanceof Error ? e.message : String(e)}` };
  }

  revalidatePath("/dashboard");
  revalidatePath("/sources");

  if (result.errors.length) {
    return { ok: true, rows: result.rowsRead, error: `${result.errors.length} row(s) had errors.` };
  }
  return { ok: true, rows: result.rowsRead };
}

export async function runFullSyncAction(): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await createServerClient();

  const { data: sources } = await supabase.from("sources").select("*");
  if (!sources?.length) return { ok: false, error: "No sources configured." };

  // For now, re-sync from the most recent upload per type.
  // Full reload would re-parse stored rows — simplified here.
  revalidatePath("/dashboard");
  return { ok: true };
}

// ── User Management ──────────────────────────────────────────────────

export async function listUsersAction() {
  await requireAdmin();
  const supabase = await createServerClient();
  const { data } = await supabase.from("app_users").select("*").order("created_at");
  return data ?? [];
}

export async function createUserAction(_prev: { error?: string }, formData: FormData) {
  await requireAdmin();
  const email = String(formData.get("email") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const role = String(formData.get("role") || "staff");
  if (!email || !name) return { error: "Email and name required." };

  const supabase = await createServerClient();
  const { error } = await supabase.from("app_users").insert({ email, name, role });
  if (error) return { error: error.message };
  revalidatePath("/users");
  return {};
}

export async function toggleUserAction(id: string, isActive: boolean) {
  await requireAdmin();
  const supabase = await createServerClient();
  await supabase.from("app_users").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/users");
}

export async function searchStudentsAction(query: string) {
  await requireUser();
  const supabase = await createServerClient();
  const q = query.trim().toLowerCase();
  if (!q) {
    const { data } = await supabase.from("student_view").select("*").limit(50);
    return data ?? [];
  }
  const { data } = await supabase
    .from("student_view")
    .select("*")
    .or(`name.ilike.%${q}%,primary_email.ilike.%${q}%,phone.ilike.%${q}%`)
    .limit(50);
  return data ?? [];
}
