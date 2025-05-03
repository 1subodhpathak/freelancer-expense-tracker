import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface TaxSettings {
  id?: string;
  tax_year: number;
  tax_rate: number;
  estimated_tax_rate: number;
  business_structure: string;
  tax_filing_frequency: 'quarterly' | 'annually';
}

interface TaxCategory {
  id: string;
  name: string;
  description: string;
  is_deductible: boolean;
}

const BUSINESS_STRUCTURES = [
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'llc', label: 'Limited Liability Company (LLC)' },
  { value: 'corporation', label: 'Corporation' },
  { value: 's_corporation', label: 'S Corporation' },
  { value: 'partnership', label: 'Partnership' },
];

const FILING_FREQUENCIES = [
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
];

export default function TaxSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentYear] = useState(new Date().getFullYear());
  const [settings, setSettings] = useState<TaxSettings>({
    tax_year: currentYear,
    tax_rate: 30,
    estimated_tax_rate: 30,
    business_structure: 'sole_proprietorship',
    tax_filing_frequency: 'quarterly',
  });
  const [categories, setCategories] = useState<TaxCategory[]>([]);
  const [newCategory, setNewCategory] = useState<Partial<TaxCategory>>({
    name: '',
    description: '',
    is_deductible: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      fetchSettings();
      fetchCategories();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('tax_settings')
        .select('*')
        .eq('user_id', user?.id)
        .eq('tax_year', currentYear)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) setSettings(data);
    } catch (err) {
      console.error('Error fetching tax settings:', err);
      setError('Failed to fetch tax settings');
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('tax_categories')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching tax categories:', err);
      setError('Failed to fetch tax categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('tax_settings')
        .upsert({
          ...settings,
          user_id: user?.id,
        });

      if (error) throw error;
      setSuccess('Tax settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving tax settings:', err);
      setError('Failed to save tax settings');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('tax_categories')
        .insert([{
          ...newCategory,
          user_id: user?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      setCategories([...categories, data]);
      setNewCategory({
        name: '',
        description: '',
        is_deductible: true,
      });
      setSuccess('Tax category added successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error adding tax category:', err);
      setError('Failed to add tax category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this tax category?')) return;

    try {
      const { error } = await supabase
        .from('tax_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCategories(categories.filter(cat => cat.id !== id));
      setSuccess('Tax category deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting tax category:', err);
      setError('Failed to delete tax category');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tax Settings</h1>
        <button
          onClick={() => navigate('/tax')}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Back to Tax Dashboard
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tax Settings Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">General Tax Settings</h2>
          <form onSubmit={handleSettingsSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tax Year</label>
                <input
                  type="number"
                  value={settings.tax_year}
                  onChange={(e) => setSettings({ ...settings, tax_year: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.tax_rate}
                  onChange={(e) => setSettings({ ...settings, tax_rate: parseFloat(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Estimated Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.estimated_tax_rate}
                  onChange={(e) => setSettings({ ...settings, estimated_tax_rate: parseFloat(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Business Structure</label>
                <select
                  value={settings.business_structure}
                  onChange={(e) => setSettings({ ...settings, business_structure: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  {BUSINESS_STRUCTURES.map((structure) => (
                    <option key={structure.value} value={structure.value}>
                      {structure.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Filing Frequency</label>
                <select
                  value={settings.tax_filing_frequency}
                  onChange={(e) => setSettings({ ...settings, tax_filing_frequency: e.target.value as 'quarterly' | 'annually' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  {FILING_FREQUENCIES.map((frequency) => (
                    <option key={frequency.value} value={frequency.value}>
                      {frequency.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Tax Categories Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Tax Categories</h2>
          
          {/* Add New Category Form */}
          <form onSubmit={handleAddCategory} className="mb-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category Name</label>
                <input
                  type="text"
                  required
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  rows={2}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_deductible"
                  checked={newCategory.is_deductible}
                  onChange={(e) => setNewCategory({ ...newCategory, is_deductible: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="is_deductible" className="ml-2 block text-sm text-gray-700">
                  Tax Deductible
                </label>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Add Category
                </button>
              </div>
            </div>
          </form>

          {/* Categories List */}
          <div className="space-y-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className="border rounded-lg p-4 flex justify-between items-start"
              >
                <div>
                  <h3 className="font-medium text-gray-900">{category.name}</h3>
                  <p className="text-sm text-gray-500">{category.description}</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    category.is_deductible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {category.is_deductible ? 'Tax Deductible' : 'Non-deductible'}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 