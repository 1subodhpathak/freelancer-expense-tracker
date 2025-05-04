import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';

interface MonthlyData {
  month: string;
  total_income: number;
  total_expenses: number;
  profit: number;
}

interface ProjectProfitability {
  name: string;
  total_income: number;
  total_expenses: number;
  profit: number;
}

interface TaxLiability {
  tax_year: string;
  total_income: number;
  tax_deductible_expenses: number;
  non_tax_deductible_expenses: number;
  estimated_tax: number;
}

interface ExpenseByCategory {
  category: string;
  amount: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const TAX_RATE = 0.30; // Example tax rate - should be configurable based on user's jurisdiction

export default function Analytics() {
  const { user } = useAuth();
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [projectProfitability, setProjectProfitability] = useState<ProjectProfitability[]>([]);
  const [taxLiability, setTaxLiability] = useState<TaxLiability[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<ExpenseByCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [user, dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch monthly income vs expenses
      const { data: monthlyIncomeData, error: monthlyIncomeError } = await supabase
        .from('monthly_income_view')
        .select('*')
        .eq('user_id', user?.id)
        .gte('month', dateRange.start)
        .lte('month', dateRange.end);

      if (monthlyIncomeError) {
        console.error('Monthly income error:', monthlyIncomeError);
        throw new Error('Failed to fetch monthly income data');
      }

      // Fetch monthly expenses
      const { data: monthlyExpensesData, error: monthlyExpensesError } = await supabase
        .from('monthly_expenses_view')
        .select('*')
        .eq('user_id', user?.id)
        .gte('month', dateRange.start)
        .lte('month', dateRange.end);

      if (monthlyExpensesError) {
        console.error('Monthly expenses error:', monthlyExpensesError);
        throw new Error('Failed to fetch monthly expenses data');
      }

      // Combine monthly data
      const combinedMonthlyData = processMonthlyData(monthlyIncomeData || [], monthlyExpensesData || []);
      setMonthlyData(combinedMonthlyData);

      // Fetch project profitability
      const { data: profitData, error: profitError } = await supabase
        .from('project_profitability_view')
        .select('*')
        .eq('user_id', user?.id);

      if (profitError) {
        console.error('Project profitability error:', profitError);
        throw new Error('Failed to fetch project profitability data');
      }

      setProjectProfitability(processProfitabilityData(profitData || []));

      // Fetch tax liability
      const { data: taxData, error: taxError } = await supabase
        .from('tax_liability_view')
        .select('*')
        .eq('user_id', user?.id);

      if (taxError) {
        console.error('Tax liability error:', taxError);
        throw new Error('Failed to fetch tax liability data');
      }

      setTaxLiability(processTaxData(taxData || []));

      // Process expenses by category from monthly expenses data
      setExpensesByCategory(processExpenseData(monthlyExpensesData || []));
      
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const processMonthlyData = (incomeData: any[], expenseData: any[]): MonthlyData[] => {
    // Create a map of months to combine income and expenses
    const monthlyMap = new Map();

    // Process income data
    incomeData.forEach(item => {
      const month = format(parseISO(item.month), 'MMM yyyy');
      monthlyMap.set(month, {
        month,
        total_income: Number(item.total_income) || 0,
        total_expenses: 0,
        profit: Number(item.total_income) || 0
      });
    });

    // Process and combine expense data
    expenseData.forEach(item => {
      const month = format(parseISO(item.month), 'MMM yyyy');
      const existing = monthlyMap.get(month) || {
        month,
        total_income: 0,
        total_expenses: 0,
        profit: 0
      };

      existing.total_expenses = (existing.total_expenses || 0) + Number(item.total_expenses);
      existing.profit = existing.total_income - existing.total_expenses;
      monthlyMap.set(month, existing);
    });

    // Convert map to array and sort by date
    return Array.from(monthlyMap.values())
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  };

  const processProfitabilityData = (data: any[]): ProjectProfitability[] => {
    return data.map(item => ({
      name: item.name,
      total_income: Number(item.total_income) || 0,
      total_expenses: Number(item.total_expenses) || 0,
      profit: Number(item.profit) || 0
    }));
  };

  const processTaxData = (data: any[]): TaxLiability[] => {
    return data.map(item => ({
      tax_year: item.tax_year,
      total_income: Number(item.total_income) || 0,
      tax_deductible_expenses: Number(item.tax_deductible_expenses) || 0,
      non_tax_deductible_expenses: Number(item.non_tax_deductible_expenses) || 0,
      estimated_tax: (Number(item.total_income) - Number(item.tax_deductible_expenses)) * TAX_RATE
    }));
  };

  const processExpenseData = (data: any[]): ExpenseByCategory[] => {
    const categoryTotals = data.reduce((acc: { [key: string]: number }, item: any) => {
      acc[item.category] = (acc[item.category] || 0) + Number(item.amount);
      return acc;
    }, {});

    return Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount: Number(amount)
    }));
  };

  if (loading) return <div className="p-6">Loading analytics...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Financial Analytics</h1>

      {/* Date Range Selector */}
      <div className="flex items-center space-x-4 mb-6">
        <input
          type="date"
          value={dateRange.start}
          onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
          className="border rounded-md p-2"
        />
        <span>to</span>
        <input
          type="date"
          value={dateRange.end}
          onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
          className="border rounded-md p-2"
        />
      </div>

      {/* Income vs Expenses Chart */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Income vs Expenses</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="total_income" stroke="#0088FE" name="Income" />
            <Line type="monotone" dataKey="total_expenses" stroke="#FF8042" name="Expenses" />
            <Line type="monotone" dataKey="profit" stroke="#00C49F" name="Profit" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Project Profitability */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Project Profitability</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={projectProfitability}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="total_income" fill="#0088FE" name="Income" />
            <Bar dataKey="total_expenses" fill="#FF8042" name="Expenses" />
            <Bar dataKey="profit" fill="#00C49F" name="Profit" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Expenses by Category */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Expenses by Category</h2>
        <div className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={expensesByCategory}
                dataKey="amount"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={150}
                fill="#8884d8"
                label
              >
                {expensesByCategory.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tax Liability Estimation */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Tax Liability Estimation</h2>
        <div className="space-y-4">
          {taxLiability.map((item) => (
            <div key={item.tax_year} className="border-b pb-4">
              <h3 className="font-medium text-lg">{item.tax_year}</h3>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="text-gray-600">Total Income</p>
                  <p className="font-semibold">${item.total_income.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Tax Deductible Expenses</p>
                  <p className="font-semibold">${item.tax_deductible_expenses.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Non-Tax Deductible Expenses</p>
                  <p className="font-semibold">${item.non_tax_deductible_expenses.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Estimated Tax (30%)</p>
                  <p className="font-semibold text-red-600">${item.estimated_tax.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 