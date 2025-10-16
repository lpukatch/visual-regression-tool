# Deployment Guide

This guide covers various deployment options for your visual regression testing tool.

## 🚀 Quick Start

### Local Development
```bash
# Clone the repository
git clone https://github.com/lpukatch/visual-regression-tool.git
cd visual-regression-tool

# Install dependencies
npm install

# Initialize configuration
node index.js init

# Set baseline
node index.js baseline

# Run tests
node index.js test --html
```

## 🐳 Docker Deployment

### Single Container
```bash
# Build image
docker build -t visual-regression-tool .

# Run tests
docker run -v $(pwd)/baseline:/app/baseline \
           -v $(pwd)/results:/app/results \
           visual-regression-tool test
```

### Full Stack with Docker Compose
```bash
# Start all services
docker-compose up -d

# Run tests
docker-compose exec visual-regression node index.js test

# Access MinIO console
open http://localhost:9001
```

## 🌐 GitLab CI/CD Integration

### Setup GitLab Runner
```bash
# Install GitLab Runner
curl -L https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh | sudo bash
sudo apt-get install gitlab-runner

# Register runner
sudo gitlab-runner register
```

### Configure Pipeline
1. Copy `.gitlab-ci.yml` to your repository
2. Update `WEBSITE_URL` variable
3. Set up GitLab Runner with Docker executor
4. Push to trigger pipeline

### Pipeline Stages
- **setup**: Install dependencies
- **visual-regression**: Run tests
- **report**: Generate and publish reports

## 🗄️ On-Premise Storage Options

### Recommended Setup for Enterprise

1. **Primary Storage**: NAS with NFS
2. **Backup**: MinIO S3-compatible storage
3. **Metadata**: PostgreSQL database
4. **Cache**: Local SSD for performance

### Example NAS Setup
```bash
# Create mount point
sudo mkdir -p /mnt/visual-regression

# Mount NFS share
sudo mount -t nfs nas-server:/visual-regression /mnt/visual-regression

# Update /etc/fstab for persistent mount
echo "nas-server:/visual-regression /mnt/visual-regression nfs defaults 0 0" | sudo tee -a /etc/fstab

# Create directory structure
sudo mkdir -p /mnt/visual-regression/{baseline,results,reports,config}
sudo chown -R gitlab-runner:gitlab-runner /mnt/visual-regression
```

## 🔧 Configuration

### Environment Variables
```bash
# .env
STORAGE_TYPE=nas
STORAGE_PATH=/mnt/visual-regression
DATABASE_URL=postgresql://user:pass@localhost:5432/visual_regression
S3_ENDPOINT=http://minio:9000
S3_BUCKET=visual-regression
S3_ACCESS_KEY=visualregression
S3_SECRET_KEY=your-password
```

### GitLab CI/CD Variables
1. Go to GitLab Project → Settings → CI/CD → Variables
2. Add the following variables:
   - `WEBSITE_URL`: Your website URL
   - `STORAGE_PATH`: NAS mount path
   - `DATABASE_URL`: PostgreSQL connection string
   - `S3_ENDPOINT`: MinIO endpoint
   - `S3_ACCESS_KEY`: MinIO access key
   - `S3_SECRET_KEY`: MinIO secret key

## 📊 Monitoring and Alerting

### GitLab CI/CD Monitoring
- Pipeline success/failure notifications
- Test coverage tracking
- Artifact retention policies

### System Monitoring
```bash
# Monitor disk usage
df -h /mnt/visual-regression

# Monitor test performance
tail -f /var/log/visual-regression.log

# Monitor database
psql -h localhost -U visualregression -d visual_regression -c "SELECT * FROM test_runs ORDER BY timestamp DESC LIMIT 10;"
```

## 🔒 Security Best Practices

### Access Control
```bash
# Set appropriate permissions
chmod 755 /mnt/visual-regression
chmod 644 /mnt/visual-regression/config/*.json

# Create dedicated user
sudo useradd -r -s /bin/false visualregression
sudo chown -R visualregression:visualregression /mnt/visual-regression
```

### Network Security
- Use VPN for remote access
- Configure firewall rules
- Enable SSL/TLS for web interfaces
- Regular security updates

## 🔄 Backup and Recovery

### Automated Backup Script
```bash
#!/bin/bash
# backup-visual-regression.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/visual-regression"
STORAGE_DIR="/mnt/visual-regression"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup files
tar -czf $BACKUP_DIR/storage_$DATE.tar.gz -C $STORAGE_DIR .

# Backup database
pg_dump -h localhost -U visualregression visual_regression > $BACKUP_DIR/db_$DATE.sql

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete

echo "Backup completed: $DATE"
```

### Add to Crontab
```bash
# Daily backup at 2 AM
0 2 * * * /path/to/backup-visual-regression.sh
```

## 🚨 Troubleshooting

### Common Issues

#### Permission Denied
```bash
# Fix permissions
sudo chown -R $USER:$USER ./baseline ./results
chmod 755 ./baseline ./results
```

#### Docker Volume Issues
```bash
# Recreate volumes
docker-compose down -v
docker-compose up -d
```

#### GitLab Runner Issues
```bash
# Restart runner
sudo systemctl restart gitlab-runner

# Check runner status
sudo gitlab-runner status
```

#### Network Issues
```bash
# Test connectivity
ping nas-server
curl -I http://minio:9000

# Check mounts
mount | grep visual-regression
```

### Log Analysis
```bash
# GitLab CI/CD logs
gitlab-runner log

# Docker logs
docker-compose logs visual-regression

# Application logs
tail -f ./storage/logs/visual-regression.log
```

## 📈 Performance Optimization

### Hardware Recommendations
- **CPU**: 4+ cores for parallel processing
- **RAM**: 8GB+ for image processing
- **Storage**: SSD for baseline/results
- **Network**: 1Gbps+ for NAS access

### Software Optimization
- Use Puppeteer's headless mode
- Optimize image compression
- Implement caching strategies
- Use parallel processing for multiple tests

### Database Optimization
```sql
-- Create indexes for better performance
CREATE INDEX idx_test_runs_timestamp ON test_runs(timestamp);
CREATE INDEX idx_test_results_run_id ON test_results(run_id);
CREATE INDEX idx_test_results_target_name ON test_results(target_name);
```

## 🎯 Next Steps

1. **Setup Infrastructure**: Choose storage option and set up NAS/MinIO
2. **Configure CI/CD**: Set up GitLab Runner and pipeline
3. **Monitor Performance**: Set up monitoring and alerting
4. **Scale**: Add more runners for parallel testing
5. **Automate**: Set up scheduled tests and cleanup

## 📞 Support

- **Documentation**: Check `README.md` and `STORAGE.md`
- **Issues**: Create GitHub issue for bugs
- **Community**: Join discussions in GitHub Discussions
- **Updates**: Watch GitHub repository for updates
