"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/auth-actions";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/upload", label: "Upload", adminOnly: true },
  { href: "/users", label: "Users", adminOnly: true },
];

export function AppShell({ children, role }: { children: ReactNode; role: string }) {
  const pathname = usePathname();
  const isAdmin = role === "admin";

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-card p-4 hidden flex-col md:flex">
        <div className="mb-6 px-2">
          <h2 className="text-lg font-semibold">Progress Tracker</h2>
          <p className="text-xs text-muted-foreground capitalize">{role}</p>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                {item.label}
              </Link>
            ))}
        </nav>
        <form action={logoutAction}>
          <button className="w-full rounded-md px-3 py-2 text-sm text-left text-muted-foreground hover:bg-accent">
            Sign out
          </button>
        </form>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
