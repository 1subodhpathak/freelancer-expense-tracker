export interface MonthlyAnalytics {
  month: string;
  total_income: number;
  total_expenses: number;
  profit: number;
  number_of_payments: number;
  number_of_expenses: number;
}

export interface ProjectProfitability {
  id: string;
  name: string;
  total_income: number;
  total_expenses: number;
  profit: number;
  number_of_invoices: number;
  number_of_expenses: number;
}

export interface TaxLiability {
  tax_year: string;
  total_income: number;
  tax_deductible_expenses: number;
  non_tax_deductible_expenses: number;
  estimated_tax: number;
}

export interface ExpenseByCategory {
  category: string;
  amount: number;
  number_of_expenses: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  company?: string;
  phone?: string;
  address?: string;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  client_id: string;
  name: string;
  description?: string;
  status: 'proposal' | 'in-progress' | 'completed';
  start_date?: string;
  end_date?: string;
  created_at: string;
  client?: Client;
}

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string;
  project_id?: string;
  invoice_number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  notes?: string;
  is_recurring: boolean;
  recurring_interval?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  next_invoice_date?: string;
  created_at: string;
  client?: Client;
  project?: Project;
}

export interface Expense {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  receipt_url?: string;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  project_id: string;
  task_description: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  is_billable: boolean;
  hourly_rate: number | null;
  status: 'ongoing' | 'completed' | 'invoiced';
  invoice_id?: string;
  created_at: string;
  updated_at: string;
  project?: Project;
}

export interface TimeTrackingSettings {
  id: string;
  user_id: string;
  default_hourly_rate: number;
  minimum_billing_increment: number;
  working_hours_per_day: number;
  working_days_per_week: number;
  created_at: string;
  updated_at: string;
} 