# Fix Bad Gateway Error - Troubleshooting Guide

## Bad Gateway Error
This means Nginx can't connect to your application server (Next.js frontend or Express backend).

## Quick Diagnosis Commands

### 1. Check PM2 Status
```bash
pm2 status
```

### 2. Check Frontend Process
```bash
pm2 describe ventech-frontend
pm2 logs ventech-frontend --lines 50
```

### 3. Check Backend Process
```bash
pm2 describe ventech-backend
pm2 logs ventech-backend --lines 50
```

### 4. Check if Ports are in Use
```bash
# Check if frontend port (3000) is in use
netstat -tulpn | grep :3000
# or
ss -tulpn | grep :3000

# Check if backend port (5000) is in use
netstat -tulpn | grep :5000
# or
ss -tulpn | grep :5000
```

### 5. Check Nginx Status
```bash
sudo systemctl status nginx
sudo nginx -t
```

## Common Fixes

### Fix 1: Restart PM2 Processes
```bash
pm2 restart all
# or individually
pm2 restart ventech-frontend
pm2 restart ventech-backend
```

### Fix 2: If Processes Crashed, Restart Them
```bash
# Frontend
cd /var/www/ventech/frontend
pm2 start npm --name ventech-frontend -- start

# Backend
cd /var/www/ventech/backend
pm2 start npm --name ventech-backend -- start
```

### Fix 3: Check for Port Conflicts
```bash
# Kill any process using port 3000
sudo lsof -ti:3000 | xargs sudo kill -9

# Kill any process using port 5000
sudo lsof -ti:5000 | xargs sudo kill -9

# Then restart PM2
pm2 restart all
```

### Fix 4: Rebuild and Restart (if code changed)
```bash
# Frontend
cd /var/www/ventech/frontend
npm run build
pm2 restart ventech-frontend

# Backend
cd /var/www/ventech/backend
npm run build
pm2 restart ventech-backend
```

### Fix 5: Check Nginx Configuration
```bash
# Test Nginx config
sudo nginx -t

# If errors, check the config files
sudo nano /etc/nginx/sites-enabled/ventech-frontend
sudo nano /etc/nginx/sites-enabled/ventech-api

# Reload Nginx
sudo systemctl reload nginx
```

### Fix 6: Check System Resources
```bash
# Check memory
free -h

# Check disk space
df -h

# Check CPU
top
```

## Emergency Restart (Full System)
```bash
# Stop all PM2 processes
pm2 stop all

# Clear PM2 logs
pm2 flush

# Restart all
pm2 restart all

# Save PM2 configuration
pm2 save

# Reload Nginx
sudo systemctl reload nginx
```

## Verify After Fix
```bash
# Check PM2
pm2 status

# Test endpoints
curl http://localhost:3000
curl http://localhost:5000/health

# Check from external
curl https://ventechgadgets.com
curl https://api.ventechgadgets.com/health
```

