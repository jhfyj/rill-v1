# Rill — Backend Deployment Guide

This guide walks you through deploying the new backend (company card management + admin dashboard) to Vercel.

---

## Overview of what was added

| What | Where |
|---|---|
| Public API — returns up to 12 random companies | `GET /api/companies` |
| Admin login | `POST /api/admin/login` |
| Admin logout | `POST /api/admin/logout` |
| Admin session check | `GET /api/admin/me` |
| Admin CRUD for companies | `GET/POST/PUT/DELETE /api/admin/companies` |
| Admin dashboard UI | `/admin` (password-protected) |
| Company type definitions | `src/types/company.ts` |
| Frontend API client | `src/lib/api.ts` |

Section 3 now fetches real company data on load. If the API is unavailable (e.g. during local dev without env vars), it gracefully falls back to the placeholder cards.

---

## Step 1 — Set up Upstash Redis (free)

1. Go to [https://console.upstash.com](https://console.upstash.com) and create a free account.
2. Click **Create Database** → choose a region close to your Vercel deployment.
3. Once created, open the database and copy:
   - **REST URL** → `UPSTASH_REDIS_REST_URL`
   - **REST Token** → `UPSTASH_REDIS_REST_TOKEN`

---

## Step 2 — Generate a session secret

Run this in your terminal to generate a secure random secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save the output as `ADMIN_SESSION_SECRET`.

---

## Step 3 — Add environment variables in Vercel

1. Go to your project in the [Vercel dashboard](https://vercel.com/dashboard).
2. Click **Settings** → **Environment Variables**.
3. Add the following four variables (for **Production**, **Preview**, and **Development**):

| Variable | Value |
|---|---|
| `ADMIN_PASSWORD` | The password your client will use to log in to `/admin` |
| `ADMIN_SESSION_SECRET` | The random string generated in Step 2 |
| `UPSTASH_REDIS_REST_URL` | From Upstash (Step 1) |
| `UPSTASH_REDIS_REST_TOKEN` | From Upstash (Step 1) |

---

## Step 4 — Push the code and deploy

Commit and push all changes to your GitHub repository. Vercel will automatically detect the new `api/` directory and deploy the serverless functions alongside the frontend.

```bash
git add .
git commit -m "feat: add backend, admin dashboard, and dynamic company cards"
git push
```

Vercel will redeploy automatically. The build takes about 30 seconds.

---

## Step 5 — Access the admin dashboard

Navigate to `https://your-site.vercel.app/admin` and log in with the `ADMIN_PASSWORD` you set.

From the dashboard the client can:
- **Add** a new company (all card fields: stage, category, name, description, details, extended description, open roles, team members)
- **Edit** any existing company
- **Delete** a company
- See at a glance how many companies are in the database and how many will be shown on the site (max 12, randomly sampled if more exist)

---

## Local development

To run the backend locally, install the [Vercel CLI](https://vercel.com/docs/cli):

```bash
npm i -g vercel
```

Create a `.env.local` file (copy from `.env.example` and fill in real values), then run:

```bash
vercel dev
```

This starts both the Vite frontend and the serverless API functions on `http://localhost:3000`.

---

## Security notes

- The admin password and session secret are **never** stored in the repository. They live only in Vercel's encrypted environment variable store.
- The session cookie is `HttpOnly` and `SameSite=Strict`, preventing XSS and CSRF attacks.
- All admin API routes return `401 Unauthorized` if the session cookie is missing or invalid.
- `.env` files are excluded from git via `.gitignore`.
