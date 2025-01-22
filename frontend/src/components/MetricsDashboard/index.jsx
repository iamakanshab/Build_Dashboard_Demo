// src/components/MetricsDashboard/index.jsx
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import dashboardData from '../../data/dashboard-data.json';

const MetricCard = ({ title, value, isRed }) => (
  <div className="bg-white overflow-hidden shadow rounded-lg p-6">
    <div className="text-sm font-medium text-gray-500">{title}</div>
    <div className={`mt-2 text-3xl font-semibold ${isRed ? 'text-red-500' : 'text-gray-900'}`}>
      {value}
    </div>
  </div>
);

const MetricsDashboard = () => {
  const [timeRange] = useState('Last 7 Days');
  const [percentile] = useState('p50');

  // Process the JSON data
  const processData = () => {
    // Group workflow runs by date
    const runsByDate = dashboardData.workflow_runs.reduce((acc, run) => {
      const date = new Date(run.createtime * 1000).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = { total: 0, failed: 0 };
      }
      acc[date].total++;
      if (run.conclusion === 'failure') {
        acc[date].failed++;
      }
      return acc;
    }, {});

    // Convert to chart format
    const chartData = Object.entries(runsByDate).map(([date, stats]) => ({
      date,
      total_commits: stats.total,
      failed_commits: stats.failed
    }));

    // Calculate metrics
    const totalRuns = dashboardData.workflow_runs.length;
    const failedRuns = dashboardData.workflow_runs.filter(run => run.conclusion === 'failure').length;
    const redOnMainRate = (failedRuns / totalRuns) * 100;

    return {
      chartData,
      metrics: {
        redOnMain: redOnMainRate.toFixed(1),
        avgRuntime: (dashboardData.workflow_runs.reduce((acc, run) => acc + (run.runtime || 0), 0) / totalRuns).toFixed(1),
        avgQueueTime: (dashboardData.workflow_runs.reduce((acc, run) => acc + (run.queuetime || 0), 0) / totalRuns).toFixed(1)
      }
    };
  };

  const { chartData, metrics } = processData();

  return (
    <div className="p-6 space-y-6">
      {/* Header and Controls */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">CI Metrics</h1>
        <div className="flex gap-4">
          <select 
            value={timeRange}
            className="border p-2 rounded"
            disabled
          >
            <option>Last 7 Days</option>
          </select>
          <select 
            value={percentile}
            className="border p-2 rounded"
            disabled
          >
            <option value="p50">p50</option>
          </select>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium mb-4">Daily Commits and Failures</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total_commits" stackId="a" fill="#4ade80" name="Success" />
              <Bar dataKey="failed_commits" stackId="a" fill="#f87171" name="Failure" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Red on Main Rate"
          value={`${metrics.redOnMain}%`}
          isRed={true}
        />
        <MetricCard
          title="Average Runtime"
          value={`${metrics.avgRuntime}s`}
          isRed={false}
        />
        <MetricCard
          title="Average Queue Time"
          value={`${metrics.avgQueueTime}s`}
          isRed={false}
        />
      </div>
    </div>
  );
};

export default MetricsDashboard;