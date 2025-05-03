import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, Outlet } from 'react-router-dom';
// import { supabase } from './lib/supabase';
import apiClient from './lib/api';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ClientList from './pages/clients/ClientList';
import ProjectList from './pages/projects/ProjectList';
import InvoiceList from './pages/invoices/InvoiceList';
import InvoiceView from './pages/invoices/InvoiceView';
import ExpenseList from './pages/expenses/ExpenseList';
import { startRecurringInvoiceCheck } from './services/recurringInvoices';

// Protected Route wrapper component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

// Layout component that includes Navigation and Outlet for child routes
function Layout() {
  const { signOut } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <nav className="w-64 bg-white shadow-lg p-6">
        <h1 className="text-xl font-bold text-indigo-600 mb-8">Freelancer Tracker</h1>
        <ul className="space-y-2">
          <li>
            <NavLink to="/">Dashboard</NavLink>
          </li>
          <li>
            <NavLink to="/clients">Clients</NavLink>
          </li>
          <li>
            <NavLink to="/projects">Projects</NavLink>
          </li>
          <li>
            <NavLink to="/invoices">Invoices</NavLink>
          </li>
          <li>
            <NavLink to="/income">Income</NavLink>
          </li>
          <li>
            <NavLink to="/expenses">Expenses</NavLink>
          </li>
          <li>
            <button
              onClick={() => signOut()}
              className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </li>
        </ul>
      </nav>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

// Simple placeholder components
const Dashboard = () => {
  const [testMessage, setTestMessage] = useState<string>('');
  
  useEffect(() => {
    apiClient.get('/test')
      .then(response => {
        setTestMessage(response.data.message);
      })
      .catch(error => {
        console.error('API Error:', error);
        setTestMessage('Failed to connect to API');
      });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
      <p className="text-sm text-gray-600 mb-8">API Status: {testMessage || 'Loading...'}</p>
      <div>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Quick Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-gray-600 text-sm font-medium mb-2">Total Income</h3>
            <p className="text-2xl font-bold text-green-600">$0.00</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-gray-600 text-sm font-medium mb-2">Total Expenses</h3>
            <p className="text-2xl font-bold text-red-600">$0.00</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-gray-600 text-sm font-medium mb-2">Net Profit</h3>
            <p className="text-2xl font-bold text-blue-600">$0.00</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Income = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-gray-800 mb-6">Income</h1>
    <p className="text-gray-600">Your income will appear here.</p>
  </div>
);

const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link
      to={to}
      className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
        isActive
          ? 'bg-indigo-100 text-indigo-700'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  );
};

const App = () => {
  useEffect(() => {
    startRecurringInvoiceCheck();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="clients" element={<ClientList />} />
            <Route path="projects" element={<ProjectList />} />
            <Route path="invoices" element={<InvoiceList />} />
            <Route path="invoices/:id/view" element={<InvoiceView />} />
            <Route path="income" element={<Income />} />
            <Route path="expenses" element={<ExpenseList />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;