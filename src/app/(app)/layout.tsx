import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/app/auth-actions";
import { createServerClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const supabase = await createServerClient();
  const { data: appUser } = await supabase
    .from("app_users")
    .select("role, is_active")
    .eq("email", user.email)
    .single();

  if (!appUser?.is_active) redirect("/login");

  return <AppShell role={appUser.role}>{children}</AppShell>;
}
