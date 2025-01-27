# Build Dashboard Deployment Guide

## Overview
This document outlines the deployment process for the Build Dashboard application, which consists of a React frontend and Flask backend with MySQL database integration.

## Prerequisites
- AWS EC2 instance running Ubuntu
- Python 3.x
- Node.js (v18+)
- MySQL database (AWS RDS)
- Domain name (optional, for SSL)

## 1. Initial Server Setup

### System Updates
```bash
# Update package lists
sudo apt-get update

# Install required system packages
sudo apt-get install -y python3-pip git nodejs npm
```

### Node.js Setup 
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install Node.js 18
nvm install 18
nvm use 18
```

## 2. Application Installation

### Directory Setup
```bash
# Create application directory
mkdir -p ~/app
cd ~/app

# Clone repository
git clone https://your-repo-url.git Build_Dashboard_Demo
cd Build_Dashboard_Demo
```

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Build production version
npm run build

# Copy build files to backend
cp -r build ../backend/
```

### Backend Setup
```bash
cd ../backend

# Install Python dependencies
sudo pip3 install flask flask-cors mysql-connector-python
```

## 3. Configuration

### Database Configuration
Update `app.py` with your database credentials:
```python
db_config = {
    'host': 'your-rds-endpoint',
    'user': 'admin',
    'password': 'your-password',
    'database': 'shark_dashboard_db',
    'port': 3306
}
```

### Environment Variables (Optional)
```bash
# Create .env file if needed
echo "FLASK_ENV=production" > .env
echo "PORT=80" >> .env
```

## 4. Service Setup

### Create Systemd Service
```bash
sudo nano /etc/systemd/system/dashboard.service
```

Add the following content:
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

### Enable and Start Service
```bash
sudo systemctl daemon-reload
sudo systemctl start dashboard
sudo systemctl enable dashboard
```

## 5. Security Configuration

### AWS Security Groups
1. Inbound Rules:
   - HTTP (80): 0.0.0.0/0
   - HTTPS (443): 0.0.0.0/0
   - SSH (22): Your IP only

### SSL Setup (Optional)
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com
```

## 6. Monitoring and Logs

### Service Status
```bash
# Check service status
sudo systemctl status dashboard

# View logs
sudo journalctl -u dashboard -f

# View last 100 lines of logs
sudo journalctl -u dashboard -n 100
```

### Application Logs
```bash
# View Flask application logs
tail -f /home/ubuntu/app/Build_Dashboard_Demo/backend/app.log
```

## 7. Backup and Recovery

### Database Backup
```bash
# Create database backup
mysqldump -h your-rds-endpoint -u admin -p shark_dashboard_db > backup.sql

# Restore database
mysql -h your-rds-endpoint -u admin -p shark_dashboard_db < backup.sql
```

### Application Backup
```bash
# Backup entire application
cd ~/app
tar -czf dashboard_backup.tar.gz Build_Dashboard_Demo/

# Restore from backup
tar -xzf dashboard_backup.tar.gz
```

## 8. Update Procedures

### Frontend Updates
```bash
cd ~/app/Build_Dashboard_Demo/frontend
git pull origin main
npm install
npm run build
cp -r build ../backend/
```

### Backend Updates
```bash
cd ~/app/Build_Dashboard_Demo/backend
git pull origin main
sudo pip3 install -r requirements.txt
sudo systemctl restart dashboard
```

## 9. Troubleshooting

### Common Issues and Solutions

#### Application Not Accessible
1. Check service status:
   ```bash
   sudo systemctl status dashboard
   ```
2. Verify port availability:
   ```bash
   sudo lsof -i :80
   ```
3. Check security group settings in AWS console

#### Database Connection Issues
1. Verify RDS security group settings
2. Test database connection:
   ```bash
   mysql -h your-rds-endpoint -u admin -p shark_dashboard_db
   ```
3. Check database credentials in configuration

#### Service Won't Start
1. Check logs for errors:
   ```bash
   sudo journalctl -u dashboard -f
   ```
2. Verify file permissions:
   ```bash
   sudo chown -R ubuntu:ubuntu /home/ubuntu/app
   ```

## 10. Performance Optimization

### Frontend Optimization
1. Enable gzip compression in nginx
2. Implement browser caching
3. Use CDN for static assets

### Backend Optimization
1. Configure gunicorn for production
2. Implement database connection pooling
3. Set up caching where appropriate

## Contact and Support
For issues and support:
- GitHub Issues: [Repository Issues Page] 
- Email: [Support Email] akbansal@amd.com ; eljoseph@amd.com
- Documentation: 

## Version History
- v1.0.0: Initial deployment guide
- v1.1.0: Added SSL configuration
- v1.2.0: Added backup procedures
