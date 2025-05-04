import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import {
  DocumentTextIcon,
  CalculatorIcon,
  TableCellsIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

interface TaxSummary {
  year: number;
  totalIncome: number;
  totalDeductibleExpenses: number;
  totalNonDeductibleExpenses: number;
  estimatedTaxLiability: number;
}

interface TaxSettings {
  tax_year: number;
  tax_rate: number;
  estimated_tax_rate: number;
  business_structure: string;
  tax_filing_frequency: 'quarterly' | 'annually';
}

interface TaxCategory {
  is_deductible: boolean;
}

interface ExpenseTaxCategory {
  amount: number;
  tax_categories: TaxCategory[];
  expenses: {
    date: string;
  }[];
}

// Type for the raw Supabase response
// interface RawExpenseTaxCategory {
//   amount: number;
//   tax_categories: Array<{ is_deductible: boolean }>;
//   expenses: Array<{ date: string }>;
// }

export default function TaxDashboard() {
  const { user } = useAuth();
  const [currentYear] = useState(new Date().getFullYear());
  const [taxSummary, setTaxSummary] = useState<TaxSummary | null>(null);
  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchTaxSummary();
      fetchTaxSettings();
    }
  }, [user]);

  const fetchTaxSummary = async () => {
    try {
      // Fetch total income
      const { data: incomeData, error: incomeError } = await supabase
        .from('invoices')
        .select('amount, paid_amount')
        .eq('user_id', user?.id)
        .gte('issue_date', `${currentYear}-01-01`)
        .lte('issue_date', `${currentYear}-12-31`);

      if (incomeError) throw incomeError;

      const totalIncome = incomeData?.reduce((sum, invoice) => sum + (invoice.paid_amount || 0), 0) || 0;

      // Fetch categorized expenses
      const { data: expenseData, error: expenseError } = await supabase
        .from('expense_tax_categories')
        .select(`
          amount,
          tax_categories (
            is_deductible
          ),
          expenses!inner (
            date
          )
        `)
        .gte('expenses.date', `${currentYear}-01-01`)
        .lte('expenses.date', `${currentYear}-12-31`);

      if (expenseError) throw expenseError;

      // Type the expenseData
      const typedExpenseData = expenseData as ExpenseTaxCategory[];

      const deductibleExpenses = typedExpenseData
        ?.filter(item => item.tax_categories.some(category => category.is_deductible))
        .reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

      const nonDeductibleExpenses = typedExpenseData
        ?.filter(item => item.tax_categories.every(category => !category.is_deductible))
        .reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

      const estimatedTaxLiability = (totalIncome - deductibleExpenses) * (taxSettings?.estimated_tax_rate || 0.3);

      setTaxSummary({
        year: currentYear,
        totalIncome,
        totalDeductibleExpenses: deductibleExpenses,
        totalNonDeductibleExpenses: nonDeductibleExpenses,
        estimatedTaxLiability,
      });
    } catch (err) {
      console.error('Error fetching tax summary:', err);
      setError('Failed to fetch tax summary');
    }
  };

  const fetchTaxSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('tax_settings')
        .select('*')
        .eq('user_id', user?.id)
        .eq('tax_year', currentYear)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) setTaxSettings(data);
    } catch (err) {
      console.error('Error fetching tax settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tax Assistance</h1>
        <Link
          to="/tax/settings"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Tax Settings
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium mb-2">Total Income</h3>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(taxSummary?.totalIncome || 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium mb-2">Deductible Expenses</h3>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(taxSummary?.totalDeductibleExpenses || 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium mb-2">Non-deductible Expenses</h3>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(taxSummary?.totalNonDeductibleExpenses || 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium mb-2">Estimated Tax</h3>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(taxSummary?.estimatedTaxLiability || 0)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          to="/tax/quarterly"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <CalculatorIcon className="h-8 w-8 text-blue-500 mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">Quarterly Calculations</h3>
          <p className="text-gray-600 text-sm">
            Calculate quarterly tax payments and view payment history.
          </p>
        </Link>

        <Link
          to="/tax/categories"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <TableCellsIcon className="h-8 w-8 text-green-500 mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">Tax Categories</h3>
          <p className="text-gray-600 text-sm">
            Manage expense categories and tax deduction rules.
          </p>
        </Link>

        <Link
          to="/tax/summary"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <DocumentTextIcon className="h-8 w-8 text-purple-500 mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">Year-end Summary</h3>
          <p className="text-gray-600 text-sm">
            View detailed year-end tax reports and summaries.
          </p>
        </Link>

        <Link
          to="/tax/export"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <ArrowDownTrayIcon className="h-8 w-8 text-orange-500 mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">Export Data</h3>
          <p className="text-gray-600 text-sm">
            Export tax-related data for your accountant.
          </p>
        </Link>
      </div>
    </div>
  );
}