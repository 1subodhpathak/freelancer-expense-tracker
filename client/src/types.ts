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