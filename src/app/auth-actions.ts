"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export async function loginAction(_prev: { error?: string }, formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Invalid email or password." };
  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requireUser() {
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return data.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("app_users")
    .select("role")
    .eq("email", user.email)
    .single();
  if (data?.role !== "admin") redirect("/dashboard");
  return user;
}
