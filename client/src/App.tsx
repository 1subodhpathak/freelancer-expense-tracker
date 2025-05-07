import { useEffect, ReactNode, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ClientList from './pages/clients/ClientList';
import ProjectList from './pages/projects/ProjectList';
import InvoiceList from './pages/invoices/InvoiceList';
import InvoiceView from './pages/invoices/InvoiceView';
import ExpenseList from './pages/expenses/ExpenseList';
import TimeTracking from './pages/time-tracking/TimeTracking';
import TimeTrackingAnalytics from './pages/time-tracking/TimeTrackingAnalytics';
import Analytics from './pages/analytics/Analytics';
import TaxDashboard from './pages/tax/TaxDashboard';
import TaxSettings from './pages/tax/TaxSettings';
import QuarterlyTaxCalculator from './pages/tax/QuarterlyTaxCalculator';
import { startRecurringInvoiceCheck } from './services/recurringInvoices';
import {
  ClockIcon,
  ChartBarIcon,
  CalculatorIcon,
  DocumentTextIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { supabase } from './lib/supabase';
import Dashboard from './pages/Dashboard';

interface LayoutProps {
  children: ReactNode;
}

// Protected Route wrapper component
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

// Sidebar component
function Sidebar({ onCloseMobile }: { onCloseMobile: () => void }) {
  const location = useLocation();
  const { user } = useAuth();
  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="bg-gray-800 text-white w-64 min-h-screen p-4 flex flex-col relative">
      {/* Mobile close button */}
      <button
        onClick={onCloseMobile}
        className="absolute top-4 right-4 lg:hidden text-gray-300 hover:text-white"
      >
        <XMarkIcon className="h-6 w-6" />
      </button>

      <div className="text-xl font-bold mb-8 lg:block hidden">Freelance Manager</div>
      
      <ul className="space-y-2 flex-grow mt-8 lg:mt-0">
        <li>
          <Link
            to="/"
            className={`block px-4 py-2 rounded ${
              isActive('/') ? 'bg-gray-700' : 'hover:bg-gray-700'
            }`}
          >
            Dashboard
          </Link>
        </li>
        <li>
          <Link
            to="/clients"
            className={`block px-4 py-2 rounded ${
              isActive('/clients') ? 'bg-gray-700' : 'hover:bg-gray-700'
            }`}
          >
            Clients
          </Link>
        </li>
        <li>
          <Link
            to="/projects"
            className={`block px-4 py-2 rounded ${
              isActive('/projects') ? 'bg-gray-700' : 'hover:bg-gray-700'
            }`}
          >
            Projects
          </Link>
        </li>
        <li>
          <Link
            to="/invoices"
            className={`block px-4 py-2 rounded ${
              isActive('/invoices') ? 'bg-gray-700' : 'hover:bg-gray-700'
            }`}
          >
            Invoices
          </Link>
        </li>
        <li>
          <Link
            to="/expenses"
            className={`block px-4 py-2 rounded ${
              isActive('/expenses') ? 'bg-gray-700' : 'hover:bg-gray-700'
            }`}
          >
            Expenses
          </Link>
        </li>
        <li>
          <div className="px-4 py-2 text-gray-400 text-sm uppercase">Time Tracking</div>
          <ul className="ml-4 space-y-2">
            <li>
              <Link
                to="/time-tracking"
                className={`flex items-center px-4 py-2 rounded ${
                  isActive('/time-tracking') ? 'bg-gray-700' : 'hover:bg-gray-700'
                }`}
              >
                <ClockIcon className="h-5 w-5 mr-2" />
                Timer
              </Link>
            </li>
            <li>
              <Link
                to="/time-tracking/analytics"
                className={`flex items-center px-4 py-2 rounded ${
                  isActive('/time-tracking/analytics') ? 'bg-gray-700' : 'hover:bg-gray-700'
                }`}
              >
                <ChartBarIcon className="h-5 w-5 mr-2" />
                Analytics
              </Link>
            </li>
          </ul>
        </li>
        <li>
          <Link
            to="/analytics"
            className={`block px-4 py-2 rounded ${
              isActive('/analytics') ? 'bg-gray-700' : 'hover:bg-gray-700'
            }`}
          >
            Business Analytics
          </Link>
        </li>
        <li>
          <div className="px-4 py-2 text-gray-400 text-sm uppercase">Tax Management</div>
          <ul className="ml-4 space-y-2">
            <li>
              <Link
                to="/tax"
                className={`flex items-center px-4 py-2 rounded ${
                  isActive('/tax') ? 'bg-gray-700' : 'hover:bg-gray-700'
                }`}
              >
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                Tax Dashboard
              </Link>
            </li>
            <li>
              <Link
                to="/tax/quarterly"
                className={`flex items-center px-4 py-2 rounded ${
                  isActive('/tax/quarterly') ? 'bg-gray-700' : 'hover:bg-gray-700'
                }`}
              >
                <CalculatorIcon className="h-5 w-5 mr-2" />
                Quarterly Taxes
              </Link>
            </li>
          </ul>
        </li>
      </ul>
      
      <div className="border-t border-gray-700 pt-4 mt-4">
        <div className="px-4 py-2 text-sm text-gray-400 truncate">
          {user?.email}
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center w-full px-4 py-2 text-gray-300 hover:bg-gray-700 rounded transition-colors"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
          Sign Out
        </button>
      </div>
    </nav>
  );
}

// Layout component
function Layout({ children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 bg-gray-800 h-16 flex items-center px-4 lg:hidden z-30">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="text-white hover:text-gray-300"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
        <div className="text-white text-lg font-bold ml-4">Freelance Manager</div>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-300 ease-in-out z-30 lg:static lg:inset-auto`}
      >
        <Sidebar onCloseMobile={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Content area */}
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          {/* Content container */}
          <div className="w-full max-w-[2000px] mx-auto">
            {/* Responsive padding container */}
            <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6">
              {/* Page content */}
              <div className="bg-white shadow-sm rounded-lg">
                <div className="p-4 sm:p-6 lg:p-8">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

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
                <Layout>
                  <Dashboard />
                </Layout>
            </ProtectedRoute>
          }
        />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Navigate to="/time-tracking" />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients"
            element={
              <ProtectedRoute>
                <Layout>
                  <ClientList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProjectList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices"
            element={
              <ProtectedRoute>
                <Layout>
                  <InvoiceList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices/:id/view"
            element={
              <ProtectedRoute>
                <Layout>
                  <InvoiceView />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <Layout>
                  <ExpenseList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/time-tracking"
            element={
              <ProtectedRoute>
                <Layout>
                  <TimeTracking />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/time-tracking/analytics"
            element={
              <ProtectedRoute>
                <Layout>
                  <TimeTrackingAnalytics />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Layout>
                  <Analytics />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tax"
            element={
              <ProtectedRoute>
                <Layout>
                  <TaxDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tax/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <TaxSettings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tax/quarterly"
            element={
              <ProtectedRoute>
                <Layout>
                  <QuarterlyTaxCalculator />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;