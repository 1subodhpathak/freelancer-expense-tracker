import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

interface TimeEntry {
  id: string;
  project_id: string;
  task_description: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_billable: boolean;
  project?: {
    name: string;
  };
}

interface ProjectStats {
  project_id: string;
  project_name: string;
  total_duration: number;
  billable_duration: number;
  non_billable_duration: number;
}

interface DailyStats {
  date: string;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function TimeTrackingAnalytics() {
  const { user } = useAuth();
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    start: format(startOfWeek(new Date()), 'yyyy-MM-dd'),
    end: format(endOfWeek(new Date()), 'yyyy-MM-dd'),
  });

  const DateRangeSelector = () => (
    <div className="mb-6 flex gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Start Date</label>
        <input
          type="date"
          value={dateRange.start}
          onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">End Date</label>
        <input
          type="date"
          value={dateRange.end}
          onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
    </div>
  );

  useEffect(() => {
    if (user) {
      fetchTimeEntries();
    }
  }, [user, dateRange]);

  const fetchTimeEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          project:projects(name)
        `)
        .eq('user_id', user?.id)
        .gte('start_time', dateRange.start)
        .lte('start_time', dateRange.end)
        .order('start_time');

      if (error) throw error;
      calculateStats(data || []);
    } catch (err) {
      console.error('Error fetching time entries:', err);
      setError('Failed to fetch time entries');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (entries: TimeEntry[]) => {
    // Calculate project statistics
    const projectMap = new Map<string, ProjectStats>();
    
    entries.forEach(entry => {
      const projectId = entry.project_id;
      const projectName = entry.project?.name || 'Unknown Project';
      const duration = entry.duration_minutes || 0;
      
      if (!projectMap.has(projectId)) {
        projectMap.set(projectId, {
          project_id: projectId,
          project_name: projectName,
          total_duration: 0,
          billable_duration: 0,
          non_billable_duration: 0,
        });
      }
      
      const stats = projectMap.get(projectId)!;
      stats.total_duration += duration;
      if (entry.is_billable) {
        stats.billable_duration += duration;
      } else {
        stats.non_billable_duration += duration;
      }
    });
    
    setProjectStats(Array.from(projectMap.values()));

    // Calculate daily statistics
    const days = eachDayOfInterval({
      start: parseISO(dateRange.start),
      end: parseISO(dateRange.end),
    });

    const dailyData = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayEntries = entries.filter(entry => 
        format(parseISO(entry.start_time), 'yyyy-MM-dd') === dayStr
      );

      const totalMinutes = dayEntries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
      const billableMinutes = dayEntries
        .filter(entry => entry.is_billable)
        .reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);

      return {
        date: format(day, 'MMM d'),
        total_hours: Math.round((totalMinutes / 60) * 100) / 100,
        billable_hours: Math.round((billableMinutes / 60) * 100) / 100,
        non_billable_hours: Math.round(((totalMinutes - billableMinutes) / 60) * 100) / 100,
      };
    });

    setDailyStats(dailyData);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Time Tracking Analytics</h1>
      <DateRangeSelector />

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Daily Hours Distribution</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="billable_hours" name="Billable Hours" fill="#0088FE" stackId="a" />
              <Bar dataKey="non_billable_hours" name="Non-billable Hours" fill="#00C49F" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Project Distribution</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={projectStats}
                  dataKey="total_duration"
                  nameKey="project_name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${formatDuration(value)}`}
                >
                  {projectStats.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatDuration(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Project Details</h2>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Billable
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projectStats.map((project) => (
                  <tr key={project.project_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {project.project_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(project.total_duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(project.billable_duration)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}