import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';

// REMOVED API URL for testing
// const API_URL = 'http://localhost:5000';

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

const MetricsDashboard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

const fetchDashboardData = async () => {
    try {
      console.log('Fetching metrics from:', '/api/metrics/dashboard');
      const response = await fetch('/api/metrics/dashboard');
      console.log('Response:', response);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Dashboard data:', result);
      
      if (result.error) {
        throw new Error(result.error);
      }

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
  }, []);

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) return null;

  const { chartData, metrics } = data;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">CI Metrics</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commits Status by Day</CardTitle>
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
                <Bar dataKey="Success" stackId="a" fill="#4ade80" name="Success" />
                <Bar dataKey="Failed" stackId="a" fill="#f87171" name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="% commits red on main"
          value={`${metrics.redOnMain}%`}
          isRed={parseFloat(metrics.redOnMain) > 5}
          size="large"
        />
        <MetricCard
          title="% commits flaky"
          value={`${metrics.redOnMainFlaky}%`}
          isRed={parseFloat(metrics.redOnMainFlaky) > 5}
          size="large"
        />
        <MetricCard
          title="Last main push"
          value={metrics.lastMainPush}
          isRed={false}
          size="large"
        />
      </div>
    </div>
  );
};

export default MetricsDashboard;