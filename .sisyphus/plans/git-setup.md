# Git Setup Plan for Bottus

## Objective
Initialize git repo and push to https://github.com/Reedtrullz/Bottus

## Steps

### Step 1: Update .gitignore
Add missing entries to exclude local data:
```
data/*.db
data/*.json
openclaw-data/
openclaw-workspace/
.DS_Store
coverage/
```

### Step 2: Add files to git
```bash
git add .gitignore
git add package.json package-lock.json tsconfig.json vitest.config.ts
git add docker-compose.yml Dockerfile.relay
git add src/ tests/ .sisyphus/ docs/ config/
```

### Step 3: Commit
```bash
git commit -m "Initial commit: Ine Discord bot with ComfyUI image generation"
```

### Step 4: Push to GitHub
```bash
git remote add origin https://github.com/Reedtrullz/Bottus.git
git branch -M main
git push -u origin main
```

## Files NOT to commit (in .gitignore)
- node_modules/
- dist/
- .env (has secrets)
- data/bot.db
- data/proposal_queue.json
