import React, { useState } from 'react';
import StatusIcon from './StatusIcon';

const WaterfallView = () => {
  const [filter, setFilter] = useState('');
  const [settings, setSettings] = useState({
    groupedView: true,
    hideUnstable: false,
    condenseLF: true,
    monsterizeFailures: false
  });

  // Mock data matching the screenshot format
  const commits = [
    {
      time: '3:45 pm',
      sha: 'f2e1d9a',
      commit: '[Functorch] Fix vmap broadcasting for scalar tensors',
      pr: '#145160',
      author: 'zou3519',
      results: {
        'Linux': 'O',
        'Win': '?',
        'Mac': '?',
        'ROC': '~',
        'Doc': 'O',
        'Lint': 'O',
        'Test': '?'
      }
    },
    {
      time: '3:32 pm',
      sha: 'c4d2e8b',
      commit: '[dynamo] Improve error messages for graph breaks',
      pr: '#145159',
      author: 'jansel',
      results: {
        'Linux': 'X',
        'Win': 'X',
        'Mac': '?',
        'ROC': 'X',
        'Doc': 'O',
        'Lint': 'O',
        'Test': 'X'
      }
    },
    {
      time: '3:15 pm',
      sha: 'b9a7f12',
      commit: '[CI] Update CUDA 12.1 build environment',
      pr: '#145158',
      author: 'seemethere',
      results: {
        'Linux': 'O',
        'Win': 'O',
        'Mac': '~',
        'ROC': '~',
        'Doc': 'O',
        'Lint': 'O',
        'Test': 'O'
      }
    },
    {
      time: '3:01 pm',
      sha: 'e7c6d4f',
      commit: '[MPS] Fix memory leak in pooling operations',
      pr: '#145157',
      author: 'malfet',
      results: {
        'Linux': '~',
        'Win': '~',
        'Mac': 'X',
        'ROC': '~',
        'Doc': 'O',
        'Lint': 'O',
        'Test': 'X'
      }
    },
    {
      time: '2:55 pm',
      sha: 'a1b2c3d',
      commit: '[Doc] Update distributed training tutorial',
      pr: '#145156',
      author: 'mrshenli',
      results: {
        'Linux': 'O',
        'Win': 'O',
        'Mac': 'O',
        'ROC': '~',
        'Doc': 'O',
        'Lint': 'O',
        'Test': 'O'
      }
    },
    {
      time: '2:43 pm',
      sha: 'd4e5f6a',
      commit: '[Autograd] Fix gradient computation for complex tensors',
      pr: '#145155',
      author: 'kshitij12345',
      results: {
        'Linux': 'O',
        'Win': 'X',
        'Mac': '?',
        'ROC': 'X',
        'Doc': 'O',
        'Lint': 'O',
        'Test': 'F'
      }
    },
    {
      time: '2:31 pm',
      sha: '1a2b3c4',
      commit: '[ROCm] Update HIP compiler version',
      pr: '#145154',
      author: 'jeffdaily',
      results: {
        'Linux': 'O',
        'Win': '~',
        'Mac': '~',
        'ROC': 'X',
        'Doc': 'O',
        'Lint': 'O',
        'Test': 'X'
      }
    },
    {
      time: '2:22 pm',
      sha: '7g8h9i0',
      commit: '[Test] Add benchmarks for transformer inference',
      pr: '#145153',
      author: 'chunyuan-w',
      results: {
        'Linux': 'O',
        'Win': 'O',
        'Mac': 'O',
        'ROC': 'O',
        'Doc': 'O',
        'Lint': 'O',
        'Test': 'O'
      }
    },
    {
      time: '2:31 pm',
      sha: 'b812095',
      commit: 'Fix tests broken by #145176 (#145393)',
      pr: '#145393',
      author: 'aorenste',
      results: {
        'Linux': 'O',
        'Win': 'X',
        'Mac': '?',
        'ROC': 'X',
        'Doc': '?',
        'Lint': 'O',
        'Test': '?'
      }
    },
    {
      time: '2:15 pm',
      sha: '70ccbad',
      commit: '[MPSInductor] Add `gamma` op (#145341)',
      pr: '#145341',
      author: 'malfet',
      results: {
        'Linux': 'X',
        'Win': 'X',
        'Mac': '?',
        'ROC': 'X',
        'Doc': '?',
        'Lint': 'O',
        'Test': 'X'
      }
    },
    {
      time: '2:01 pm',
      sha: '3917053',
      commit: '[audio hash update] update the pinned audio hash',
      pr: '#145328',
      author: 'pytorchupdates',
      results: {
        'Linux': 'O',
        'Win': 'X',
        'Mac': '?',
        'ROC': '?',
        'Doc': 'X',
        'Lint': '?',
        'Test': 'O'
      }
    },
    {
      time: '1:45 pm',
      sha: '95ff9f0',
      commit: '[Doc] Add period at the end of the sentence',
      pr: '#145384',
      author: 'malfet',
      results: {
        'Linux': 'X',
        'Win': 'X',
        'Mac': '?',
        'ROC': '?',
        'Doc': 'X',
        'Lint': 'X',
        'Test': 'O'
      }
    },
    {
      time: '1:31 pm',
      sha: '3032df2',
      commit: '[BE] Simplify set add with set update',
      pr: '#145152',
      author: 'ScottTodd',
      results: {
        'Linux': 'O',
        'Win': '?',
        'Mac': '?',
        'ROC': '?',
        'Doc': '?',
        'Lint': '?',
        'Test': '~'
      }
    },
    {
      time: '12:53 pm',
      sha: '9f15078',
      commit: '[dynamo] Fix numpy test accuracy error index',
      pr: '#145293',
      author: 'StrongerXi',
      results: {
        'Linux': 'O',
        'Win': '?',
        'Mac': '?',
        'ROC': '?',
        'Doc': '?',
        'Lint': 'O',
        'Test': '~'
      }
    },
    {
      time: '12:46 pm',
      sha: '2cfa98d',
      commit: 'Binary upload checksum (#144887)',
      pr: '#144887',
      author: 'clee2000',
      results: {
        'Linux': 'O',
        'Win': '?',
        'Mac': '?',
        'ROC': '?',
        'Doc': '?',
        'Lint': 'O',
        'Test': '~'
      }
    },
    {
      time: '12:13 pm',
      sha: 'a57133e',
      commit: '[NVIDIA] Jetson Thor Blackwell Support',
      pr: '#145395',
      author: 'johnnynunez',
      results: {
        'Linux': 'O',
        'Win': '?',
        'Mac': '?',
        'ROC': '?',
        'Doc': '?',
        'Lint': 'O',
        'Test': '?'
      }
    },
    {
      time: '12:11 pm',
      sha: '0940eb6',
      commit: 'Reverting the PR adding Kleidiai-based int4 support',
      pr: '#145392',
      author: 'albanD',
      results: {
        'Linux': 'O',
        'Win': 'X',
        'Mac': '?',
        'ROC': '?',
        'Doc': '?',
        'Lint': 'O',
        'Test': '?'
      }
    },
    {
      time: '11:56 am',
      sha: 'e8e3c03',
      commit: '[Test][Inductor] Fix test_tma_graph_breaks',
      pr: '#145271',
      author: 'Aidyn-A',
      results: {
        'Linux': 'O',
        'Win': 'X',
        'Mac': '?',
        'ROC': 'X',
        'Doc': 'X',
        'Lint': 'O',
        'Test': 'F'
      }
    },
    {
      time: '11:33 am',
      sha: 'ac8ddf1',
      commit: '[export][be] Clean up local imports from export',
      pr: '#145287',
      author: 'zhxchen17',
      results: {
        'Linux': 'O',
        'Win': 'X',
        'Mac': 'O',
        'ROC': 'X',
        'Doc': '?',
        'Lint': 'O',
        'Test': 'O'
      }
    },
    {
      time: '11:09 am',
      sha: '30717d2',
      commit: 'Move Dynamo test to skip from expected_failures',
      pr: '#145390',
      author: 'zou3519',
      results: {
        'Linux': 'O',
        'Win': 'X',
        'Mac': '?',
        'ROC': 'X',
        'Doc': '?',
        'Lint': 'O',
        'Test': '?'
      }
    },
    {
      time: '11:06 am',
      sha: '0bff377',
      commit: 'Align CPU behavior with CUDA for `ConvTranpose`',
      pr: '#142859',
      author: 'chunyuan-w',
      results: {
        'Linux': 'O',
        'Win': 'X',
        'Mac': 'O',
        'ROC': 'O',
        'Doc': 'X',
        'Lint': 'X',
        'Test': 'O'
      }
    },
    {
      time: '10:55 am',
      sha: 'j4k5l6m',
      commit: '[AMP] Fix scaling for mixed precision training',
      pr: '#145151',
      author: 'masahi',
      results: {
        'Linux': 'O',
        'Win': 'O',
        'Mac': 'O',
        'ROC': 'O',
        'Doc': 'O',
        'Lint': 'O',
        'Test': 'O'
      }
    },
    {
      time: '10:41 am',
      sha: 'n7m8p9q',
      commit: '[Inductor] Support more fusion patterns',
      pr: '#145150',
      author: 'jansel',
      results: {
        'Linux': 'X',
        'Win': 'X',
        'Mac': 'X',
        'ROC': 'X',
        'Doc': 'O',
        'Lint': 'O',
        'Test': 'X'
      }
    },
    {
      time: '10:32 am',
      sha: 'r1s2t3u',
      commit: '[Doc] Fix broken links in C++ API docs',
      pr: '#145149',
      author: 'malfet',
      results: {
        'Linux': 'O',
        'Win': 'O',
        'Mac': 'O',
        'ROC': '~',
        'Doc': 'O',
        'Lint': 'O',
        'Test': '~'
      }
    },
    {
      time: '10:15 am',
      sha: 'v4w5x6y',
      commit: '[BC Breaking] Update deprecated torch.fft APIs',
      pr: '#145148',
      author: 'peterbell10',
      results: {
        'Linux': 'O',
        'Win': 'X',
        'Mac': '?',
        'ROC': 'X',
        'Doc': 'O',
        'Lint': 'X',
        'Test': 'F'
      }
    },
    {
      time: '10:03 am',
      sha: 'z9a8b7c',
      commit: '[Quantization] Add support for per-channel quantization',
      pr: '#145147',
      author: 'jerryzh168',
      results: {
        'Linux': 'O',
        'Win': '?',
        'Mac': '?',
        'ROC': '?',
        'Doc': 'O',
        'Lint': 'O',
        'Test': '?'
      }
    },
    {
      time: '9:55 am',
      sha: 'd6e5f4g',
      commit: '[CUDA] Optimize memory allocator for large tensors',
      pr: '#145146',
      author: 'soumith',
      results: {
        'Linux': 'O',
        'Win': 'O',
        'Mac': '~',
        'ROC': 'O',
        'Doc': 'O',
        'Lint': 'O',
        'Test': 'O'
      }
    },
    {
      time: '9:41 am',
      sha: 'h3i2j1k',
      commit: '[NN] Add Mamba layer implementation',
      pr: '#145145',
      author: 'albanD',
      results: {
        'Linux': 'X',
        'Win': 'X',
        'Mac': '?',
        'ROC': 'X',
        'Doc': 'O',
        'Lint': 'O',
        'Test': 'X'
      }
    },
    {
      time: '9:32 am',
      sha: 'l4m5n6o',
      commit: '[Build] Fix Windows MSVC compilation errors',
      pr: '#145144',
      author: 'ezyang',
      results: {
        'Linux': '~',
        'Win': 'O',
        'Mac': '~',
        'ROC': '~',
        'Doc': 'O',
        'Lint': 'O',
        'Test': 'O'
      }
    },
    {
      time: '9:15 am',
      sha: 'p7q8r9s',
      commit: '[Distributed] Improve error handling in NCCL backend',
      pr: '#145143',
      author: 'mrshenli',
      results: {
        'Linux': 'O',
        'Win': 'O',
        'Mac': 'O',
        'ROC': 'O',
        'Doc': 'O',
        'Lint': 'O',
        'Test': 'F'
      }
    },
    {
      time: '9:01 am',
      sha: 't0u1v2w',
      commit: '[Test] Add more coverage for autograd edge cases',
      pr: '#145142',
      author: 'kshitij12345',
      results: {
        'Linux': 'O',
        'Win': '?',
        'Mac': '?',
        'ROC': '?',
        'Doc': 'O',
        'Lint': 'O',
        'Test': '?'
      }
    }
    
  ];

  // Define workflow columns matching the screenshot
  const workflows = ['Linux', 'Win', 'Mac', 'ROC', 'Doc', 'Lint', 'Test'];

  const filteredCommits = commits.filter(commit => {
    if (!filter) return true;
    return (
      commit.author?.toLowerCase().includes(filter.toLowerCase()) ||
      commit.sha?.toLowerCase().includes(filter.toLowerCase()) ||
      commit.commit?.toLowerCase().includes(filter.toLowerCase())
    );
  });

  return (
    <div className="p-4">
      {/* Header */}
      <h1 className="text-xl font-semibold mb-4">GitHub Workflow Dashboard</h1>
      
      {/* Navigation */}
      <div className="flex justify-end mb-4 space-x-4">
        <a href="#" className="text-blue-600 font-medium">Waterfall View</a>
        <a href="#" className="text-gray-600">Metrics Dashboard</a>
      </div>

      {/* Filter and Settings */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <input
            type="text"
            placeholder="Job filter..."
            className="px-2 py-1 border rounded text-sm w-64"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <button className="px-3 py-1 border rounded text-sm bg-gray-50">Go</button>
        </div>
        
        <div className="flex gap-4 text-sm">
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
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={settings.monsterizeFailures}
              onChange={(e) => setSettings(prev => ({...prev, monsterizeFailures: e.target.checked}))}
            />
            Monsterize failures
          </label>
        </div>
      </div>

      {/* Waterfall Table */}
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
            {filteredCommits.map((commit, idx) => (
              <tr key={`${commit.sha}-${commit.time}`} className="border-t border-gray-100">
                <td className="px-2 py-1 text-gray-500 whitespace-nowrap">
                  {commit.time}
                </td>
                <td className="px-2 py-1 font-mono whitespace-nowrap">
                  <a href={`#${commit.sha}`} className="text-blue-600 hover:underline">
                    {commit.sha}
                  </a>
                </td>
                <td className="px-2 py-1">
                  <a href={`#${commit.sha}`} className="text-blue-600 hover:underline">
                    {commit.commit}
                  </a>
                </td>
                <td className="px-2 py-1">
                  <a href={`#${commit.pr}`} className="text-blue-600 hover:underline">
                    {commit.pr}
                  </a>
                </td>
                <td className="px-2 py-1 text-gray-500">
                  {commit.author}
                </td>
                {workflows.map(workflow => (
                  <td key={workflow} className="px-1 py-1 text-center">
                    <StatusIcon status={commit.results[workflow] || '~'} />
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