import { createServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/app/auth-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LIVE_SESSIONS } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: student } = await supabase.from("student_view").select("*").eq("id", id).single();

  if (!student) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Student not found</h1>
        <Link href="/dashboard"><Button variant="outline">Back</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{student.name}</h1>
          <p className="text-sm text-muted-foreground">{student.primary_email} · {student.phone}</p>
        </div>
        <Link href="/dashboard"><Button variant="outline">Back</Button></Link>
      </div>

      {/* Master */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Master Sheet
            {student.is_expired_180 ? (
              <Badge variant="warning">180 Days Expired</Badge>
            ) : (
              <Badge variant="success">Active</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Advisor" value={student.advisor} />
          <Field label="Sales Type" value={student.sales_type} />
          <Field label="Payment Date" value={student.payment_date} />
          <Field label="Days Elapsed" value={student.days_since_payment != null ? `${student.days_since_payment}` : "—"} />
          <Field label="Instalment" value={student.installment} />
          <Field label="Amount" value={student.amount != null ? `₹${student.amount.toLocaleString("en-IN")}` : "—"} />
          <Field label="Payment Mode" value={student.payment_mode} />
          <Field label="Full Course Fee" value={student.full_course_fee != null ? `₹${student.full_course_fee.toLocaleString("en-IN")}` : "—"} />
          <Field label="Welcome Call" value={student.welcome_call_done ? "Done" : "Pending"} />
          <Field label="Certificate" value={student.certificate_received ? "Received" : "Pending"} />
        </CardContent>
      </Card>

      {/* UCLA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">UCLA Extension</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {student.ucla_enrollments?.length ? (
            student.ucla_enrollments.map((u: { batch_title?: string; batch_start?: string; batch_end?: string; timestamp?: string; interest?: string }, i: number) => (
              <div key={i} className="rounded-md border p-3 text-sm space-y-1">
                <div className="font-medium">{u.batch_title || "UCLA Enrollment"}</div>
                <div className="text-muted-foreground text-xs">
                  {u.batch_start} → {u.batch_end}
                </div>
                <div className="flex gap-3 text-xs">
                  <span>Interest: <strong>{u.interest || "—"}</strong></span>
                  <span>Submitted: {u.timestamp ? new Date(u.timestamp).toLocaleString() : "—"}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No UCLA enrollments.</p>
          )}
        </CardContent>
      </Card>

      {/* Live Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live Sessions ({student.live_sessions_completed}/3)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {LIVE_SESSIONS.map((session) => {
            const attended = student.live_sessions?.[session];
            return (
              <div key={session} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <span>{session}</span>
                {attended ? (
                  <Badge variant="success">{new Date(attended).toLocaleString()}</Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Aliases */}
      {student.aliases?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linked Contacts (Aliases)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {student.aliases.map((a: { email?: string; phone?: string; source: string }, i: number) => (
              <div key={i} className="flex gap-4 text-sm">
                {a.email && <span>{a.email}</span>}
                {a.phone && <span>{a.phone}</span>}
                <Badge variant="outline">{a.source}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}
