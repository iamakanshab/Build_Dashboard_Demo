// WaterfallView.jsx
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import StatusIcon from './StatusIcon';

const API_BASE_URL = 'http://localhost:5000/api';

useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/metrics/workflow-runs`);
      const data = await response.json();
      console.log('Raw response:', data); // Debug
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };
  fetchData();
}, []);

const repos = [
  { id: 'pytorch/pytorch', name: 'PyTorch' },
  { id: 'pytorch/vision', name: 'TorchVision' },
  { id: 'pytorch/audio', name: 'TorchAudio' },
  { id: 'pytorch/text', name: 'TorchText' }
];

const WaterfallView = () => {
  const [workflowRuns, setWorkflowRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedRepo, setSelectedRepo] = useState('all');
  const [settings, setSettings] = useState({
    groupedView: true,
    hideUnstable: false,
    condenseLF: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const queryParams = new URLSearchParams({
          days: '7',
          repo: selectedRepo === 'all' ? '' : selectedRepo
        });
        
        const response = await fetch(`${API_BASE_URL}/metrics/workflow-runs?${queryParams}`);
        if (!response.ok) throw new Error('Failed to fetch workflow data');
        const data = await response.json();
        
        const transformedData = data.map(run => ({
          time: new Date(run.createTime).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          }),
          sha: run.workflowId.substring(0, 7),
          commit: run.commitMessage,
          repo: run.repo,
          pr: run.prNumber ? `#${run.prNumber}` : '',
          author: run.author,
          deepLink: `https://github.com/${run.repo}/commit/${run.workflowId}`,
          results: {
            'Linux': getStatusFromConclusion(run.conclusion),
            'Win': getStatusFromConclusion(run.conclusion),
            'Mac': getStatusFromConclusion(run.conclusion),
            'ROC': getStatusFromConclusion(run.conclusion),
            'Doc': getStatusFromConclusion(run.conclusion),
            'Lint': getStatusFromConclusion(run.conclusion),
            'Test': run.timeToRedSignal ? 'F' : getStatusFromConclusion(run.conclusion)
          }
        }));
        
        setWorkflowRuns(transformedData);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, [selectedRepo]);

  const getStatusFromConclusion = (conclusion) => {
    switch(conclusion) {
      case 'success': return 'O';
      case 'failure': return 'X';
      default: return '?';
    }
  };

  const workflows = ['Linux', 'Win', 'Mac', 'ROC', 'Doc', 'Lint', 'Test'];

  const filteredRuns = workflowRuns.filter(run => {
    if (!filter) return true;
    return (
      run.sha.toLowerCase().includes(filter.toLowerCase()) ||
      run.commit.toLowerCase().includes(filter.toLowerCase()) ||
      run.author.toLowerCase().includes(filter.toLowerCase())
    );
  });

  if (loading) {
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
            {repos.map(repo => (
              <option key={repo.id} value={repo.id}>
                {repo.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Job filter..."
            className="px-2 py-1 border rounded text-sm w-64"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-4 text-sm mb-4">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={settings.groupedView}
            onChange={(e) => setSettings(prev => ({...prev, groupedView: e.target.checked}))}
          />
          Use grouped view
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={settings.hideUnstable}
            onChange={(e) => setSettings(prev => ({...prev, hideUnstable: e.target.checked}))}
          />
          Hide unstable jobs
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={settings.condenseLF}
            onChange={(e) => setSettings(prev => ({...prev, condenseLF: e.target.checked}))}
          />
          Condense LF jobs
        </label>
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1 text-left font-medium">Time</th>
              <th className="px-2 py-1 text-left font-medium">SHA</th>
              <th className="px-2 py-1 text-left font-medium">Commit</th>
              <th className="px-2 py-1 text-left font-medium">PR</th>
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
                <td className="px-2 py-1">
                  {run.pr && (
                    <a 
                      href={`https://github.com/${run.repo}/pull/${run.pr.substring(1)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {run.pr}
                    </a>
                  )}
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