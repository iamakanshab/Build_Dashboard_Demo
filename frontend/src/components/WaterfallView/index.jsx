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