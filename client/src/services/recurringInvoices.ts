import { supabase } from '../lib/supabase';
// import { Invoice } from '../types';
import { format, addDays, addWeeks, addMonths, addYears, parseISO } from 'date-fns';

export const generateNextInvoiceDate = (currentDate: string, interval: string): string => {
  const date = parseISO(currentDate);
  switch (interval) {
    case 'weekly':
      return format(addWeeks(date, 1), 'yyyy-MM-dd');
    case 'monthly':
      return format(addMonths(date, 1), 'yyyy-MM-dd');
    case 'quarterly':
      return format(addMonths(date, 3), 'yyyy-MM-dd');
    case 'yearly':
      return format(addYears(date, 1), 'yyyy-MM-dd');
    default:
      return format(addMonths(date, 1), 'yyyy-MM-dd');
  }
};

export const generateNextDueDate = (issueDate: string, previousDueDate: string, previousIssueDate: string): string => {
  // Calculate the difference in days between previous issue date and due date
  const prevIssueDateObj = parseISO(previousIssueDate);
  const prevDueDateObj = parseISO(previousDueDate);
  const daysDifference = Math.round((prevDueDateObj.getTime() - prevIssueDateObj.getTime()) / (1000 * 60 * 60 * 24));
  
  // Apply the same difference to the new issue date
  return format(addDays(parseISO(issueDate), daysDifference), 'yyyy-MM-dd');
};

export const checkAndGenerateRecurringInvoices = async () => {
  try {
    // Get all recurring invoices that have a next_invoice_date less than or equal to today
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data: recurringInvoices, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('is_recurring', true)
      .lte('next_invoice_date', today);

    if (error) throw error;

    // Generate new invoices for each recurring invoice
    for (const invoice of (recurringInvoices || [])) {
      const issueDate = today;
      const dueDate = generateNextDueDate(issueDate, invoice.due_date, invoice.issue_date);
      const nextInvoiceDate = generateNextInvoiceDate(today, invoice.recurring_interval);

      // Create new invoice
      const { error: insertError } = await supabase
        .from('invoices')
        .insert([{
          user_id: invoice.user_id,
          project_id: invoice.project_id,
          client_id: invoice.client_id,
          invoice_number: `${invoice.invoice_number.split('-')[0]}-${Date.now().toString().slice(-6)}`,
          status: 'draft',
          issue_date: issueDate,
          due_date: dueDate,
          amount: invoice.amount,
          paid_amount: 0,
          is_recurring: true,
          recurring_interval: invoice.recurring_interval,
          next_invoice_date: nextInvoiceDate,
        }]);

      if (insertError) {
        console.error('Error creating recurring invoice:', insertError);
        continue;
      }

      // Update the next_invoice_date of the original recurring invoice
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ next_invoice_date: nextInvoiceDate })
        .eq('id', invoice.id);

      if (updateError) {
        console.error('Error updating original invoice:', updateError);
      }
    }
  } catch (err) {
    console.error('Error in recurring invoice generation:', err);
  }
};

// Function to start the recurring invoice check
export const startRecurringInvoiceCheck = () => {
  // Check immediately when the app starts
  checkAndGenerateRecurringInvoices();

  // Then check every day at midnight
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const timeUntilMidnight = tomorrow.getTime() - now.getTime();

  // First timeout to align with midnight
  setTimeout(() => {
    checkAndGenerateRecurringInvoices();
    // Then set up the daily interval
    setInterval(checkAndGenerateRecurringInvoices, 24 * 60 * 60 * 1000);
  }, timeUntilMidnight);
}; 