export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/[^0-9]/g, "");
}

export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

export function normalizeName(name: string | null | undefined): string {
  if (!name) return "";
  return name.trim().toLowerCase();
}

export function isExpired180(paymentDate: string | null | undefined): boolean {
  if (!paymentDate) return false;
  const payment = new Date(paymentDate);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - payment.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 180;
}

export function daysSincePayment(paymentDate: string | null | undefined): number | null {
  if (!paymentDate) return null;
  const payment = new Date(paymentDate);
  const now = new Date();
  return Math.floor((now.getTime() - payment.getTime()) / (1000 * 60 * 60 * 24));
}

export const LIVE_SESSIONS = [
  "Parent Counselling",
  "Interpretation of Psychometric Test",
  "Do's and Don'ts of Career Counselling",
] as const;

export type LiveSessionName = (typeof LIVE_SESSIONS)[number];
