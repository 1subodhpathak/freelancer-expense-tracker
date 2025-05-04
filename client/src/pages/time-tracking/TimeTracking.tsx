import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';
import { StopIcon, PlusIcon, TrashIcon, CogIcon } from '@heroicons/react/24/outline';

interface TimeEntry {
  id: string;
  project_id: string;
  task_description: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  is_billable: boolean;
  hourly_rate: number | null;
  status: 'ongoing' | 'completed' | 'invoiced';
  project?: {
    name: string;
  };
}

interface Project {
  id: string;
  name: string;
}

interface TimeTrackingSettings {
  default_hourly_rate: number;
  minimum_billing_increment: number;
  working_hours_per_day: number;
  working_days_per_week: number;
}

export default function TimeTracking() {
  const { user } = useAuth();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [settings, setSettings] = useState<TimeTrackingSettings>({
    default_hourly_rate: 0,
    minimum_billing_increment: 15,
    working_hours_per_day: 8,
    working_days_per_week: 5,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    project_id: '',
    task_description: '',
    is_billable: true,
    hourly_rate: 0,
  });

  useEffect(() => {
    if (user) {
      fetchTimeEntries();
      fetchProjects();
      fetchSettings();
    }
  }, [user]);

  const fetchTimeEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          project:projects(name)
        `)
        .eq('user_id', user?.id)
        .order('start_time', { ascending: false });

      if (error) throw error;
      setTimeEntries(data || []);

      // Check for active timer
      const active = data?.find(entry => entry.end_time === null);
      if (active) setActiveTimer(active);
    } catch (err) {
      console.error('Error fetching time entries:', err);
      setError('Failed to fetch time entries');
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('time_tracking_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) setSettings(data);
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const startTimer = async () => {
    if (!formData.project_id || !formData.task_description) {
      setError('Please select a project and enter a task description');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .insert([{
          user_id: user?.id,
          project_id: formData.project_id,
          task_description: formData.task_description,
          start_time: new Date().toISOString(),
          is_billable: formData.is_billable,
          hourly_rate: formData.hourly_rate || settings.default_hourly_rate,
          status: 'ongoing'
        }])
        .select()
        .single();

      if (error) throw error;
      setActiveTimer(data);
      await fetchTimeEntries();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error starting timer:', err);
      setError('Failed to start timer');
    }
  };

  const stopTimer = async () => {
    if (!activeTimer) return;

    try {
      const { error } = await supabase
        .from('time_entries')
        .update({
          end_time: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', activeTimer.id);

      if (error) throw error;
      setActiveTimer(null);
      await fetchTimeEntries();
    } catch (err) {
      console.error('Error stopping timer:', err);
      setError('Failed to stop timer');
    }
  };

  const deleteTimeEntry = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this time entry?')) return;

    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchTimeEntries();
    } catch (err) {
      console.error('Error deleting time entry:', err);
      setError('Failed to delete time entry');
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('time_tracking_settings')
        .upsert({
          user_id: user?.id,
          ...settings
        });

      if (error) throw error;
      setIsSettingsModalOpen(false);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-gray-600">Loading time entries...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Time Tracking</h1>
        <div className="space-x-4">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            <CogIcon className="h-6 w-6" />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center"
            disabled={!!activeTimer}
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Time Entry
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {activeTimer && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{activeTimer.task_description}</h3>
              <p className="text-sm text-gray-600">
                Started at {format(parseISO(activeTimer.start_time), 'h:mm a')}
              </p>
            </div>
            <button
              onClick={stopTimer}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 flex items-center"
            >
              <StopIcon className="h-5 w-5 mr-2" />
              Stop Timer
            </button>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Task
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {timeEntries.map((entry) => (
              <tr key={entry.id}>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {entry.task_description}
                  </div>
                  <div className="text-sm text-gray-500">
                    {format(parseISO(entry.start_time), 'MMM d, yyyy h:mm a')}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {entry.project?.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {formatDuration(entry.duration_minutes)}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${entry.status === 'ongoing' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${entry.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                    ${entry.status === 'invoiced' ? 'bg-gray-100 text-gray-800' : ''}
                  `}>
                    {entry.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  <button
                    onClick={() => deleteTimeEntry(entry.id)}
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

      {/* New Time Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">New Time Entry</h2>
            <form onSubmit={(e) => { e.preventDefault(); startTimer(); }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Project</label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  required
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Task Description</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={formData.task_description}
                  onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={formData.is_billable}
                    onChange={(e) => setFormData({ ...formData, is_billable: e.target.checked })}
                  />
                  <span className="ml-2 text-sm text-gray-600">Billable</span>
                </label>
              </div>
              {formData.is_billable && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Hourly Rate</label>
                  <input
                    type="number"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={formData.hourly_rate || settings.default_hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) })}
                    min="0"
                    step="0.01"
                  />
                </div>
              )}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Start Timer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Time Tracking Settings</h2>
            <form onSubmit={saveSettings}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Default Hourly Rate</label>
                <input
                  type="number"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={settings.default_hourly_rate}
                  onChange={(e) => setSettings({ ...settings, default_hourly_rate: parseFloat(e.target.value) })}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Minimum Billing Increment (minutes)</label>
                <input
                  type="number"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={settings.minimum_billing_increment}
                  onChange={(e) => setSettings({ ...settings, minimum_billing_increment: parseInt(e.target.value) })}
                  min="1"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Working Hours per Day</label>
                <input
                  type="number"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={settings.working_hours_per_day}
                  onChange={(e) => setSettings({ ...settings, working_hours_per_day: parseInt(e.target.value) })}
                  min="1"
                  max="24"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Working Days per Week</label>
                <input
                  type="number"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={settings.working_days_per_week}
                  onChange={(e) => setSettings({ ...settings, working_days_per_week: parseInt(e.target.value) })}
                  min="1"
                  max="7"
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}