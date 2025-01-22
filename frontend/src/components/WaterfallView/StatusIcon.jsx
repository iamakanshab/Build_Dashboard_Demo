// src/components/WaterfallView/StatusIcon.jsx
import React from 'react';

const StatusIcon = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'O':
        return 'bg-green-500'; // Success - Green circle
      case 'X':
        return 'bg-red-500';   // Failure - Red X
      case '?':
        return 'bg-yellow-500'; // Unknown/Pending - Yellow question mark
      case '~':
        return 'bg-gray-300';   // Skipped/Not applicable - Gray dash
      default:
        return 'bg-gray-200';
    }
  };

  const getContent = () => {
    switch (status) {
      case 'O':
        return 'O';
      case 'X':
        return 'X';
      case '?':
        return '?';
      case '~':
        return '~';
      default:
        return '';
    }
  };

  return (
    <div className={`
      w-6 h-6 
      flex items-center justify-center 
      ${getStatusColor()} 
      text-white text-sm font-bold 
      rounded-full
    `}>
      {getContent()}
    </div>
  );
};

export default StatusIcon;

