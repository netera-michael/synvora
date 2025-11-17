# Automatic Production Deployment Setup

## Quick Setup (Recommended)

### Method 1: Use Main Branch (Standard Workflow)
```bash
git checkout main
git merge claude/review-project-setup-01HXDbsGFDwZF89GzXB2czST
git push origin main
```
✅ Vercel automatically deploys `main` to production

---

## Method 2: GitHub Actions with Deploy Hook

**Step 1: Create Deploy Hook in Vercel**
1. Go to https://vercel.com → Your Project
2. Navigate to **Settings** → **Git** → **Deploy Hooks**
3. Click **Create Hook**
   - Name: `Production Deploy`
   - Branch: `main` (or your preferred branch)
4. Copy the generated webhook URL

**Step 2: Add Secret to GitHub**
1. Go to your GitHub repo: https://github.com/netera-michael/synvora
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
   - Name: `VERCEL_DEPLOY_HOOK_URL`
   - Value: Paste the webhook URL from Vercel
4. Click **Add secret**

**Step 3: Workflow is Already Created**
The workflow file `.github/workflows/deploy-production.yml` is already in your repo.
It will automatically trigger production deployments when you push to `main` or any `claude/*` branch.

---

## Method 3: Change Production Branch in Vercel

1. Go to https://vercel.com → Your Project
2. Navigate to **Settings** → **Git**
3. Under **Production Branch**, change to your desired branch
4. Save changes

---

## Current Setup

- **Main Branch:** `main` (default production)
- **Current Working Branch:** `claude/review-project-setup-01HXDbsGFDwZF89GzXB2czST`
- **Preview Deployments:** All branches except production
- **Production URL:** https://synvora-psi.vercel.app

---

## Recommended Workflow

1. **Development:** Work on `claude/*` branches (preview deployments)
2. **Review:** Check preview deployment at Vercel URL
3. **Production:** Merge to `main` when ready → auto-deploys

OR use GitHub Actions deploy hook for automatic promotion.
