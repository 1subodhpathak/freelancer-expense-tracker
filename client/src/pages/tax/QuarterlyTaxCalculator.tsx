import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { format, parseISO, startOfQuarter, endOfQuarter } from 'date-fns';
import { PostgrestResponse } from '@supabase/supabase-js';

interface QuarterlyTax {
  quarter: number;
  startDate: string;
  endDate: string;
  dueDate: string;
  income: number;
  deductibleExpenses: number;
  taxableIncome: number;
  estimatedTax: number;
  paymentStatus: 'pending' | 'paid' | 'overdue';
  paymentDate?: string;
  paymentAmount?: number;
}

interface TaxSettings {
  tax_year: number;
  tax_rate: number;
  estimated_tax_rate: number;
  business_structure: string;
  tax_filing_frequency: 'quarterly' | 'annually';
}

interface TaxCategory {
  id: string;
  name: string;
  is_deductible: boolean;
}

interface ExpenseTaxCategory {
  amount: number;
  tax_categories: TaxCategory;
  expenses: {
    date: string;
  };
}

export default function QuarterlyTaxCalculator() {
  const { user } = useAuth();
  const [currentYear] = useState(new Date().getFullYear());
  const [quarterlyData, setQuarterlyData] = useState<QuarterlyTax[]>([]);
  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchTaxSettings().then(() => {
        calculateQuarterlyTaxes();
      });
    }
  }, [user]);

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
      setError('Failed to fetch tax settings');
    }
  };

  const calculateQuarterlyTaxes = async () => {
    try {
      setLoading(true);
      const quarters = [1, 2, 3, 4];
      const quarterlyTaxes: QuarterlyTax[] = [];

      for (const quarter of quarters) {
        const startDate = startOfQuarter(new Date(currentYear, (quarter - 1) * 3, 1));
        const endDate = endOfQuarter(startDate);
        
        // Calculate due date (15th of the month following the quarter)
        const dueDate = new Date(currentYear, quarter * 3, 15);

        // Fetch income for the quarter
        const { data: incomeData, error: incomeError } = await supabase
          .from('invoices')
          .select('amount, paid_amount')
          .eq('user_id', user?.id)
          .gte('issue_date', format(startDate, 'yyyy-MM-dd'))
          .lte('issue_date', format(endDate, 'yyyy-MM-dd'));

        if (incomeError) throw incomeError;

        const quarterlyIncome = incomeData?.reduce((sum, invoice) => sum + (invoice.paid_amount || 0), 0) || 0;

        // Fetch deductible expenses for the quarter
        const { data: expenseData, error: expenseError } = await supabase
          .from('expense_tax_categories')
          .select(`
            amount,
            tax_categories (
              id,
              name,
              is_deductible
            ),
            expenses!inner (
              date
            )
          `)
          .gte('expenses.date', format(startDate, 'yyyy-MM-dd'))
          .lte('expenses.date', format(endDate, 'yyyy-MM-dd')) as PostgrestResponse<ExpenseTaxCategory>;

        if (expenseError) throw expenseError;

        const deductibleExpenses = expenseData
          ?.filter(item => item.tax_categories?.is_deductible)
          .reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

        const taxableIncome = quarterlyIncome - deductibleExpenses;
        const estimatedTax = taxableIncome * (taxSettings?.estimated_tax_rate || 0.3);

        // Fetch payment status
        const { data: paymentData, error: paymentError } = await supabase
          .from('tax_payments')
          .select('*')
          .eq('user_id', user?.id)
          .eq('tax_year', currentYear)
          .eq('quarter', quarter)
          .single();

        if (paymentError && paymentError.code !== 'PGRST116') throw paymentError;

        const now = new Date();
        let paymentStatus: 'pending' | 'paid' | 'overdue' = 'pending';
        
        if (paymentData?.payment_date) {
          paymentStatus = 'paid';
        } else if (now > dueDate) {
          paymentStatus = 'overdue';
        }

        quarterlyTaxes.push({
          quarter,
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          dueDate: format(dueDate, 'yyyy-MM-dd'),
          income: quarterlyIncome,
          deductibleExpenses,
          taxableIncome,
          estimatedTax,
          paymentStatus,
          paymentDate: paymentData?.payment_date,
          paymentAmount: paymentData?.amount,
        });
      }

      setQuarterlyData(quarterlyTaxes);
    } catch (err) {
      console.error('Error calculating quarterly taxes:', err);
      setError('Failed to calculate quarterly taxes');
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

  const formatDate = (date: string) => {
    return format(parseISO(date), 'MMM d, yyyy');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-100';
      case 'overdue':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  const yearTotal = {
    income: quarterlyData.reduce((sum, q) => sum + q.income, 0),
    deductibleExpenses: quarterlyData.reduce((sum, q) => sum + q.deductibleExpenses, 0),
    taxableIncome: quarterlyData.reduce((sum, q) => sum + q.taxableIncome, 0),
    estimatedTax: quarterlyData.reduce((sum, q) => sum + q.estimatedTax, 0),
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Quarterly Tax Calculator</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quarter
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Income
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Deductible Expenses
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Taxable Income
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estimated Tax
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {quarterlyData.map((quarter) => (
              <tr key={quarter.quarter}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Q{quarter.quarter}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(quarter.startDate)} - {formatDate(quarter.endDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(quarter.dueDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {formatCurrency(quarter.income)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {formatCurrency(quarter.deductibleExpenses)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {formatCurrency(quarter.taxableIncome)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {formatCurrency(quarter.estimatedTax)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(quarter.paymentStatus)}`}>
                    {quarter.paymentStatus.charAt(0).toUpperCase() + quarter.paymentStatus.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-semibold">
              <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                Year Total
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                {formatCurrency(yearTotal.income)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                {formatCurrency(yearTotal.deductibleExpenses)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                {formatCurrency(yearTotal.taxableIncome)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                {formatCurrency(yearTotal.estimatedTax)}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-4">Payment Information</h2>
        <div className="space-y-2 text-sm text-blue-800">
          <p>• Quarterly estimated tax payments are due on the 15th day after each quarter ends.</p>
          <p>• Payment for Q1 (Jan-Mar) is due April 15</p>
          <p>• Payment for Q2 (Apr-Jun) is due July 15</p>
          <p>• Payment for Q3 (Jul-Sep) is due October 15</p>
          <p>• Payment for Q4 (Oct-Dec) is due January 15 of the following year</p>
          <p>• Late payments may be subject to penalties and interest</p>
        </div>
      </div>
    </div>
  );
} 