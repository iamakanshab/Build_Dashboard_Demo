import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';

const MetricCard = ({ title, value, isRed, subtitle, size = 'default' }) => (
  <div className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow p-6">
    <div className="text-sm font-medium text-gray-500">{title}</div>
    <div className={`mt-2 ${size === 'large' ? 'text-4xl' : 'text-3xl'} font-semibold ${
      isRed ? 'text-red-500' : 'text-gray-900'
    }`}>
      {value}
    </div>
    {subtitle && <div className="mt-1 text-sm text-gray-600">{subtitle}</div>}
  </div>
);

const MetricsDashboard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/metrics/dashboard?range=${timeRange}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [timeRange]);

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      </div>
    );
  }

  // Using mock data structure similar to the image
  const mockData = {
    chartData: [
      { date: '2025-01-20', Success: 5, Failed: 4, Flaky: 0 },
      { date: '2025-01-22', Success: 20, Failed: 13, Flaky: 0 },
      { date: '2025-01-23', Success: 35, Failed: 35, Flaky: 0 },
      { date: '2025-01-24', Success: 34, Failed: 20, Flaky: 0 },
      { date: '2025-01-26', Success: 5, Failed: 5, Flaky: 5 }
    ],
    metrics: {
      redOnMain: 42.0,
      forceMergesFailed: 18.6,
      timeToRedSignal: 49,
      redOnMainFlaky: 6.5,
      forceMergesImpatience: 12.9,
      viableLag: '4.8h',
      lastMainPush: '7.5m',
      reverts: 23,
      pullTrunkTTS: '3.1h'
    }
  };

  const activeData = data || mockData;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">PyTorch CI Metrics</h1>
        <div className="flex gap-4">
          <select 
            className="px-3 py-2 border rounded-md bg-white"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="7d">Last 7 Days</option>
            <option value="14d">Last 14 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button 
            onClick={fetchDashboardData}
            className="px-4 py-2 border rounded-md hover:bg-gray-50 flex items-center gap-2"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <MetricCard
          title="% commits red on main"
          value={`${activeData.metrics.redOnMain}%`}
          isRed={true}
          subtitle="(broken trunk)"
        />
        <MetricCard
          title="% force merges due to failed PR checks"
          value={`${activeData.metrics.forceMergesFailed}%`}
          isRed={true}
        />
        <MetricCard
          title="Time to Red Signal"
          value={activeData.metrics.timeToRedSignal}
          subtitle="(p75 TTRS - mins)"
        />
        <MetricCard
          title="% commits red on main"
          value={`${activeData.metrics.redOnMainFlaky}%`}
          subtitle="(flaky)"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Commits red on main, by day</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeData.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Success" stackId="a" fill="#4ade80" name="Success" />
                <Bar dataKey="Failed" stackId="a" fill="#f87171" name="Failed" />
                <Bar dataKey="Flaky" stackId="a" fill="#fbbf24" name="Flaky" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Time Metrics Trend</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeData.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Success" stroke="#4ade80" />
                <Line type="monotone" dataKey="Failed" stroke="#f87171" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <MetricCard
          title="viable/strict lag"
          value={activeData.metrics.viableLag}
        />
        <MetricCard
          title="Last main push"
          value={activeData.metrics.lastMainPush}
        />
        <MetricCard
          title="# reverts"
          value={activeData.metrics.reverts}
          isRed={activeData.metrics.reverts > 20}
        />
        <MetricCard
          title="p50 pull, trunk TTS"
          value={activeData.metrics.pullTrunkTTS}
        />
        <MetricCard
          title="% force merges (impatience)"
          value={`${activeData.metrics.forceMergesImpatience}%`}
          isRed={true}
        />
      </div>
    </div>
  );
};

export default MetricsDashboard;