# Build Dashboard Deployment Guide

## Overview
This document outlines the deployment process for the Build Dashboard application, which consists of a React frontend and Flask backend with MySQL database integration.The database is populated by a listener script that asynchonously listens for updates through the configured GitHub webhooks.

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
- Email: [Support Email] 
- Documentation: [Wiki/Docs Link]

## 11. Automated Hosting and CI/CD

### GitHub Actions Setup

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy Build Dashboard

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Build Frontend
        working-directory: ./frontend
        run: |
          npm install
          npm run build

      - name: Setup Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.x'

      - name: Install Python dependencies
        working-directory: ./backend
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt

      - name: Deploy to EC2
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd ~/app/Build_Dashboard_Demo
            git pull origin main
            cd frontend
            npm install
            npm run build
            cp -r build ../backend/
            cd ../backend
            sudo systemctl restart dashboard

### Auto-Scaling Setup

1. Create Launch Template:
```bash
# Create AMI from running instance
aws ec2 create-image \
  --instance-id i-1234567890abcdef0 \
  --name "build-dashboard-template" \
  --description "AMI for Build Dashboard"

# Create launch template
aws ec2 create-launch-template \
  --launch-template-name BuildDashboardTemplate \
  --version-description AutoScalingVersion1 \
  --launch-template-data file://launch-template.json
```

2. Configure Auto Scaling Group:
```bash
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name BuildDashboardASG \
  --launch-template LaunchTemplateName=BuildDashboardTemplate \
  --min-size 1 \
  --max-size 3 \
  --desired-capacity 2 \
  --target-group-arns arn:aws:elasticloadbalancing:region:account-id:targetgroup/BuildDashboard/1234567890
```

### Load Balancer Configuration

1. Create Application Load Balancer:
```bash
aws elbv2 create-load-balancer \
  --name build-dashboard-alb \
  --subnets subnet-1234567890abcdef0 subnet-0987654321fedcba \
  --security-groups sg-1234567890abcdef0
```

2. Create Target Group:
```bash
aws elbv2 create-target-group \
  --name build-dashboard-tg \
  --protocol HTTP \
  --port 80 \
  --vpc-id vpc-1234567890abcdef0 \
  --health-check-path /api/metrics/dashboard
```

### Monitoring and Alerts(will be rolled out after testing)

1. Set up CloudWatch Alarms:
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name BuildDashboardHighCPU \
  --alarm-description "CPU utilization above 70%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 70 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:region:account-id:AlertsTopic
```

2. Configure CloudWatch Logs:
```yaml
# In /etc/cloudwatch-agent/config.json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/home/ubuntu/app/Build_Dashboard_Demo/backend/app.log",
            "log_group_name": "build-dashboard",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
```

### Disaster Recovery(future work)

1. Create Cross-Region Backup:
```bash
# Create S3 bucket for backups
aws s3 mb s3://build-dashboard-backup --region us-west-2

# Set up daily backup script
#!/bin/bash
DATE=$(date +%Y-%m-%d)
mysqldump -h $RDS_ENDPOINT -u $DB_USER -p$DB_PASS $DB_NAME | gzip > /tmp/db-backup-$DATE.sql.gz
aws s3 cp /tmp/db-backup-$DATE.sql.gz s3://build-dashboard-backup/
```

2. Configure Route 53 Failover:
```bash
aws route53 create-health-check \
  --caller-reference $(date +%s) \
  --health-check-config \
    Name=build-dashboard-health,
    Type=HTTP,
    FullyQualifiedDomainName=build-dashboard.example.com,
    ResourcePath=/health
```

## Version History
- v1.0.0: Initial deployment guide
- v1.1.0: Added SSL configuration
- v1.2.0: Added backup procedures
- v1.3.0: Added automated hosting and CI/CD documentation
