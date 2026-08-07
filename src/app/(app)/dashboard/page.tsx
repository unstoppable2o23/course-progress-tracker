"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { searchStudentsAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { StudentView } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentView[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    searchStudentsAction("").then(setResults);
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      const r = await searchStudentsAction(query);
      setResults(r);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Search students by name, email, or phone.</p>
      </div>

      <Input
        placeholder="Search by name, email, or phone..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="max-w-md"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {loading ? "Searching..." : `${results.length} result(s)`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Master Status</th>
                  <th className="px-4 py-3 font-medium">UCLA</th>
                  <th className="px-4 py-3 font-medium">Live Sessions</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {results.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.name}</div>
                      {s.advisor && <div className="text-xs text-muted-foreground">{s.advisor}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div>{s.primary_email}</div>
                      <div className="text-xs text-muted-foreground">{s.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      {s.is_expired_180 ? (
                        <Badge variant="warning">Expired (180d)</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.ucla_enrollments?.length ? (
                        <Badge variant="success">{s.ucla_enrollments.length}× enrolled</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={s.live_sessions_completed === 3 ? "success" : "outline"}>
                        {s.live_sessions_completed}/3
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/${s.id}`)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
                {!results.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No students found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

