# Verify VPS Deployment - Frontend & Backend

## Commands to Run on VPS

### 1. Check Backend Status
```bash
cd /var/www/ventech/backend
echo "=== BACKEND STATUS ==="
git status
echo ""
echo "=== BACKEND LATEST COMMIT ==="
git log -1 --oneline
echo ""
echo "=== BACKEND REMOTE STATUS ==="
git fetch origin
git status -sb
```

### 2. Check Frontend Status
```bash
cd /var/www/ventech/frontend
echo "=== FRONTEND STATUS ==="
git status
echo ""
echo "=== FRONTEND LATEST COMMIT ==="
git log -1 --oneline
echo ""
echo "=== FRONTEND REMOTE STATUS ==="
git fetch origin
git status -sb
```

### 3. Compare with Remote (Check if local is behind)
```bash
# Backend
cd /var/www/ventech/backend
echo "=== BACKEND: Local vs Remote ==="
git fetch origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [ "$LOCAL" = "$REMOTE" ]; then
    echo "✅ Backend is up to date with remote"
else
    echo "⚠️ Backend is behind remote - need to pull"
    echo "Local:  $LOCAL"
    echo "Remote: $REMOTE"
fi

# Frontend
cd /var/www/ventech/frontend
echo ""
echo "=== FRONTEND: Local vs Remote ==="
git fetch origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [ "$LOCAL" = "$REMOTE" ]; then
    echo "✅ Frontend is up to date with remote"
else
    echo "⚠️ Frontend is behind remote - need to pull"
    echo "Local:  $LOCAL"
    echo "Remote: $REMOTE"
fi
```

### 4. Quick One-Liner to Check Both
```bash
echo "=== BACKEND ===" && cd /var/www/ventech/backend && git fetch origin && git status -sb && echo "" && echo "=== FRONTEND ===" && cd /var/www/ventech/frontend && git fetch origin && git status -sb
```

### 5. Pull Latest Changes (if needed)
```bash
# Backend
cd /var/www/ventech/backend
git pull origin main
npm install
npm run build
pm2 restart ventech-backend

# Frontend
cd /var/www/ventech/frontend
git pull origin main
npm install
npm run build
pm2 restart ventech-frontend
```

## What to Look For

### ✅ Up to Date:
- `git status` shows: "Your branch is up to date with 'origin/main'"
- No uncommitted changes
- Latest commit matches what you expect

### ⚠️ Needs Attention:
- "Your branch is behind 'origin/main' by X commits" → Need to pull
- "Your branch has diverged" → Need to merge or reset
- Uncommitted changes → Need to stash or commit

