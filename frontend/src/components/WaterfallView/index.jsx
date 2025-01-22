// src/components/WaterfallView/index.jsx
import React, { useState } from 'react';
import StatusIcon from './StatusIcon';
import dashboardData from '../../data/dashboard-data.json';

const WaterfallView = () => {
  const [filter, setFilter] = useState('');
  const [settings, setSettings] = useState({
    groupedView: true,
    hideUnstable: false,
    condenseLF: true,
    monsterizeFailures: false
  });

  const commits = [
    {
      time: '1/15/2025, 10:49:29 AM',
      sha: '3032df2',
      author: 'ScottTodd',
      results: {
        'CI': 'O',
        'TEST': '?',
        'LINT': '?',
        'BUILD': '?',
        'FULL': 'O'
      }
    },
    {
      time: '1/15/2025, 8:44:00 AM',
      sha: 'c285d58',
      author: 'ScottTodd',
      results: {
        'CI': 'O'
      }
    },
    {
      time: '1/15/2025, 6:01:33 AM',
      sha: '3c95042',
      author: 'ScottTodd',
      results: {
        'FULL': 'O'
      }
    },
    {
      time: '1/15/2025, 1:23:41 AM',
      sha: '3c95042',
      author: 'ScottTodd',
      results: {}
    },
    {
      time: '1/15/2025, 1:22:13 AM',
      sha: '3c95042',
      author: 'ScottTodd',
      results: {}
    },
    {
      time: '1/15/2025, 1:21:36 AM',
      sha: '3c95042',
      author: 'marbre',
      results: {}
    },
    {
      time: '1/15/2025, 12:22:46 AM',
      sha: '3c95042',
      author: 'saiendun',
      results: {
        'CI': 'O'
      }
    },
    {
      time: '1/14/2025, 10:01:44 PM',
      sha: '27e7a90',
      author: 'Elias42',
      results: {}
    }
  ];

  // Define workflow columns - match your needs
  const workflows = ['CI', 'PR', 'MAC', 'ROC', 'BLD', 'LINT', 'TEST', 'DOC', 'CAF', 'MOB', 'ONN', 'IND', 'PTH'];

  const filteredCommits = commits.filter(commit => {
    if (!filter) return true;
    return (
      commit.author?.toLowerCase().includes(filter.toLowerCase()) ||
      commit.sha?.toLowerCase().includes(filter.toLowerCase())
    );
  });

  return (
    <div className="p-4">
      {/* Filter and Settings */}
      <div className="mb-6 space-y-4">
        <input
          type="text"
          placeholder="Filter commits..."
          className="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.groupedView}
              onChange={(e) => setSettings(prev => ({...prev, groupedView: e.target.checked}))}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Grouped View</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.hideUnstable}
              onChange={(e) => setSettings(prev => ({...prev, hideUnstable: e.target.checked}))}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Hide Unstable</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.condenseLF}
              onChange={(e) => setSettings(prev => ({...prev, condenseLF: e.target.checked}))}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Condense LF</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.monsterizeFailures}
              onChange={(e) => setSettings(prev => ({...prev, monsterizeFailures: e.target.checked}))}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Monsterize Failures</span>
          </label>
        </div>
      </div>

      {/* Waterfall Table */}
      <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">SHA</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
              {workflows.map(workflow => (
                <th key={workflow} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                  {workflow}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCommits.map((commit, idx) => (
              <tr key={`${commit.sha}-${commit.time}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">
                  {commit.time}
                </td>
                <td className="px-3 py-2 text-sm whitespace-nowrap">
                  <a 
                    href={`#${commit.sha}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {commit.sha}
                  </a>
                </td>
                <td className="px-3 py-2 text-sm text-gray-500">
                  {commit.author}
                </td>
                {workflows.map(workflow => (
                  <td key={workflow} className="px-2 py-2">
                    <div className="flex justify-center">
                      <StatusIcon status={commit.results[workflow] || '~'} />
                    </div>
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