import { Link } from 'react-router-dom';

const Dashboard = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Welcome to Freelance Manager</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Client Management</h2>
          <p className="text-gray-600 mb-4">Track your clients, their projects, and maintain contact information.</p>
          <Link to="/clients" className="text-blue-600 hover:text-blue-800">Manage Clients →</Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Time Tracking</h2>
          <p className="text-gray-600 mb-4">Log your work hours, track project progress, and analyze productivity.</p>
          <Link to="/time-tracking" className="text-blue-600 hover:text-blue-800">Track Time →</Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Invoicing</h2>
          <p className="text-gray-600 mb-4">Create and manage invoices, track payments, and set up recurring billing.</p>
          <Link to="/invoices" className="text-blue-600 hover:text-blue-800">Manage Invoices →</Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Expense Tracking</h2>
          <p className="text-gray-600 mb-4">Monitor business expenses, categorize spending, and manage receipts.</p>
          <Link to="/expenses" className="text-blue-600 hover:text-blue-800">Track Expenses →</Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Tax Management</h2>
          <p className="text-gray-600 mb-4">Calculate quarterly taxes, track deductions, and manage tax settings.</p>
          <Link to="/tax" className="text-blue-600 hover:text-blue-800">Manage Taxes →</Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Analytics</h2>
          <p className="text-gray-600 mb-4">View business insights, income reports, and performance metrics.</p>
          <Link to="/analytics" className="text-blue-600 hover:text-blue-800">View Analytics →</Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;