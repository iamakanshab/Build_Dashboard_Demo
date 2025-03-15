import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

// Repository-specific workflow configurations
const REPO_WORKFLOWS = {
  'iree-org/iree': [
    { id: 'CI', display: 'CI', description: 'CI workflow' },
    { id: 'PkgCI', display: 'Pkg', description: 'Package CI workflow' },
    { id: 'Publish Website', display: 'Web', description: 'Website publishing' },
    { id: 'Linux', display: 'Linux', description: 'Linux CI' },
    { id: 'Mac', display: 'Mac x64', description: 'macOS x64 CI' },
    { id: 'ARM64', display: 'ARM64', description: 'Linux ARM64 CI' },
    { id: 'Windows', display: 'Win x64', description: 'Windows x64 CI' },
    { id: 'LLVM', display: 'LLVM', description: 'Linux BYOLLVM CI' },
    { id: 'Debug', display: 'Debug', description: 'Linux Debug CI' },
    { id: 'TSAN', display: 'TSAN', description: 'Linux TSAN CI' },
    { id: 'GCC', display: 'GCC', description: 'Linux GCC CI' }
  ],
  'nod-ai/shark-ai': [
    { id: 'shortfin', display: 'Shortfin', description: 'Shortfin CI workflow' },
    { id: 'sharktank', display: 'Sharktank', description: 'Sharktank CI workflow' },
    { id: 'pkgci', display: 'Pkg', description: 'Package CI workflow' }
  ]
};

// Default workflows when no specific repo is selected
const DEFAULT_WORKFLOWS = [
  { id: 'CI', display: 'CI', description: 'Main CI workflow' },
  { id: 'Pkg', display: 'Pkg', description: 'Package workflow' }
];

const StatusIcon = ({ status, url }) => {
  let icon;
  let color;
  let title;

  switch (status) {
    case 'O':
      icon = '●';
      color = 'text-green-500';
      title = 'Success - Click to view logs';
      break;
    case 'X':
      icon = '✕';
      color = 'text-red-500';
      title = 'Failed - Click to view logs';
      break;
    case '?':
      icon = '○';
      color = 'text-gray-400';
      title = 'Unknown/Pending';
      break;
    default:
      icon = '○';
      color = 'text-gray-400';
      title = 'Unknown/Pending';
  }

  if (url) {
    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className={`${color} hover:opacity-80`} 
        title={title}
      >
        {icon}
      </a>
    );
  }

  return <span className={color} title={title}>{icon}</span>;
};

