import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import StatusIcon from './StatusIcon';

const API_BASE_URL = 'http://localhost:5000/api';

const WaterfallView = () => {
  const [workflowRuns, setWorkflowRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [selectedRepo, setSelectedRepo] = useState('all');

  const workflows = ['Linux', 'Win', 'Mac', 'ROC', 'Doc', 'Lint', 'Test'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams({
          days: '7',
          repo: selectedRepo === 'all' ? '' : selectedRepo
        });
        
        const response = await fetch(`${API_BASE_URL}/metrics/workflow-runs?${queryParams}`);
        if (!response.ok) throw new Error('Failed to fetch workflow data');
        
        const data = await response.json();
        console.log('Workflow API response:', data);
        
        const transformedData = data.map(run => ({
          time: new Date(run.createTime).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          }),
          sha: run.workflowId.substring(0, 7),
          commit: run.commitMessage,
          repo: run.repo,
          author: run.author,
          deepLink: `https://github.com/${run.repo}/commit/${run.workflowId}`,
          results: run.results
        }));
        
        setWorkflowRuns(transformedData);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [selectedRepo]);

  const filteredRuns = workflowRuns.filter(run => {
    if (!filter) return true;
    return (
      run.sha.toLowerCase().includes(filter.toLowerCase()) ||
      run.commit.toLowerCase().includes(filter.toLowerCase()) ||
      run.author.toLowerCase().includes(filter.toLowerCase())
    );
  });

  if (loading && workflowRuns.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">GitHub Workflow Dashboard</h1>
      
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4">
          <select
            value={selectedRepo}
            onChange={(e) => setSelectedRepo(e.target.value)}
            className="w-48 px-2 py-1 border rounded text-sm"
          >
            <option value="all">All Repositories</option>
            <option value="iree-org/iree">IREE</option>
            <option value="nod-ai/shark-ai">Shark</option>
          </select>
          <input
            type="text"
            placeholder="Filter commits..."
            className="px-2 py-1 border rounded text-sm w-64"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="text-red-500 mb-4">Error: {error}</div>
      )}

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1 text-left font-medium">Time</th>
              <th className="px-2 py-1 text-left font-medium">SHA</th>
              <th className="px-2 py-1 text-left font-medium">Commit</th>
              <th className="px-2 py-1 text-left font-medium">Author</th>
              {workflows.map(workflow => (
                <th key={workflow} className="px-1 py-1 text-center font-medium">
                  {workflow}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {filteredRuns.map((run) => (
              <tr key={`${run.repo}-${run.sha}`} className="border-t border-gray-100">
                <td className="px-2 py-1 text-gray-500 whitespace-nowrap">
                  {run.time}
                </td>
                <td className="px-2 py-1 font-mono whitespace-nowrap">
                  <a 
                    href={run.deepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {run.sha}
                  </a>
                </td>
                <td className="px-2 py-1">
                  <span className="text-gray-900">{run.commit}</span>
                </td>
                <td className="px-2 py-1 text-gray-500">
                  {run.author}
                </td>
                {workflows.map(workflow => (
                  <td key={workflow} className="px-1 py-1 text-center">
                    <StatusIcon status={run.results[workflow]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WaterfallView;