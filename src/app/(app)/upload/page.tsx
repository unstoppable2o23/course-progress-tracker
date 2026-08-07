"use client";

import { useState } from "react";
import { useActionState } from "react";
import { uploadSourceAction, type UploadState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const fieldPresets = {
  master: [
    { name: "emailColumn", label: "Email column", placeholder: "Email ID" },
    { name: "phoneColumn", label: "Phone column", placeholder: "Contact" },
    { name: "nameColumn", label: "Name column", placeholder: "Participant Name (As to be printed on Certificate)" },
    { name: "dateColumn", label: "Payment date column", placeholder: "Payment Date" },
    { name: "advisorColumn", label: "Advisor column", placeholder: "Advisor name" },
  ],
  ucla: [
    { name: "emailColumn", label: "Email column", placeholder: "Email Address" },
    { name: "phoneColumn", label: "Phone column", placeholder: "Mobile Number" },
    { name: "nameColumn", label: "Name column", placeholder: "Full Name (As to be mentioned on the Certificate)" },
    { name: "statusColumn", label: "Timestamp column", placeholder: "Timestamp" },
    { name: "interestColumn", label: "Interest column", placeholder: "Are You Interested to join..." },
  ],
  live: [
    { name: "emailColumn", label: "Email column", placeholder: "Enter Your Registered Email ID" },
    { name: "phoneColumn", label: "Phone column", placeholder: "Enter your Registered Mobile No" },
    { name: "nameColumn", label: "Name column", placeholder: "Enter your Full Name" },
    { name: "statusColumn", label: "Session column", placeholder: "Select the current Live Interactive Session" },
    { name: "dateColumn", label: "Timestamp column", placeholder: "Timestamp" },
  ],
};

export default function UploadPage() {
  const [type, setType] = useState<"master" | "ucla" | "live">("master");
  const [state, action, pending] = useActionState(uploadSourceAction, {});

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload Source</h1>
        <p className="text-sm text-muted-foreground">Upload and sync a data source.</p>
      </div>

      <form action={action}>
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

            {fieldPresets[type].map((f) => (
              <div key={f.name} className="space-y-2">
                <Label>{f.label}</Label>
                <Input name={f.name} placeholder={f.placeholder} />
              </div>
            ))}

            <div className="space-y-2">
              <Label>File (CSV or Excel)</Label>
              <Input name="file" type="file" accept=".csv,.xlsx,.xls" required />
            </div>

            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
            {state?.ok && <p className="text-sm text-emerald-500">Uploaded {state.rows} rows.</p>}

            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Uploading..." : "Upload & Sync"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