const WaterfallView = () => {
  const [workflowRuns, setWorkflowRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [selectedRepo, setSelectedRepo] = useState('iree-org/iree');
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [showFilterHelp, setShowFilterHelp] = useState(false);
  const [availableRepos, setAvailableRepos] = useState([
    { id: 'iree-org/iree', name: 'IREE' },
    { id: 'iree-org/iree-test-suites', name: 'IREE Test Suites' },
    { id: 'iree-org/iree-turbine', name: 'IREE Turbine' },
    { id: 'nod-ai/shark-ai', name: 'SHARK' },
    { id: 'nod-ai/SHARK-TestSuite', name: 'SHARK Test Suite' },
    { id: 'eliasj42/iree', name: 'Elias IREE' },
  ]);

  // Select workflows based on the selected repository
  const workflows = REPO_WORKFLOWS[selectedRepo] || DEFAULT_WORKFLOWS;

  // Fetch available repositories (could be moved to a separate API endpoint)
  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const response = await fetch('/api/metrics/repos', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Format repos for dropdown
          const formattedRepos = data.map(repo => ({
            id: repo.name,
            name: repo.name.split('/').pop() // Extract the repo name after the slash
          }));
          setAvailableRepos(formattedRepos);
        }
      } catch (error) {
        console.error('Error fetching repos:', error);
        // Keep the hardcoded repos as fallback
      }
    };
    
    fetchRepos();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams({
          days: '30', // Increased to 30 days to get more results
          repo: selectedRepo === 'all' ? '' : selectedRepo,
          branch: selectedBranch === 'all' ? '' : selectedBranch
        }).toString();
        
        console.log('Fetching from:', `/api/metrics/workflowruns?${queryParams}`);
        
        const response = await fetch(`/api/metrics/workflowruns?${queryParams}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Workflow data sample:', data[0]); // Log first item for debugging
        
        if (data.error) {
          throw new Error(data.error);
        }

        // Group data by commit hash to reduce duplication
        const commitGroups = {};
        data.forEach(run => {
          if (!commitGroups[run.commitHash]) {
            commitGroups[run.commitHash] = {
              ...run,
              allRuns: [],  // Store all runs for this commit
              workflowResults: {}  // Store results for each workflow type
            };
            
            // Initialize workflow results
            workflows.forEach(workflow => {
              commitGroups[run.commitHash].workflowResults[workflow.id] = { 
                status: '?', 
                url: null 
              };
            });
          }
          
          // Add this run to the commit's run collection
          commitGroups[run.commitHash].allRuns.push(run);
          
          // Direct mapping from workflow name
          if (run.workflowname) {
            const workflowId = run.workflowname;
            const exactWorkflow = workflows.find(w => w.id === workflowId);
            
            if (exactWorkflow) {
              commitGroups[run.commitHash].workflowResults[exactWorkflow.id] = { 
                status: run.conclusion === 'success' ? 'O' : (run.conclusion === 'failure' ? 'X' : '?'),
                url: run.workflowUrl
              };
            }
          }
          
          // Also map OS-specific results
          if (run.os) {
            // Handle OS mappings
            let osKey = run.os;
            if (osKey.toLowerCase() === 'windows') {
              osKey = 'Windows';
            } else if (osKey.toLowerCase() === 'macos') {
              osKey = 'Mac';
            }
            
            const osWorkflow = workflows.find(w => w.id === osKey);
            if (osWorkflow) {
              commitGroups[run.commitHash].workflowResults[osWorkflow.id] = { 
                status: run.conclusion === 'success' ? 'O' : (run.conclusion === 'failure' ? 'X' : '?'),
                url: run.workflowUrl
              };
            }
          }
          
          // Also directly map results from the 'results' object if present
          if (run.results) {
            Object.entries(run.results).forEach(([key, value]) => {
              const resultWorkflow = workflows.find(w => w.id === key);
              if (resultWorkflow && value !== '?') {
                commitGroups[run.commitHash].workflowResults[resultWorkflow.id] = { 
                  status: value,
                  url: run.workflowUrl
                };
              }
            });
          }
        });

        // Convert back to array for display and sort by createTime
        const groupedData = Object.values(commitGroups)
          .sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
          
        setWorkflowRuns(groupedData);
        setError(null);
        console.log('Processed data:', groupedData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [selectedRepo, selectedBranch, workflows]);

  const filteredRuns = workflowRuns.filter(run => {
    if (!filter) return true;
    const searchTerm = filter.toLowerCase();
    return (
      (run.workflowId && run.workflowId.toLowerCase().includes(searchTerm)) ||
      (run.commitHash && run.commitHash.toLowerCase().includes(searchTerm)) ||
      (run.commitMessage && run.commitMessage.toLowerCase().includes(searchTerm)) ||
      (run.author && run.author.toLowerCase().includes(searchTerm)) ||
      (run.createTime && new Date(run.createTime).toLocaleDateString().includes(searchTerm))
    );
  });

  const branches = ['all', 'main', 'master', 'develop']; // Include all branches option

  if (loading && workflowRuns.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription>Error: {error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">GitHub Workflow Dashboard</h1>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div>
            <label className="block text-sm mb-1">Repository</label>
            <select
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              className="w-64 px-2 py-1 border rounded text-sm"
            >
              <option value="all">All Repositories</option>
              {availableRepos.map(repo => (
                <option key={repo.id} value={repo.id}>
                  {repo.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm mb-1">Branch</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-48 px-2 py-1 border rounded text-sm"
            >
              {branches.map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
          </div>
          
          <div className="relative">
            <label className="block text-sm mb-1">
              Filter 
              <button 
                onClick={() => setShowFilterHelp(!showFilterHelp)}
                className="ml-1 text-gray-500 hover:text-gray-700"
              >
                ?
              </button>
            </label>
            <input
              type="text"
              placeholder="Filter commits..."
              className="px-2 py-1 border rounded text-sm w-64"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            
            {showFilterHelp && (
              <div className="absolute z-10 mt-1 p-2 bg-white shadow-lg rounded-md border text-sm w-64">
                <p className="font-semibold">Sample queries:</p>
                <ul className="list-disc pl-5 mt-1">
                  <li>Author name: <span className="font-mono">john</span></li>
                  <li>Commit message: <span className="font-mono">fix bug</span></li>
                  <li>Date: <span className="font-mono">3/14</span></li>
                  <li>SHA: <span className="font-mono">de403</span></li>
                </ul>
                <p className="mt-1">Searches all fields including commit message, SHA, author, and date.</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1 items-center">
          <span className="text-sm font-medium">Workflows:</span>
          {workflows.map(workflow => (
            <span 
              key={workflow.id} 
              className="inline-flex items-center border px-2 py-0.5 rounded-full text-xs bg-gray-100"
              title={workflow.description}
            >
              {workflow.display}
            </span>
          ))}
        </div>
      </div>

      {filteredRuns.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          No workflow runs found for the selected filters.
        </div>
      ) : (
        <div className="overflow-x-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1 text-left font-medium">Time</th>
                <th className="px-2 py-1 text-left font-medium">SHA</th>
                <th className="px-2 py-1 text-left font-medium">Commit</th>
                <th className="px-2 py-1 text-left font-medium">Author</th>
                {workflows.map(workflow => (
                  <th key={workflow.id} className="px-1 py-1 text-center font-medium" title={workflow.description}>
                    {workflow.display}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredRuns.map((run) => (
                <tr key={`${run.repo}-${run.commitHash}`} className="border-t border-gray-100">
                  <td className="px-2 py-1 text-gray-500 whitespace-nowrap">
                    {new Date(run.createTime).toLocaleString(undefined, {
                      month: 'numeric',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-2 py-1 font-mono whitespace-nowrap">
                    {run.workflowUrl ? (
                      <a 
                        href={run.workflowUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                        title="View workflow run"
                      >
                        {run.commitHash.substring(0, 7)}
                      </a>
                    ) : (
                      <span className="text-gray-700">
                        {run.commitHash.substring(0, 7)}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1">
                    <a 
                      href={`https://github.com/${run.repo}/commit/${run.commitHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-900 hover:underline"
                      title={run.commitMessage || 'No message available'}
                    >
                      {(run.commitMessage || 'No message available').length > 80 
                        ? (run.commitMessage || 'No message available').substring(0, 80) + '...' 
                        : (run.commitMessage || 'No message available')}
                    </a>
                  </td>
                  <td className="px-2 py-1 text-gray-500">
                    {run.author}
                  </td>
                  {workflows.map(workflow => (
                    <td key={workflow.id} className="px-1 py-1 text-center">
                      <StatusIcon 
                        status={run.workflowResults[workflow.id]?.status || '?'} 
                        url={run.workflowResults[workflow.id]?.url}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WaterfallView;