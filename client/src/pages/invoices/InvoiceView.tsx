import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Invoice } from '../../types';
import { format, parseISO } from 'date-fns';
import { PrinterIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

export default function InvoiceView() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          project:projects(*),
          client:clients(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setInvoice(data);
    } catch (err) {
      console.error('Error fetching invoice:', err);
      setError('Failed to fetch invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!invoice) return <div className="p-6">Invoice not found</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Print Controls - Hidden when printing */}
      <div className="print:hidden mb-6 flex justify-end space-x-4">
        <button
          onClick={handlePrint}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <PrinterIcon className="h-5 w-5 mr-2" />
          Print Invoice
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
          Download PDF
        </button>
      </div>

      {/* Invoice Content */}
      <div className="bg-white shadow-lg rounded-lg p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">INVOICE</h1>
            <p className="text-gray-600">{invoice.invoice_number}</p>
          </div>
          <div className="text-right">
            <div className="text-gray-600">
              <div>Issue Date: {format(parseISO(invoice.issue_date), 'MMM dd, yyyy')}</div>
              <div>Due Date: {format(parseISO(invoice.due_date), 'MMM dd, yyyy')}</div>
            </div>
          </div>
        </div>

        {/* Client & Project Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Bill To</h2>
            <div className="text-gray-600">
              <div className="font-medium">{invoice.client?.name}</div>
              <div>{invoice.client?.company}</div>
              <div>{invoice.client?.email}</div>
              <div>{invoice.client?.address}</div>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Project Details</h2>
            <div className="text-gray-600">
              <div className="font-medium">{invoice.project?.name}</div>
              <div>{invoice.project?.description}</div>
            </div>
          </div>
        </div>

        {/* Amount Details */}
        <div className="border-t border-gray-200 pt-8 mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="text-lg font-semibold text-gray-800">Total Amount</div>
            <div className="text-2xl font-bold text-gray-800">${invoice.amount.toFixed(2)}</div>
          </div>
          {invoice.paid_amount > 0 && (
            <>
              <div className="flex justify-between items-center text-gray-600">
                <div>Paid Amount</div>
                <div>${invoice.paid_amount.toFixed(2)}</div>
              </div>
              <div className="flex justify-between items-center font-semibold mt-2">
                <div>Balance Due</div>
                <div className="text-red-600">${(invoice.amount - invoice.paid_amount).toFixed(2)}</div>
              </div>
            </>
          )}
        </div>

        {/* Status */}
        <div className="mb-8">
          <div className="flex items-center">
            <span className="text-gray-600 mr-2">Status:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold
              ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}
            >
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Payment Terms & Notes */}
        <div className="border-t border-gray-200 pt-8 text-sm text-gray-600">
          <h3 className="font-semibold text-gray-800 mb-2">Payment Terms</h3>
          <p>Please pay within {Math.ceil((new Date(invoice.due_date).getTime() - new Date(invoice.issue_date).getTime()) / (1000 * 60 * 60 * 24))} days</p>
          {invoice.is_recurring && (
            <p className="mt-2">This is a recurring invoice ({invoice.recurring_interval})</p>
          )}
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 20mm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
} 