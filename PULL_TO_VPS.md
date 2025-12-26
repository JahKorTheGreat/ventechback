# Pull Changes to VPS - Step by Step

## Prerequisites
- SSH access to your VPS
- Git repository is already cloned on the VPS

## Steps to Pull and Deploy

### 1. SSH into your VPS
```bash
ssh root@your-vps-ip
# or
ssh root@srv1188766.hostinger.com
```

### 2. Navigate to Backend Directory
```bash
cd /var/www/ventech/backend
```

### 3. Check Current Status
```bash
git status
```

### 4. Pull Latest Changes
```bash
git pull origin main
```

### 5. Install Dependencies (if package.json changed)
```bash
npm install
```

### 6. Build the Backend
```bash
npm run build
```

### 7. Restart PM2 Process
```bash
pm2 restart ventech-backend
```

### 8. Check PM2 Status
```bash
pm2 status
pm2 logs ventech-backend --lines 50
```

## Quick One-Liner (if you're already in the backend directory)
```bash
cd /var/www/ventech/backend && git pull origin main && npm install && npm run build && pm2 restart ventech-backend
```

## Troubleshooting

### If git pull fails with authentication:
```bash
# Check remote URL
git remote -v

# If needed, update remote URL
git remote set-url origin https://github.com/cimonstech/ventechback.git
```

### If there are merge conflicts:
```bash
# Check what files have conflicts
git status

# If you want to discard local changes and use remote:
git reset --hard origin/main
git pull origin main
```

### If PM2 process is not running:
```bash
# Start the process
pm2 start dist/index.js --name ventech-backend

# Or use the ecosystem file if you have one
pm2 start ecosystem.config.js
```

### Check if backend is running:
```bash
curl http://localhost:5000/api/health
```

