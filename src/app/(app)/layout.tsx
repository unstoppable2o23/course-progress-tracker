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
    .maybeSingle();

  if (!appUser?.is_active) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold">Access Pending</h1>
          <p className="text-sm text-muted-foreground">
            Your account ({user.email}) is not active. Contact an administrator.
          </p>
        </div>
      </main>
    );
  }

  return <AppShell role={appUser.role}>{children}</AppShell>;
}
