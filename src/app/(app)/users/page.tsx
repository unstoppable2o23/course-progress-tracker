"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { listUsersAction, createUserAction, toggleUserAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AppUser } from "@/lib/types";

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [state, action, pending] = useActionState(createUserAction, {});

  useEffect(() => {
    listUsersAction().then(setUsers);
  }, []);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">Manage staff access (up to 10 users).</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="font-medium text-sm">{u.name}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{u.role}</Badge>
                <Badge variant={u.is_active ? "success" : "destructive"}>
                  {u.is_active ? "Active" : "Disabled"}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await toggleUserAction(u.id, !u.is_active);
                    setUsers(await listUsersAction());
                  }}
                >
                  {u.is_active ? "Disable" : "Enable"}
                </Button>
              </div>
            </div>
          ))}
          {!users.length && <p className="text-sm text-muted-foreground">No users yet.</p>}
        </CardContent>
      </Card>

      <form action={action}>
        <Card>
          <CardContent className="space-y-4 pt-6">
            <h2 className="font-medium">Add User</h2>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input name="name" required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select name="role" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
            <Button type="submit" disabled={pending}>Create User</Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

