# Build Dashboard Demo

A real-time build dashboard that tracks and visualizes workflow metrics using a Git-based listener and Azure SQL Database backend, deployed on AWS.

## Architecture

- **Frontend**: React-based dashboard interface
- **Backend**: Node.js server with Git webhook listener
- **Database**: Azure SQL Server
- **Hosting**: AWS EC2
- **Real-time Updates**: Git webhook integration

## Prerequisites

- Node.js v14 or higher
- Git
- AWS Account
- Azure SQL Database access

## Environment Variables

Create a `.env` file in the root directory:

```env
DB_HOST=dashboard-backend.database.windows.net
DB_NAME=dashboard-backend
DB_USER=CloudSA9134000b
DB_PORT=1433
```

Note: Never commit sensitive credentials to version control.

## Installation

1. Clone the repository:
```bash
git clone https://github.com/iamakanshab/Build_Dashboard_Demo.git
cd Build_Dashboard_Demo
```

2. Install dependencies:
```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

## Development Setup

1. Start the frontend development server:
```bash
cd frontend
npm start
```

2. Start the backend server:
```bash
cd backend
npm run dev
```

## Deployment

### AWS EC2 Deployment Steps

1. Set up EC2 instance with security groups
2. Configure Azure SQL Server firewall rules
3. Install dependencies on EC2
4. Set up PM2 for process management
5. Configure Nginx as reverse proxy

Detailed deployment instructions can be found in the [deployment guide](./docs/deployment.md).

## Project Structure

```
├── frontend/            # React frontend application
│   ├── src/            # Source files
│   ├── public/         # Static files
│   └── package.json    # Frontend dependencies
├── backend/            # Node.js backend server
│   ├── src/           # Source files
│   ├── listeners/     # Git webhook listeners
│   └── package.json   # Backend dependencies
└── docs/              # Documentation
```

## Features

- Real-time build status updates
- Workflow metrics visualization
- Historical build data tracking
- Git integration for automated updates
- Cross-cloud architecture (AWS + Azure)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Azure SQL Server for database hosting
- AWS for cloud infrastructure
- Node.js community for excellent tools and libraries

## Support
