# Build Dashboard Deployment Guide

## System Overview
The Build Dashboard system provides comprehensive monitoring across multiple repositories through two specialized views: a high-level waterfall view for quick status assessment, and a developer-focused view for tracking individual metrics and code reviews. The platform delivers real-time updates through Webhooks, enabling immediate visibility into build statuses, force merges, and critical events. 

Users can configure repository-specific settings and customize metric collections while receiving automated alerts for threshold breaches in build failures, queue times, and infrastructure health. The system integrates deeply with GitHub and CI systems to collect, process, and analyze build performance data, offering trending analysis and historical reporting capabilities that help teams maintain optimal build system health and development workflow efficiency.

## Table of Contents
1. [Change Deployment Overview](#change-deployment-overview)
   - [Frontend Changes](#frontend-changes)
   - [Backend Changes](#backend-changes)
2. [Prerequisites](#prerequisites)
3. [Initial Setup Guide](#initial-setup-guide)
   - [System Setup](#1-system-setup)
   - [Application Setup](#2-application-setup)
   - [Database Configuration](#3-configure-database)
   - [Service Setup](#4-setup-service)
4. [Data Model](#data-model)
5. [Monitoring](#monitoring)
6. [Troubleshooting](#troubleshooting)
7. [Contact and Support](#contact-and-support)

## Change Deployment Overview

### Frontend Changes
When you make changes to the frontend code:
1. Automated deployment triggers when you push to `main` branch
2. GitHub Actions workflow:
   - Builds the React application
   - Copies build files to backend directory
   - Restarts the service

Manual deployment (if needed):
```bash
cd ~/app/Build_Dashboard_Demo/frontend
git pull origin main
npm install
npm run build
cp -r build ../backend/
sudo systemctl restart dashboard
```

### Backend Changes
When you modify backend components (app.py, listener, SQL queries):
1. Automated deployment triggers when you push to `main` branch
2. GitHub Actions workflow:
   - Updates Python dependencies
   - Restarts the dashboard service (which includes the listener)
   - New SQL queries are loaded automatically on service restart

Manual deployment (if needed):
```bash
cd ~/app/Build_Dashboard_Demo/backend
git pull origin main
sudo pip3 install -r requirements.txt
sudo systemctl restart dashboard
```

## Prerequisites
- AWS EC2 instance running Ubuntu
- Python 3.x
- Node.js (v18+)
- MySQL database (AWS RDS)
- Domain name (optional, for SSL)

## Initial Setup Guide

### 1. System Setup
```bash
# Update and install required packages
sudo apt-get update
sudo apt-get install -y python3-pip git nodejs npm

# Install Node.js 18
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

### 2. Application Setup
```bash
# Clone repository
mkdir -p ~/app && cd ~/app
git clone https://your-repo-url.git Build_Dashboard_Demo
cd Build_Dashboard_Demo

# Setup frontend
cd frontend
npm install
npm run build
cp -r build ../backend/

# Setup backend
cd ../backend
sudo pip3 install flask flask-cors mysql-connector-python
```

### 3. Configure Database
Update `app.py` with database credentials:
```python
db_config = {
    'host': 'your-rds-endpoint',
    'user': 'admin',
    'password': 'your-password',
    'database': 'shark_dashboard_db',
    'port': 3306
}
```

### 4. Setup Service
Create systemd service file:
```bash
sudo nano /etc/systemd/system/dashboard.service
```

Add configuration:
```ini
[Unit]
Description=Dashboard App
After=network.target

[Service]
User=root
WorkingDirectory=/home/ubuntu/app/Build_Dashboard_Demo/backend
Environment=FLASK_ENV=production
ExecStart=/usr/bin/python3 app.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable dashboard
sudo systemctl start dashboard
```
## Data Model

### Database Overview
The Build Dashboard uses a MySQL database (shark_dashboard_db) to track GitHub workflows, repositories, commits, and branches. The schema is designed to efficiently capture CI/CD metrics and relationships between different GitHub entities.

### Schema Design

#### Repositories (repos)
```sql
CREATE TABLE repos (
    Id    int          PRIMARY KEY AUTO_INCREMENT,
    name  varchar(50)  UNIQUE
);
```
The `repos` table serves as the central reference for all repositories being monitored.

#### Workflows
```sql
CREATE TABLE workflows (
    Id    int           PRIMARY KEY AUTO_INCREMENT,
    name  varchar(50)   UNIQUE NOT NULL,
    url   varchar(100)  NOT NULL,
    repo  varchar(50)   NOT NULL
);
```
Tracks GitHub workflow definitions within each repository.

#### Workflow Runs (workflowruns)
```sql
CREATE TABLE workflowruns (
    Id           int           PRIMARY KEY AUTO_INCREMENT,
    gitid        bigint       UNIQUE NOT NULL,
    author       varchar(50),
    runtime      float,
    createtime   datetime,
    starttime    datetime,
    endtime      datetime,
    queuetime    bigint       DEFAULT 0,
    status       varchar(50),
    conclusion   varchar(50),
    url          varchar(100),
    branchname   varchar(100),
    commithash   varchar(100),
    workflowname varchar(50),
    repo         varchar(50)  NOT NULL,
    os           varchar(100)
);
```
The central table tracking execution metrics for each workflow run.

#### Branches
```sql
CREATE TABLE branches (
    Id     int          PRIMARY KEY AUTO_INCREMENT,
    name   varchar(50)  UNIQUE NOT NULL,
    author varchar(50),
    repo   varchar(50)  NOT NULL
);
```
Tracks active branches across repositories.

#### Commits
```sql
CREATE TABLE commits (
    Id      int           PRIMARY KEY AUTO_INCREMENT,
    hash    varchar(100)  UNIQUE NOT NULL,
    author  varchar(50),
    message text,
    time    datetime,
    repo    varchar(50)  NOT NULL
);
```
Records commit history and metadata.

### Key Relationships
- Each workflow run is associated with a specific repository through the `repo` field
- Workflow runs link to specific commits via `commithash`
- Branches are tied to repositories through the `repo` field
- Commits are connected to their repositories via the `repo` field

### Data Flow
1. GitHub webhooks trigger updates to the database
2. The listener script processes webhook payloads and updates relevant tables
3. The Flask backend queries this data to power the dashboard views
4. The frontend visualizes the data through various views (waterfall, triage, developer)

## Monitoring

### Check Deployment Status
```bash
# View GitHub Actions status
Browse to GitHub repository > Actions tab

# Check service status
sudo systemctl status dashboard

# View application logs
sudo journalctl -u dashboard -f
tail -f /home/ubuntu/app/Build_Dashboard_Demo/backend/app.log
```

## Troubleshooting

### Common Issues
1. Service won't start:
   ```bash
   sudo journalctl -u dashboard -f
   sudo chown -R ubuntu:ubuntu /home/ubuntu/app
   ```

2. Database connection issues:
   ```bash
   mysql -h your-rds-endpoint -u admin -p shark_dashboard_db
   ```

3. Application not accessible:
   ```bash
   sudo systemctl status dashboard
   sudo lsof -i :80
   ```

## Contact and Support
- GitHub Issues: [Repository Issues Page] 
- Email: [Support Email] aig-infra@amd.com [email alias]
- Documentation: [Wiki/Docs Link] https://confluence.amd.com/display/SHARK/Build+Metrics+Dashboard
  
