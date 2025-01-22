import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

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

const QueueTable = ({ queueData }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr>
          <th className="text-left p-2">Count</th>
          <th className="text-left p-2">Queue time</th>
          <th className="text-left p-2">Machine Type</th>
        </tr>
      </thead>
      <tbody>
        {queueData.map((row, index) => (
          <tr key={index} className="border-t">
            <td className="p-2">{row.count}</td>
            <td className="p-2">{row.queueTime}</td>
            <td className="p-2">{row.machineType}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const MetricsDashboard = () => {
  const [timeRange, setTimeRange] = useState('Last 7 Days');
  const [percentile, setPercentile] = useState('p50');

  const processData = () => {
    // Simulate processing of dashboard data
    const chartData = [
      { date: '2025-01-14', total: 5, failed: 2, flaky: 1 },
      { date: '2025-01-15', total: 50, failed: 35, flaky: 3 },
      { date: '2025-01-16', total: 60, failed: 42, flaky: 2 },
      { date: '2025-01-17', total: 37, failed: 25, flaky: 4 },
      { date: '2025-01-18', total: 12, failed: 5, flaky: 1 },
      { date: '2025-01-19', total: 10, failed: 3, flaky: 0 },
      { date: '2025-01-20', total: 33, failed: 20, flaky: 2 },
    ];

    const queueData = [
      { count: 91, queueTime: '5.7h', machineType: 'linux.room.gpu.mi300.2' },
      { count: 10, queueTime: '4.1h', machineType: 'linux.room.gpu.mi300.4' },
    ];

    return {
      chartData,
      queueData,
      metrics: {
        redOnMain: '60.7',
        redOnMainFlaky: '2.8',
        forceMergesFailed: '16.2',
        forceMergesImpatience: '8.3',
        timeToRedSignal: '13',
        timeToRedSignalP75: '5',
        viableStrictLag: '8.2h',
        lastMainPush: '17.4m',
        lastDockerBuild: '2.4h',
        reverts: '22',
        pullTrunkTTS: '3.1h'
      }
    };
  };

  const { chartData, queueData, metrics } = processData();

  return (
    <div className="p-6 space-y-6">
      {/* Header and Controls */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">CI Metrics</h1>
        <div className="flex gap-4">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border p-2 rounded"
          >
            <option>Last 7 Days</option>
            <option>Last 14 Days</option>
            <option>Last 30 Days</option>
          </select>
          <select 
            value={percentile}
            onChange={(e) => setPercentile(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="p50">p50</option>
            <option value="p75">p75</option>
            <option value="p90">p90</option>
          </select>
        </div>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Commits red on main, by day</CardTitle>
          <div className="text-sm text-gray-500">Based on workflows which block viable/strict upgrade</div>
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
                <Bar dataKey="total" stackId="a" fill="#4ade80" name="Success" />
                <Bar dataKey="failed" stackId="a" fill="#f87171" name="Failed" />
                <Bar dataKey="flaky" stackId="a" fill="#fbbf24" name="Flaky" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="% commits red on main (broken trunk)"
          value={`${metrics.redOnMain}%`}
          isRed={true}
          size="large"
        />
        <MetricCard
          title="% force merges due to failed PR checks"
          value={`${metrics.forceMergesFailed}%`}
          isRed={true}
          size="large"
        />
        <MetricCard
          title="Time to Red Signal (p90 TTRS - mins)"
          value={metrics.timeToRedSignal}
          isRed={false}
          size="large"
        />
      </div>

      {/* Middle Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="% commits red on main (flaky)"
          value={`${metrics.redOnMainFlaky}%`}
          isRed={true}
        />
        <MetricCard
          title="% force merges due to impatience"
          value={`${metrics.forceMergesImpatience}%`}
          isRed={true}
        />
        <MetricCard
          title="Time to Red Signal (p75 TTRS - mins)"
          value={metrics.timeToRedSignalP75}
          isRed={false}
        />
      </div>

      {/* Bottom Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        <MetricCard
          title="viable/strict lag"
          value={metrics.viableStrictLag}
          isRed={true}
        />
        <MetricCard
          title="Last main push"
          value={metrics.lastMainPush}
          isRed={false}
        />
        <MetricCard
          title="Last docker build"
          value={metrics.lastDockerBuild}
          isRed={false}
        />
        <MetricCard
          title="# reverts"
          value={metrics.reverts}
          isRed={true}
        />
        <MetricCard
          title="p50 pull, trunk TTS"
          value={metrics.pullTrunkTTS}
          isRed={false}
        />
      </div>

      {/* Queue Data Section */}
      <Card>
        <CardHeader>
          <CardTitle>Queued Jobs by Machine Type</CardTitle>
        </CardHeader>
        <CardContent>
          <QueueTable queueData={queueData} />
        </CardContent>
      </Card>

      {/* Queue Times Historical Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Queue times historical</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#2563eb" 
                  name="Queue Time"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MetricsDashboard;