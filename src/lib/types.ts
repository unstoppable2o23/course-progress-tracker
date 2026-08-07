export interface Student {
  id: string;
  name: string;
  primary_email?: string;
  phone?: string;
  advisor?: string;
  sales_type?: string;
  payment_date?: string;
  sale_month?: string;
  installment?: string;
  amount?: number;
  payment_mode?: string;
  full_course_fee?: number;
  welcome_call_done?: boolean;
  certificate_received?: boolean;
  psychometric_offered?: boolean;
  batch_date?: string;
  source_id?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentView extends Student {
  is_expired_180: boolean;
  days_since_payment: number | null;
  aliases: { email?: string; phone?: string; source: string }[] | null;
  live_sessions_completed: number;
  live_sessions: Record<string, string> | null;
  ucla_enrollments: {
    batch_title?: string;
    batch_start?: string;
    batch_end?: string;
    timestamp?: string;
    interest?: string;
  }[] | null;
}

export interface StudentAlias {
  id: string;
  student_id: string;
  email?: string;
  phone?: string;
  source: string;
}

export interface Source {
  id: string;
  name: string;
  type: "master" | "ucla" | "live";
  file_name?: string;
  uploaded_at: string;
  created_at: string;
}

export interface SyncLog {
  id: string;
  status: string;
  sources_processed: number;
  rows_read: number;
  students_updated: number;
  new_students: number;
  errors: string[];
  started_at: string;
  ended_at?: string;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "staff";
  is_active: boolean;
  created_at: string;
}
