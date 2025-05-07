import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { Invoice, Project, Client } from '../../types';
import { PlusIcon, PencilIcon, TrashIcon, DocumentIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { format, parseISO, isAfter } from 'date-fns';
import { Link } from 'react-router-dom';

const STATUS_COLORS = {
  'draft': 'bg-gray-100 text-gray-800',
  'sent': 'bg-blue-100 text-blue-800',
  'paid': 'bg-green-100 text-green-800',
  'overdue': 'bg-red-100 text-red-800',
  'cancelled': 'bg-gray-300 text-gray-800',
} as const;

export default function InvoiceList() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState({
    project_id: '',
    client_id: '',
    invoice_number: '',
    status: 'draft' as Invoice['status'],
    issue_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    amount: 0,
    paid_amount: 0,
    is_recurring: false,
    recurring_interval: 'monthly',
    next_invoice_date: '',
  });
  const [filterStatus, setFilterStatus] = useState<Invoice['status'] | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'due'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchInvoices();
    fetchProjects();
    fetchClients();
  }, [user]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          project:projects(*),
          client:clients(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  const generateInvoiceNumber = () => {
    const prefix = 'INV';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const invoiceData = {
        ...formData,
        user_id: user?.id,
        invoice_number: formData.invoice_number || generateInvoiceNumber(),
        ...(formData.is_recurring ? {} : {
          next_invoice_date: null,
          recurring_interval: null
        })
      };

      if (editingInvoice) {
        const { error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', editingInvoice.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('invoices')
          .insert([invoiceData]);
        if (error) throw error;
      }
      
      setIsModalOpen(false);
      setEditingInvoice(null);
      setFormData({
        project_id: '',
        client_id: '',
        invoice_number: '',
        status: 'draft',
        issue_date: format(new Date(), 'yyyy-MM-dd'),
        due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        amount: 0,
        paid_amount: 0,
        is_recurring: false,
        recurring_interval: 'monthly',
        next_invoice_date: '',
      });
      fetchInvoices();
    } catch (err) {
      console.error('Error saving invoice:', err);
      setError('Failed to save invoice');
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      project_id: invoice.project_id || '',
      client_id: invoice.client_id || '',
      invoice_number: invoice.invoice_number,
      status: invoice.status,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      amount: invoice.amount,
      paid_amount: invoice.paid_amount,
      is_recurring: invoice.is_recurring,
      recurring_interval: invoice.recurring_interval || 'monthly',
      next_invoice_date: invoice.next_invoice_date || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      fetchInvoices();
    } catch (err) {
      console.error('Error deleting invoice:', err);
      setError('Failed to delete invoice');
    }
  };

  const handleStatusChange = async (invoice: Invoice, newStatus: Invoice['status']) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoice.id);
      
      if (error) throw error;
      await fetchInvoices();
    } catch (err) {
      console.error('Error updating invoice status:', err);
      setError('Failed to update invoice status');
    }
  };

  const handlePaymentUpdate = async (invoice: Invoice, newPaidAmount: number) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          paid_amount: newPaidAmount,
          status: newPaidAmount >= invoice.amount ? 'paid' : 'sent'
        })
        .eq('id', invoice.id);
      
      if (error) throw error;
      await fetchInvoices();
    } catch (err) {
      console.error('Error updating payment:', err);
      setError('Failed to update payment');
    }
  };

  const filteredInvoices = invoices
    .filter(invoice => filterStatus === 'all' ? true : invoice.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc' 
          ? new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime()
          : new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime();
      }
      if (sortBy === 'amount') {
        return sortOrder === 'desc' 
          ? b.amount - a.amount
          : a.amount - b.amount;
      }
      // sort by due date
      return sortOrder === 'desc'
        ? new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
        : new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

  const handleQuickPay = async (invoice: Invoice) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          paid_amount: invoice.amount,
          status: 'paid'
        })
        .eq('id', invoice.id);
      
      if (error) throw error;
      await fetchInvoices();
    } catch (err) {
      console.error('Error updating payment:', err);
      setError('Failed to update payment');
    }
  };

  const checkOverdueInvoices = () => {
    const today = new Date();
    invoices.forEach(async (invoice) => {
      if (
        invoice.status !== 'paid' &&
        invoice.status !== 'overdue' &&
        isAfter(today, parseISO(invoice.due_date))
      ) {
        try {
          await supabase
            .from('invoices')
            .update({ status: 'overdue' })
            .eq('id', invoice.id);
        } catch (err) {
          console.error('Error updating overdue status:', err);
        }
      }
    });
  };

  const handleIssueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIssueDate = e.target.value;
    setFormData(prev => {
      // If due date exists and is before new issue date, clear it
      if (prev.due_date && prev.due_date < newIssueDate) {
        return { ...prev, issue_date: newIssueDate, due_date: '' };
      }
      return { ...prev, issue_date: newIssueDate };
    });
  };

  useEffect(() => {
    checkOverdueInvoices();
  }, [invoices]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Responsive Header */}
      <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Invoices</h1>
        
        {/* Responsive Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <label className="text-sm text-gray-600">Filter:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as Invoice['status'] | 'all')}
              className="rounded-md border-gray-300 text-sm w-full sm:w-auto"
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <label className="text-sm text-gray-600">Sort by:</label>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'amount' | 'due')}
                className="rounded-md border-gray-300 text-sm w-full sm:w-auto"
              >
                <option value="date">Issue Date</option>
                <option value="amount">Amount</option>
                <option value="due">Due Date</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1 hover:bg-gray-100 rounded"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingInvoice(null);
              setFormData({
                project_id: '',
                client_id: '',
                invoice_number: '',
                status: 'draft',
                issue_date: format(new Date(), 'yyyy-MM-dd'),
                due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
                amount: 0,
                paid_amount: 0,
                is_recurring: false,
                recurring_interval: 'monthly',
                next_invoice_date: '',
              });
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 w-full sm:w-auto"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Invoice
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center h-64">Loading...</div>
      ) : (
        <>
          {/* Mobile View */}
          <div className="block sm:hidden space-y-4">
            {filteredInvoices.map((invoice) => (
              <div 
                key={invoice.id} 
                className={`bg-white rounded-lg shadow-sm p-4 ${
                  invoice.status === 'overdue' ? 'border-l-4 border-red-500' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-medium">{invoice.invoice_number}</div>
                    <div className="text-sm text-gray-500">{invoice.client?.name}</div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_COLORS[invoice.status]}`}>
                    {invoice.status}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Amount:</span>
                    <span className="font-medium">${invoice.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Due Date:</span>
                    <span>{format(parseISO(invoice.due_date), 'MMM dd, yyyy')}</span>
                  </div>
                  {invoice.paid_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Paid:</span>
                      <span className="text-green-600">${invoice.paid_amount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  {/* Action buttons */}
                  {invoice.status !== 'paid' && (
                    <>
                      <button
                        onClick={() => handleQuickPay(invoice)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded"
                      >
                        <CreditCardIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => {
                          const amount = prompt('Enter payment amount:', invoice.amount.toString());
                          if (amount !== null) {
                            const parsedAmount = parseFloat(amount);
                            if (!isNaN(parsedAmount) && parsedAmount >= 0) {
                              handlePaymentUpdate(invoice, parsedAmount);
                            }
                          }
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        $
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleEdit(invoice)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <Link
                    to={`/invoices/${invoice.id}/view`}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                  >
                    <DocumentIcon className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={() => handleDelete(invoice.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View */}
          <div className="hidden sm:block overflow-x-auto bg-white shadow rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className={invoice.status === 'overdue' ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{invoice.invoice_number}</div>
                      {invoice.is_recurring && (
                        <span className="text-xs text-indigo-600">Recurring</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{invoice.client?.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{invoice.project?.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${invoice.amount.toFixed(2)}
                        {invoice.paid_amount > 0 && (
                          <span className="text-xs text-gray-500 ml-1">
                            (Paid: ${invoice.paid_amount.toFixed(2)})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span 
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[invoice.status]} cursor-pointer`}
                        onClick={() => {
                          const newStatus = invoice.status === 'draft' ? 'sent' 
                            : invoice.status === 'sent' ? 'paid'
                            : invoice.status === 'paid' ? 'sent'
                            : 'sent';
                          handleStatusChange(invoice, newStatus);
                        }}
                        title="Click to change status"
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{format(parseISO(invoice.due_date), 'MMM dd, yyyy')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      {invoice.status !== 'paid' && (
                        <>
                          <button
                            onClick={() => handleQuickPay(invoice)}
                            className="text-green-600 hover:text-green-900"
                            title="Mark as Paid"
                          >
                            <CreditCardIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              const amount = prompt('Enter payment amount:', invoice.amount.toString());
                              if (amount !== null) {
                                const parsedAmount = parseFloat(amount);
                                if (!isNaN(parsedAmount) && parsedAmount >= 0) {
                                  handlePaymentUpdate(invoice, parsedAmount);
                                }
                              }
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="Update Payment"
                          >
                            $
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleEdit(invoice)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit Invoice"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <Link
                        to={`/invoices/${invoice.id}/view`}
                        className="text-gray-600 hover:text-gray-900"
                        title="View Invoice"
                      >
                        <DocumentIcon className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(invoice.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Invoice"
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

      {/* Responsive Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Client</label>
                  <select
                    required
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Select Client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Project</label>
                  <select
                    required
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Select Project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Issue Date</label>
                  <input
                    type="date"
                    required
                    value={formData.issue_date}
                    onChange={handleIssueDateChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Due Date</label>
                  <input
                    type="date"
                    required
                    min={formData.issue_date || undefined}
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    disabled={!formData.issue_date}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  {!formData.issue_date && (
                    <p className="mt-1 text-sm text-gray-500">
                      Please select an issue date first
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Paid Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.paid_amount}
                    onChange={(e) => setFormData({ ...formData, paid_amount: parseFloat(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Invoice['status'] })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
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
                    Recurring Invoice
                  </label>
                </div>

                {formData.is_recurring && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Recurring Interval</label>
                      <select
                        value={formData.recurring_interval}
                        onChange={(e) => setFormData({ ...formData, recurring_interval: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Next Invoice Date</label>
                      <input
                        type="date"
                        value={formData.next_invoice_date}
                        onChange={(e) => setFormData({ ...formData, next_invoice_date: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                )}
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
                  {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}