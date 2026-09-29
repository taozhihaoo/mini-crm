export type Role = "admin" | "member";
export type LeadStage = "new" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
export type LeadPriority = "low" | "medium" | "high";
export type LeadSource = "website" | "referral" | "email" | "cold_outreach" | "other";
export type ActivityType = "note" | "call" | "email" | "meeting";
export type TaskStatus = "open" | "completed" | "cancelled";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ListParams {
  page?: number;
  page_size?: number;
  search?: string;
  sort_by?: string;
  order?: "asc" | "desc";
}

export interface Company extends CompanyFields {
  id: string;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyFields {
  name: string;
  website: string | null;
  industry: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
}

export interface ContactBrief {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  company_id: string;
  job_title: string | null;
}

export interface LeadBrief {
  id: string;
  title: string;
  stage: LeadStage;
  value: string;
  currency: string;
  company_id: string;
  contact_id: string;
  created_at: string;
}

export interface Contact extends ContactFields {
  id: string;
  full_name: string;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  company: CompanyBrief | null;
}

export interface ContactFields {
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  notes: string | null;
}

export interface ContactDetail extends Contact {
  leads: LeadBrief[];
  activities: ActivityBrief[];
  tasks: TaskBrief[];
}

export interface CompanyBrief {
  id: string;
  name: string;
  industry: string | null;
}

export interface CompanyDetail extends Company {
  contacts: ContactBrief[];
  leads: LeadBrief[];
}

export interface UserBrief {
  id: string;
  full_name: string;
  email: string;
}

export interface Lead extends LeadFields {
  id: string;
  owner_id: string;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  company: CompanyBrief | null;
  contact: ContactBrief | null;
  owner: UserBrief | null;
}

export interface LeadFields {
  company_id: string;
  contact_id: string;
  title: string;
  description: string | null;
  value: string;
  currency: string;
  stage: LeadStage;
  priority: LeadPriority;
  source: LeadSource;
  expected_close_date: string | null;
}

export interface LeadDetail extends Lead {
  activities: ActivityBrief[];
  tasks: TaskBrief[];
}

export interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  content: string | null;
  company_id: string | null;
  contact_id: string | null;
  lead_id: string | null;
  occurred_at: string;
  created_at: string;
  lead: LeadBrief | null;
  contact: ContactBrief | null;
  company: CompanyBrief | null;
}

export interface ActivityBrief {
  id: string;
  type: ActivityType;
  subject: string;
  content: string | null;
  occurred_at: string;
  lead_id: string | null;
  contact_id: string | null;
  company_id: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  related_lead_id: string | null;
  related_contact_id: string | null;
  due_at: string | null;
  status: TaskStatus;
  priority: LeadPriority;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  related_lead: LeadBrief | null;
  related_contact: ContactBrief | null;
  assignee: UserBrief | null;
}

export interface TaskBrief {
  id: string;
  title: string;
  status: TaskStatus;
  priority: LeadPriority;
  due_at: string | null;
  related_lead_id: string | null;
  related_contact_id: string | null;
}

export interface StageStat {
  stage: LeadStage;
  count: number;
  value: string;
}

export interface DashboardStats {
  total_companies: number;
  total_contacts: number;
  open_leads: number;
  won_leads: number;
  lost_leads: number;
  pipeline_value: string;
  tasks_due_today: number;
  tasks_overdue: number;
  pipeline: StageStat[];
  recent_activities: Activity[];
  due_today_tasks: Task[];
  overdue_tasks: Task[];
  upcoming_tasks: Task[];
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface AISummaryResponse {
  summary: string;
  provider: string;
}

export interface AIPriorityResponse {
  priority: LeadPriority;
  reasoning: string;
  provider: string;
}

export interface AIFollowUpResponse {
  subject: string;
  body: string;
  provider: string;
}

export interface RowError {
  row: number;
  field: string | null;
  message: string;
}

export interface ImportSummary {
  imported: number;
  skipped: number;
  errors: number;
  error_details: RowError[];
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export const LEAD_STAGES: LeadStage[] = [
  "new",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

export const STAGE_LABELS: Record<LeadStage, string> = {
  new: "New",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

/** Mirrors the backend's guarded stage workflow. */
export const ALLOWED_STAGE_TRANSITIONS: Record<LeadStage, LeadStage[]> = {
  new: ["qualified", "lost"],
  qualified: ["new", "proposal", "lost"],
  proposal: ["qualified", "negotiation", "lost"],
  negotiation: ["proposal", "won", "lost"],
  won: [],
  lost: ["new"],
};

export const PRIORITIES: LeadPriority[] = ["low", "medium", "high"];
export const LEAD_SOURCES: LeadSource[] = ["website", "referral", "email", "cold_outreach", "other"];
export const ACTIVITY_TYPES: ActivityType[] = ["note", "call", "email", "meeting"];
export const TASK_STATUSES: TaskStatus[] = ["open", "completed", "cancelled"];
