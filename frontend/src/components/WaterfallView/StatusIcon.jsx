import React from 'react';

const StatusIcon = ({ status }) => {
  switch (status) {
    case 'O':
      return <span className="text-green-500">●</span>;
    case 'X':
      return <span className="text-red-500">✕</span>;
    default:
      return <span className="text-gray-400">○</span>;
  }
};

export default StatusIcon;


// import React from 'react';

// const StatusIcon = ({ status }) => {
//   // Map status to display character and color
//   const getStatusStyle = () => {
//     switch (status) {
//       case 'O':
//         return 'text-green-600'; // Success green
//       case 'X':
//         return 'text-red-600';   // Failure red
//       case '?':
//         return 'text-yellow-500'; // Question mark yellow
//       case 'F':
//         return 'text-orange-500'; // Flaky orange
//       case '~':
//         return 'text-gray-400';   // Skip/not applicable gray
//       default:
//         return 'text-gray-300';
//     }
//   };

//   // Map status to display character
//   const getSymbol = () => {
//     switch (status) {
//       case 'O':
//         return '●'; // Filled circle for success
//       case 'X':
//         return '✕'; // X for failure
//       case '?':
//         return '?'; // Question mark for unknown
//       case 'F':
//         return 'F'; // F for flaky
//       case '~':
//         return '–'; // En dash for skipped
//       default:
//         return '–';
//     }
//   };

//   return (
//     <span className={`
//       ${getStatusStyle()}
//       inline-block
//       font-bold
//       leading-none
//       min-w-[1.25rem]
//       text-center
//     `}>
//       {getSymbol()}
//     </span>
//   );
// };

// export default StatusIcon;