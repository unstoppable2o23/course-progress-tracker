import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Progress Tracker</h1>
          <p className="text-sm text-muted-foreground">Student progress & data matching</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
