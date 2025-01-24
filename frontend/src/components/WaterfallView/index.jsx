import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

// StatusIcon component stays the same...
const StatusIcon = ({ status }) => {
  const getStatusStyle = () => {
    switch (status) {
      case 'O': return 'text-green-600';
      case 'X': return 'text-red-600';
      case '?': return 'text-yellow-500';
      case 'F': return 'text-orange-500';
      case '~': return 'text-gray-400';
      default: return 'text-gray-300';
    }
  };

  const getSymbol = () => {
    switch (status) {
      case 'O': return '●';
      case 'X': return '✕';
      case '?': return '?';
      case 'F': return 'F';
      case '~': return '–';
      default: return '–';
    }
  };

  return (
    <span className={`${getStatusStyle()} inline-block font-bold leading-none min-w-[1.25rem] text-center`}>
      {getSymbol()}
    </span>
  );
};

const WaterfallView = () => {
  // State definitions stay the same...
  const [workflowRuns, setWorkflowRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedRepo, setSelectedRepo] = useState('all');
  const [settings, setSettings] = useState({
    groupedView: true,
    hideUnstable: false,
    condenseLF: true,

  });

  const repos = [
    { id: 'pytorch/pytorch', name: 'PyTorch' },
    { id: 'pytorch/vision', name: 'TorchVision' },
    { id: 'pytorch/audio', name: 'TorchAudio' },
    { id: 'pytorch/text', name: 'TorchText' }
  ];

  // Mock data for development
  const mockData = [
    {
      workflowId: "1234567890abcdef",
      createTime: "2024-01-24T15:45:00Z",
      conclusion: "success",
      timeToRedSignal: null,
      repo: "pytorch/pytorch",
      commitMessage: "[Functorch] Fix vmap broadcasting for scalar tensors",
      author: "zou3519",
      prNumber: "145160"
    },
    {
      workflowId: "2345678901abcdef",
      createTime: "2024-01-24T15:32:00Z",
      conclusion: "failure",
      timeToRedSignal: 15,
      repo: "pytorch/pytorch",
      commitMessage: "[dynamo] Improve error messages for graph breaks",
      author: "jansel",
      prNumber: "145159"
    },
    {
      workflowId: "3456789012abcdef",
      createTime: "2024-01-24T15:15:00Z",
      conclusion: "success",
      timeToRedSignal: null,
      repo: "pytorch/pytorch",
      commitMessage: "[CI] Update CUDA 12.1 build environment",
      author: "seemethere",
      prNumber: "145158"
    },
    {
      workflowId: "4567890123abcdef",
      createTime: "2024-01-24T15:01:00Z",
      conclusion: "failure",
      timeToRedSignal: 20,
      repo: "pytorch/vision",
      commitMessage: "[MPS] Fix memory leak in pooling operations",
      author: "malfet",
      prNumber: "145157"
    },
    {
      workflowId: "5678901234abcdef",
      createTime: "2024-01-24T14:55:00Z",
      conclusion: "success",
      timeToRedSignal: null,
      repo: "pytorch/audio",
      commitMessage: "[Doc] Update distributed training tutorial",
      author: "mrshenli",
      prNumber: "145156"
    },
    {
      workflowId: "6789012345abcdef",
      createTime: "2024-01-24T14:43:00Z",
      conclusion: "failure",
      timeToRedSignal: 10,
      repo: "pytorch/text",
      commitMessage: "[Autograd] Fix gradient computation for complex tensors",
      author: "kshitij12345",
      prNumber: "145155"
    },
    {
      workflowId: "7890123456abcdef",
      createTime: "2024-01-24T14:31:00Z",
      conclusion: "failure",
      timeToRedSignal: null,
      repo: "pytorch/pytorch",
      commitMessage: "[ROCm] Update HIP compiler version",
      author: "jeffdaily",
      prNumber: "145154"
    },
    {
      workflowId: "8901234567abcdef",
      createTime: "2024-01-24T14:22:00Z",
      conclusion: "success",
      timeToRedSignal: null,
      repo: "pytorch/vision",
      commitMessage: "[Test] Add benchmarks for transformer inference",
      author: "chunyuan-w",
      prNumber: "145153"
    },
    {
      workflowId: "9012345678abcdef",
      createTime: "2024-01-24T14:15:00Z",
      conclusion: "failure",
      timeToRedSignal: 25,
      repo: "pytorch/pytorch",
      commitMessage: "Fix tests broken by #145176",
      author: "aorenste",
      prNumber: "145393"
    },
    {
      workflowId: "0123456789abcdef",
      createTime: "2024-01-24T14:01:00Z",
      conclusion: "failure",
      timeToRedSignal: 30,
      repo: "pytorch/audio",
      commitMessage: "[MPSInductor] Add `gamma` op",
      author: "malfet",
      prNumber: "145341"
    },
    {
      workflowId: "abcdef1234567890",
      createTime: "2024-01-24T13:45:00Z",
      conclusion: "success",
      timeToRedSignal: null,
      repo: "pytorch/text",
      commitMessage: "[audio hash update] Update the pinned audio hash",
      author: "pytorchupdates",
      prNumber: "145328"
    },
    {
      workflowId: "bcdef1234567890a",
      createTime: "2024-01-24T13:31:00Z",
      conclusion: "failure",
      timeToRedSignal: null,
      repo: "pytorch/pytorch",
      commitMessage: "[Doc] Add period at the end of the sentence",
      author: "malfet",
      prNumber: "145384"
    },
    {
      workflowId: "cdef1234567890ab",
      createTime: "2024-01-24T13:15:00Z",
      conclusion: "success",
      timeToRedSignal: null,
      repo: "pytorch/vision",
      commitMessage: "[BE] Simplify set add with set update",
      author: "ScottTodd",
      prNumber: "145152"
    },
    {
      workflowId: "def1234567890abc",
      createTime: "2024-01-24T13:01:00Z",
      conclusion: "failure",
      timeToRedSignal: 18,
      repo: "pytorch/pytorch",
      commitMessage: "[dynamo] Fix numpy test accuracy error index",
      author: "StrongerXi",
      prNumber: "145293"
    },
    {
      workflowId: "ef1234567890abcd",
      createTime: "2024-01-24T12:45:00Z",
      conclusion: "success",
      timeToRedSignal: null,
      repo: "pytorch/audio",
      commitMessage: "Binary upload checksum",
      author: "clee2000",
      prNumber: "144887"
    },
    {
      workflowId: "f1234567890abcde",
      createTime: "2024-01-24T12:31:00Z",
      conclusion: "failure",
      timeToRedSignal: 22,
      repo: "pytorch/text",
      commitMessage: "[NVIDIA] Jetson Thor Blackwell Support",
      author: "johnnynunez",
      prNumber: "145395"
    },
    {
      workflowId: "1234567890abcdef1",
      createTime: "2024-01-24T12:15:00Z",
      conclusion: "failure",
      timeToRedSignal: null,
      repo: "pytorch/pytorch",
      commitMessage: "Reverting the PR adding Kleidiai-based int4 support",
      author: "albanD",
      prNumber: "145392"
    },
    {
      workflowId: "2345678901abcdef2",
      createTime: "2024-01-24T12:01:00Z",
      conclusion: "success",
      timeToRedSignal: null,
      repo: "pytorch/vision",
      commitMessage: "[Test][Inductor] Fix test_tma_graph_breaks",
      author: "Aidyn-A",
      prNumber: "145271"
    },
    {
      workflowId: "3456789012abcdef3",
      createTime: "2024-01-24T11:45:00Z",
      conclusion: "failure",
      timeToRedSignal: 12,
      repo: "pytorch/pytorch",
      commitMessage: "[export][be] Clean up local imports from export",
      author: "zhxchen17",
      prNumber: "145287"
    },
    {
      workflowId: "4567890123abcdef4",
      createTime: "2024-01-24T11:31:00Z",
      conclusion: "success",
      timeToRedSignal: null,
      repo: "pytorch/audio",
      commitMessage: "Move Dynamo test to skip from expected_failures",
      author: "zou3519",
      prNumber: "145390"
    },
    {
      workflowId: "5678901234abcdef5",
      createTime: "2024-01-24T11:15:00Z",
      conclusion: "failure",
      timeToRedSignal: 28,
      repo: "pytorch/text",
      commitMessage: "Align CPU behavior with CUDA for `ConvTranpose`",
      author: "chunyuan-w",
      prNumber: "142859"
    },
    {
      workflowId: "6789012345abcdef6",
      createTime: "2024-01-24T11:01:00Z",
      conclusion: "success",
      timeToRedSignal: null,
      repo: "pytorch/pytorch",
      commitMessage: "[AMP] Fix scaling for mixed precision training",
      author: "masahi",
      prNumber: "145151"
    },
    {
      workflowId: "7890123456abcdef7",
      createTime: "2024-01-24T10:45:00Z",
      conclusion: "failure",
      timeToRedSignal: 15,
      repo: "pytorch/vision",
      commitMessage: "[Inductor] Support more fusion patterns",
      author: "jansel",
      prNumber: "145150"
    },
    {
      workflowId: "8901234567abcdef8",
      createTime: "2024-01-24T10:31:00Z",
      conclusion: "success",
      timeToRedSignal: null,
      repo: "pytorch/pytorch",
      commitMessage: "[Doc] Fix broken links in C++ API docs",
      author: "malfet",
      prNumber: "145149"
    },
    {
      workflowId: "9012345678abcdef9",
      createTime: "2024-01-24T10:15:00Z",
      conclusion: "failure",
      timeToRedSignal: 20,
      repo: "pytorch/audio",
      commitMessage: "[BC Breaking] Update deprecated torch.fft APIs",
      author: "peterbell10",
      prNumber: "145148"
    }
  ];

  // useEffect stays the same...
  useEffect(() => {
    const fetchData = async () => {
      try {
        const queryParams = new URLSearchParams({
          days: '7',
          repo: selectedRepo === 'all' ? '' : selectedRepo
        });
        
        // For development, use mock data
        // const response = await fetch(`${API_BASE_URL}/metrics/workflow-runs?${queryParams}`);
        // if (!response.ok) throw new Error('Failed to fetch workflow data');
        // const data = await response.json();
        const data = mockData;
        
        const transformedData = data.map(run => ({
          time: new Date(run.createTime).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          }),
          sha: run.workflowId.substring(0, 7),
          commit: run.commitMessage,
          conclusion: run.conclusion,
          repo: run.repo || 'pytorch/pytorch',
          pr: `#${run.prNumber}`,
          author: run.author,
          deepLink: `https://github.com/${run.repo}/commit/${run.workflowId}`,
          results: {
            'Linux': run.conclusion === 'success' ? 'O' : run.conclusion === 'failure' ? 'X' : '?',
            'Win': run.conclusion === 'success' ? 'O' : run.conclusion === 'failure' ? 'X' : '?',
            'Mac': run.conclusion === 'success' ? 'O' : run.conclusion === 'failure' ? 'X' : '?',
            'ROC': run.conclusion === 'success' ? 'O' : run.conclusion === 'failure' ? 'X' : '~',
            'Doc': run.conclusion === 'success' ? 'O' : run.conclusion === 'failure' ? 'X' : '?',
            'Lint': run.conclusion === 'success' ? 'O' : '?',
            'Test': run.timeToRedSignal ? 'F' : run.conclusion === 'success' ? 'O' : 'X'
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
          <button className="px-3 py-1 border rounded text-sm bg-gray-50">Go</button>
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
                  <a 
                    href={`https://github.com/${run.repo}/pull/${run.pr.substring(1)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {run.pr}
                  </a>
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