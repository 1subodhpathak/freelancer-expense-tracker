import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { Expense, ExpenseCategory, Vendor, RecurringInterval } from '../../types';
import { PlusIcon, PencilIcon, TrashIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
// import Container from '../Container';

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'software', label: 'Software' },
  { value: 'travel', label: 'Travel' },
  { value: 'meals', label: 'Meals' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'rent', label: 'Rent' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' }
];

interface ExpenseFormData {
  vendor_id?: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string;
  is_recurring: boolean;
  recurring_interval?: RecurringInterval;
  next_expense_date?: string;
  is_tax_deductible: boolean;
  tax_category?: string;
  notes?: string;
}

export const Container = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      {children}
    </div>
  );
};

export default function ExpenseList() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>({
    category: 'other',
    amount: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    is_recurring: false,
    is_tax_deductible: false,
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    fetchExpenses();
    fetchVendors();
  }, [user]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          vendor:vendors(*)
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('name');

      if (error) throw error;
      setVendors(data || []);
    } catch (err) {
      console.error('Error fetching vendors:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const uploadReceipt = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${user?.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = await supabase.storage
      .from('receipts')
      .createSignedUrl(filePath, 31536000);

    return data?.signedUrl || '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let receipt_url = editingExpense?.receipt_url;

      if (receiptFile) {
        receipt_url = await uploadReceipt(receiptFile);
      }

      const expenseData = {
        ...formData,
        receipt_url,
        user_id: user?.id,
      };

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('expenses')
          .insert([expenseData]);
        if (error) throw error;
      }
      
      setIsModalOpen(false);
      setEditingExpense(null);
      setFormData({
        category: 'other',
        amount: 0,
        date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        is_recurring: false,
        is_tax_deductible: false,
      });
      setReceiptFile(null);
      fetchExpenses();
    } catch (err) {
      console.error('Error saving expense:', err);
      setError('Failed to save expense');
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      vendor_id: expense.vendor_id,
      category: expense.category,
      amount: expense.amount,
      date: format(new Date(expense.date), 'yyyy-MM-dd'),
      description: expense.description,
      is_recurring: expense.is_recurring,
      recurring_interval: expense.recurring_interval,
      next_expense_date: expense.next_expense_date,
      is_tax_deductible: expense.is_tax_deductible,
      tax_category: expense.tax_category,
      notes: expense.notes,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      fetchExpenses();
    } catch (err) {
      console.error('Error deleting expense:', err);
      setError('Failed to delete expense');
    }
  };

  return (
    <Container>
      {/* Header with responsive filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Expenses</h1>
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded border-gray-300"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setEditingExpense(null);
              setFormData({
                category: 'other',
                amount: 0,
                date: format(new Date(), 'yyyy-MM-dd'),
                description: '',
                is_recurring: false,
                is_tax_deductible: false,
              });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Expense
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          {/* Mobile card view for small screens */}
          <div className="block sm:hidden space-y-4">
            {expenses.map((expense) => (
              <div key={expense.id} className="bg-white p-4 rounded-lg shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{expense.description}</div>
                    <div className="text-sm text-gray-500">
                      {EXPENSE_CATEGORIES.find(cat => cat.value === expense.category)?.label}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${expense.amount.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">
                      {format(parseISO(expense.date), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden sm:block overflow-x-auto bg-white shadow rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Receipt
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {format(new Date(expense.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{expense.description}</div>
                      {expense.is_recurring && (
                        <div className="text-xs text-gray-500">
                          Recurring ({expense.recurring_interval})
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100">
                        {EXPENSE_CATEGORIES.find(cat => cat.value === expense.category)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {expense.vendor?.name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        ${expense.amount.toFixed(2)}
                      </div>
                      {expense.is_tax_deductible && (
                        <div className="text-xs text-green-600">Tax Deductible</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {expense.receipt_url && (
                        <a
                          href={expense.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <DocumentIcon className="h-5 w-5" />
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(expense)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
            <h2 className="text-xl font-bold mb-4">
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    {EXPENSE_CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vendor</label>
                  <select
                    value={formData.vendor_id || ''}
                    onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value || undefined })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Select a vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Receipt</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="mt-1 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-indigo-50 file:text-indigo-700
                    hover:file:bg-indigo-100"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_recurring"
                    checked={formData.is_recurring}
                    onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_recurring" className="ml-2 block text-sm text-gray-700">
                    Recurring Expense
                  </label>
                </div>

                {formData.is_recurring && (
                  <div className="grid grid-cols-2 gap-4 pl-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Interval</label>
                      <select
                        value={formData.recurring_interval || 'monthly'}
                        onChange={(e) => setFormData({ ...formData, recurring_interval: e.target.value as RecurringInterval })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Next Date</label>
                      <input
                        type="date"
                        value={formData.next_expense_date || ''}
                        onChange={(e) => setFormData({ ...formData, next_expense_date: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_tax_deductible"
                    checked={formData.is_tax_deductible}
                    onChange={(e) => setFormData({ ...formData, is_tax_deductible: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_tax_deductible" className="ml-2 block text-sm text-gray-700">
                    Tax Deductible
                  </label>
                </div>

                {formData.is_tax_deductible && (
                  <div className="pl-6">
                    <label className="block text-sm font-medium text-gray-700">Tax Category</label>
                    <input
                      type="text"
                      value={formData.tax_category || ''}
                      onChange={(e) => setFormData({ ...formData, tax_category: e.target.value })}
                      placeholder="e.g., Business Expense, Home Office, etc."
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                >
                  {editingExpense ? 'Update Expense' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Container>
  );
}