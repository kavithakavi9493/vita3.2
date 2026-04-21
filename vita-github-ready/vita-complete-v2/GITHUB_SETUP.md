# VI Vita Intelligence — GitHub Setup Guide

Follow these steps to push the project to GitHub from scratch.

---

## STEP 1 — Create GitHub Repository

1. Go to → https://github.com/new
2. Fill in:
   - **Repository name**: `vita-intelligence` (or your preferred name)
   - **Visibility**: ✅ **Private** (recommended — contains business logic)
   - **Initialize with README**: ❌ NO (we already have one)
3. Click **"Create repository"**
4. Copy the repository URL shown — e.g.:
   ```
   https://github.com/YOUR_USERNAME/vita-intelligence.git
   ```

---

## STEP 2 — Install Git (if not already installed)

```bash
# Check if Git is installed
git --version

# If not installed → Windows: https://git-scm.com/download/win
# Mac:
brew install git
# Ubuntu/Linux:
sudo apt install git
```

---

## STEP 3 — Extract the ZIP & Enter Folder

```bash
# Unzip the file (if not already done)
unzip vita-complete-v2-final.zip

# Enter the project folder
cd vita-complete-v2
```

---

## STEP 4 — Initialize Git & Push to GitHub

Run these commands **inside the `vita-complete-v2` folder**:

```bash
# Initialize git
git init

# Add all files
git add .

# First commit
git commit -m "feat: initial commit — VI Vita Intelligence v3.2.0"

# Link to your GitHub repo (replace URL with yours from Step 1)
git remote add origin https://github.com/YOUR_USERNAME/vita-intelligence.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## STEP 5 — Verify .gitignore is Working

Before pushing, confirm these files are **NOT** being tracked:

```bash
# This should show NOTHING for sensitive files
git status | grep -E "\.env|serviceAccountKey"

# If anything shows up, run:
git rm --cached backend/.env
git rm --cached backend/serviceAccountKey.json
```

---

## STEP 6 — Add Collaborators (Developer Access)

1. Go to your GitHub repo → **Settings → Collaborators**
2. Click **"Add people"**
3. Enter your developer's GitHub username or email
4. Set role: **"Write"** (can push code, cannot change settings)

---

## STEP 7 — Setup GitHub Secrets (for CI/CD later)

For deployment automation, add secrets at:
**GitHub Repo → Settings → Secrets and variables → Actions**

| Secret Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your Claude API key |
| `RAZORPAY_KEY_ID` | Razorpay live key |
| `RAZORPAY_KEY_SECRET` | Razorpay secret |
| `SENDGRID_API_KEY` | SendGrid key |
| `SHIPROCKET_EMAIL` | Shiprocket email |
| `SHIPROCKET_PASSWORD` | Shiprocket password |
| `FIREBASE_CREDENTIALS` | Contents of serviceAccountKey.json |

---

## STEP 8 — Branch Strategy (Recommended)

```bash
# Main branches
main          → Production (live site)
dev           → Development / staging

# Feature branches (create per task)
git checkout -b feature/payment-fix
git checkout -b feature/admin-dashboard
```

Push to `dev`, test, then merge to `main` for production deployment.

---

## STEP 9 — Connect to Vercel & Render

### Frontend → Vercel
1. Go to → https://vercel.com/new
2. Import from GitHub → Select `vita-intelligence`
3. Root directory: `frontend`
4. Add environment variables from `frontend/.env.example`

### Backend → Render
1. Go to → https://render.com/new
2. New **Web Service** → Connect GitHub repo
3. Root directory: `backend`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add all environment variables from `backend/.env.example`

---

## ⚠️ NEVER Commit These Files

| File | Reason |
|---|---|
| `backend/.env` | Contains API keys |
| `backend/serviceAccountKey.json` | Firebase admin credentials |
| `frontend/.env` | Razorpay public key + API URL |

All three are already in `.gitignore` ✅

---

## Quick Reference Commands

```bash
# Daily workflow
git pull origin dev              # Get latest code
git add .                        # Stage changes
git commit -m "fix: description" # Commit
git push origin dev              # Push to dev branch

# Merge dev to main (deploy)
git checkout main
git merge dev
git push origin main
```

---

*VI Vita Intelligence | Vinod Patil & Co. | Confidential*
