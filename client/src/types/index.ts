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
  project_id: string;
  client_id: string;
  invoice_number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  issue_date: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  is_recurring: boolean;
  recurring_interval?: string;
  next_invoice_date?: string;
  created_at: string;
  project?: Project;
  client?: Client;
}

export type ExpenseCategory = 
  | 'office_supplies'
  | 'software'
  | 'travel'
  | 'meals'
  | 'utilities'
  | 'rent'
  | 'insurance'
  | 'marketing'
  | 'professional_services'
  | 'equipment'
  | 'maintenance'
  | 'other';

export interface Vendor {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  notes?: string;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  vendor_id?: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string;
  receipt_url?: string;
  is_recurring: boolean;
  recurring_interval?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  next_expense_date?: string;
  is_tax_deductible: boolean;
  tax_category?: string;
  notes?: string;
  created_at: string;
  vendor?: Vendor;
} 