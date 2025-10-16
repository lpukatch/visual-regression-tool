# On-Premise Storage Options for Visual Regression Testing

This guide outlines various on-premise storage solutions for your visual regression testing tool, keeping everything within your infrastructure.

## 🏠 Local File System (Default)

**Pros:**
- Simple setup, no additional infrastructure
- Fast access for local development
- No network latency
- Free (uses existing disk space)

**Cons:**
- Limited to single machine
- No built-in redundancy
- Manual backup required
- Not suitable for distributed teams

**Setup:**
```bash
# Default configuration - no changes needed
node index.js baseline
node index.js test
```

## 🐳 Docker Volume Storage

**Best for:** Containerized deployments, team environments

**Setup:**
```bash
# Start with Docker Compose
docker-compose up -d

# Run tests in container
docker-compose exec visual-regression node index.js test
```

**Configuration:**
```yaml
# docker-compose.yml
volumes:
  - ./baseline:/app/baseline
  - ./results:/app/results
  - ./storage:/app/storage
```

## 🗄️ Network Attached Storage (NAS)

**Best for:** Enterprise environments, centralized storage

**Setup Options:**

### NFS (Network File System)
```bash
# Mount NFS share
sudo mount -t nfs nas-server:/visual-regression /mnt/visual-regression

# Create symlinks
ln -s /mnt/visual-regression/baseline ./baseline
ln -s /mnt/visual-regression/results ./results
```

### SMB/CIFS (Windows Share)
```bash
# Mount SMB share
sudo mount -t cifs //nas-server/visual-regression /mnt/visual-regression \
  -o username=user,password=pass,domain=corp

# Create symlinks
ln -s /mnt/visual-regression/baseline ./baseline
ln -s /mnt/visual-regression/results ./results
```

## 🪣 MinIO (S3-Compatible Object Storage)

**Best for:** Scalable storage, S3 API compatibility, web interface

**Setup with Docker:**
```bash
# Start MinIO
docker-compose up -d minio

# Access web console
http://localhost:9001
# Username: visualregression
# Password: your-secure-password-here
```

**Configuration:**
```javascript
// Add to config/visual-regression.config.json
{
  "storage": {
    "type": "s3",
    "endpoint": "http://localhost:9000",
    "bucket": "visual-regression",
    "accessKey": "visualregression",
    "secretKey": "your-secure-password-here",
    "region": "us-east-1"
  }
}
```

## 🐘 PostgreSQL + File Storage

**Best for:** Metadata management, structured data, enterprise features

**Setup:**
```bash
# Start PostgreSQL
docker-compose up -d postgres

# Connect to database
psql -h localhost -U visualregression -d visual_regression
```

**Database Schema:**
```sql
-- sql/init.sql
CREATE TABLE test_runs (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(255) UNIQUE NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    branch VARCHAR(255),
    commit_hash VARCHAR(255),
    total_tests INTEGER,
    passed_tests INTEGER,
    failed_tests INTEGER,
    success_rate DECIMAL(5,2)
);

CREATE TABLE test_results (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(255) REFERENCES test_runs(run_id),
    target_name VARCHAR(255) NOT NULL,
    passed BOOLEAN NOT NULL,
    diff_pixels INTEGER,
    diff_percentage DECIMAL(5,2),
    baseline_path VARCHAR(500),
    current_path VARCHAR(500),
    diff_path VARCHAR(500)
);
```

## 📁 Recommended Directory Structure

```
/visual-regression-storage/
├── baselines/
│   ├── main/
│   ├── develop/
│   └── feature-branches/
├── results/
│   ├── 2023/
│   │   ├── 01/
│   │   └── 02/
│   └── 2024/
├── reports/
│   ├── html/
│   └── json/
├── config/
└── logs/
```

## 🔒 Security Considerations

### Access Control
```bash
# Set appropriate permissions
chmod 755 ./baseline ./results ./storage
chown -R visualregression:visualregression ./baseline ./results ./storage
```

### Backup Strategy
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
tar -czf /backup/visual-regression-$DATE.tar.gz \
  ./baseline ./results ./storage ./config

# Keep last 30 days
find /backup -name "visual-regression-*.tar.gz" -mtime +30 -delete
```

### Encryption (Optional)
```bash
# Encrypt sensitive data
gpg --symmetric --cipher-algo AES256 baseline/sensitive-screenshots.png
```

## 🚀 Performance Optimization

### SSD Storage
- Use SSD for baseline and result storage
- Faster I/O operations for large image files

### RAID Configuration
- RAID 1 for redundancy
- RAID 10 for performance + redundancy

### Network Optimization
- 1Gbps+ network for NAS storage
- Local caching for frequently accessed baselines

## 📊 Storage Requirements

**Estimated per test run:**
- Full page screenshot: ~500KB - 2MB
- Component screenshot: ~50KB - 500KB
- Diff image: ~100KB - 1MB
- HTML report: ~50KB

**Monthly estimates (100 tests/day):**
- Baselines: ~100MB - 400MB
- Results: ~1GB - 4GB
- Reports: ~150MB

**Recommended storage:**
- Development: 50GB
- Small team: 500GB
- Enterprise: 2TB+

## 🔄 Automated Cleanup

```bash
# cleanup-old-results.sh
#!/bin/bash
# Delete results older than 30 days
find ./results -type d -mtime +30 -exec rm -rf {} +

# Keep only last 10 baselines per branch
find ./baseline -name "*.png" | sort -r | tail -n +11 | xargs rm -f
```

Add to crontab:
```bash
# Run daily at 2 AM
0 2 * * * /path/to/cleanup-old-results.sh
```

## 🌐 GitLab CI/CD Integration

### GitLab Runner with Local Storage
```yaml
# .gitlab-ci.yml
variables:
  STORAGE_PATH: "/mnt/visual-regression-storage"

visual_regression:
  stage: test
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker run -v $STORAGE_PATH:/app/storage visual-regression-tool test
  artifacts:
    paths:
      - $STORAGE_PATH/results/
