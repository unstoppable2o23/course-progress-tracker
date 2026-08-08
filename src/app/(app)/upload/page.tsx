"use client";

import { useState } from "react";
import { useActionState } from "react";
import { previewUploadAction, type PreviewState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const columnHints = ["email", "phone", "mobile", "name", "date", "timestamp", "session", "interest", "advisor", "payment", "amount", "fee", "instalment", "installment", "batch", "sale", "lead", "contact", "address", "city", "state", "country", "pincode", "pin", "certificate", "welcome", "psychometric"];

function autoDetect(headers: string[], field: string): string {
  const lower = field.toLowerCase();
  for (const h of headers) {
    const hl = h.toLowerCase();
    if (lower === "email" && (hl.includes("email") || hl.includes("e-mail"))) return h;
    if (lower === "phone" && (hl.includes("phone") || hl.includes("mobile") || hl.includes("contact"))) return h;
    if (lower === "name" && (hl.includes("name") || hl.includes("participant"))) return h;
    if (lower === "date" && (hl.includes("date") || hl.includes("payment date"))) return h;
    if (lower === "timestamp" && (hl.includes("timestamp") || hl.includes("time"))) return h;
    if (lower === "session" && (hl.includes("session") || hl.includes("live"))) return h;
    if (lower === "interest" && hl.includes("interest")) return h;
    if (lower === "advisor" && hl.includes("advisor")) return h;
    if (lower === "amount" && hl.includes("amount")) return h;
    if (lower === "fee" && hl.includes("fee")) return h;
    if ((lower === "instalment" || lower === "installment") && hl.includes("instal")) return h;
  }
  return "";
}

const fieldConfig = {
  master: [
    { key: "emailColumn", label: "Email column" },
    { key: "phoneColumn", label: "Phone column" },
    { key: "nameColumn", label: "Name column" },
    { key: "dateColumn", label: "Payment date column" },
    { key: "advisorColumn", label: "Advisor column" },
  ],
  ucla: [
    { key: "emailColumn", label: "Email column" },
    { key: "phoneColumn", label: "Phone column" },
    { key: "nameColumn", label: "Name column" },
    { key: "statusColumn", label: "Timestamp column" },
    { key: "interestColumn", label: "Interest column" },
  ],
  live: [
    { key: "emailColumn", label: "Email column" },
    { key: "phoneColumn", label: "Phone column" },
    { key: "nameColumn", label: "Name column" },
    { key: "statusColumn", label: "Session column" },
    { key: "dateColumn", label: "Timestamp column" },
  ],
};

export default function UploadPage() {
  const [previewState, previewAction, previewPending] = useActionState(previewUploadAction, {});
  const [type, setType] = useState<"master" | "ucla" | "live">("master");
  const [detected, setDetected] = useState<Record<string, string>>({});

  const headers = previewState?.headers ?? [];
  const fields = fieldConfig[type];

  function handlePreview(formData: FormData) {
    setDetected({});
    previewAction(formData);
  }

  function updateDetection() {
    const values: Record<string, string> = {};
    for (const f of fields) {
      values[f.key] = autoDetect(headers, f.key);
    }
    setDetected(values);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload Source</h1>
        <p className="text-sm text-muted-foreground">Upload a file, confirm column mapping, then sync.</p>
      </div>

      <form action={handlePreview}>
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex gap-2">
              {(["master", "ucla", "live"] as const).map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={type === t ? "default" : "outline"}
                  onClick={() => setType(t)}
                >
                  {t === "master" ? "Master" : t === "ucla" ? "UCLA" : "Live Sessions"}
                </Button>
              ))}
            </div>
            <input type="hidden" name="type" value={type} />

            <div className="space-y-2">
              <Label>Source name</Label>
              <Input name="name" placeholder="e.g. Master Sheet Nov 2025" required />
            </div>

            <div className="space-y-2">
              <Label>File (CSV or Excel)</Label>
              <Input name="file" type="file" accept=".csv,.xlsx,.xls" required />
            </div>

            {previewState?.error && <p className="text-sm text-destructive">{previewState.error}</p>}

            <Button type="submit" disabled={previewPending} className="w-full">
              {previewPending ? "Reading..." : "Next: Preview Columns"}
            </Button>
          </CardContent>
        </Card>
      </form>

      {previewState?.ok && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{previewState.sourceName}</p>
                <p className="text-sm text-muted-foreground">
                  {previewState.fileName} — {previewState.rowCount} rows, {headers.length} columns
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={updateDetection}>
                Auto-detect
              </Button>
            </div>

            <div className="rounded-md border p-3 space-y-1 max-h-40 overflow-y-auto">
              {headers.map((h) => (
                <div key={h} className="flex items-center gap-2 text-sm">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{h}</code>
                  {Object.entries(detected).filter(([, v]) => v === h).map(([k]) => (
                    <Badge key={k} variant="secondary" className="text-[10px]">
                      {fields.find((f) => f.key === k)?.label || k}
                    </Badge>
                  ))}
                </div>
              ))}
            </div>

            <form action="">
              <input type="hidden" name="confirm" value="1" />
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="name" value={previewState.sourceName} />
              {fields.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label>{f.label}</Label>
                  <select
                    name={f.key}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={detected[f.key] || ""}
                    onChange={(e) => setDetected({ ...detected, [f.key]: e.target.value })}
                  >
                    <option value="">— Select column —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
              <Button type="submit" className="w-full mt-4">Confirm & Sync</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
