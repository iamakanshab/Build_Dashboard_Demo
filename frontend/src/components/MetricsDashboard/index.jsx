// MetricsDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';

const API_BASE_URL = 'http://localhost:5000/api';

// Add console logging
useEffect(() => {
  const fetchData = async () => {
    try {
      console.log('Fetching from:', `${API_BASE_URL}/metrics/dashboard`);
      const response = await fetch(`${API_BASE_URL}/metrics/dashboard`);
      const data = await response.json();
      console.log('Raw data:', data);
      setData(data);
      setError(null);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);

const MetricCard = ({ title, value, isRed, size = 'default' }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="text-sm font-medium text-gray-500">{title}</div>
      <div className={`mt-2 ${size === 'large' ? 'text-4xl' : 'text-3xl'} font-semibold ${
        isRed ? 'text-red-500' : 'text-gray-900'
      }`}>
        {value}
      </div>
    </CardContent>
  </Card>
);
const fetchDashboardData = useCallback(async () => {
  try {
    console.log('Fetching dashboard data...');
    const response = await fetch(`${API_BASE_URL}/metrics/dashboard`);
    const result = await response.json();
    console.log('Dashboard data:', result);
    
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    if (!result.chartData || !result.metrics) throw new Error('Invalid data structure');
    
    setData(result);
  } catch (err) {
    console.error('Error:', err);
    setError(err.message);
  }
}, []);
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-6">
    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
  </div>
);

const MetricsDashboard = () => {
  const [timeRange, setTimeRange] = useState('7');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/metrics/dashboard`);
      
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
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 300000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  if (loading && !data) {
    return <LoadingSpinner />;
  }

  if (!data) {
    return null;
  }

  const { chartData, metrics } = data;

  return (
    <div className="p-6 space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">CI Metrics</h1>
        <select 
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="7">Last 7 Days</option>
          <option value="14">Last 14 Days</option>
          <option value="30">Last 30 Days</option>
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commits red on main, by day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" stackId="a" fill="#4ade80" name="Total" />
                <Bar dataKey="failed" stackId="a" fill="#f87171" name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="% commits red on main"
          value={`${metrics.redOnMain}%`}
          isRed={true}
          size="large"
        />
        <MetricCard
          title="% commits flaky"
          value={`${metrics.redOnMainFlaky}%`}
          isRed={true}
          size="large"
        />
        <MetricCard
          title="Last docker build"
          value={metrics.lastDockerBuild}
          isRed={false}
          size="large"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <MetricCard
          title="Last main push"
          value={metrics.lastMainPush}
          isRed={false}
        />
      </div>
    </div>
  );
};

export default MetricsDashboard;