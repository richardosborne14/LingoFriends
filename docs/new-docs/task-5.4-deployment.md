# Task 5.4: Deployment to Hetzner

**Status:** 🔲 Not started
**Phase:** 5 (Social & Deploy)
**Confidence Target:** 8/10
**Estimated Time:** 3h
**Dependencies:** All previous tasks complete

---

## Mandatory Reads

1. `00-REWRITE-MASTER-PLAN.md` — deployment row: Hetzner VPS + Docker + nginx + Certbot

---

## Objective

Dockerise the app and deploy to a Hetzner VPS with HTTPS. EU-hosted for GDPR compliance.

---

## Subtasks

### 5.4.1 — Dockerfile

SvelteKit with Node adapter. Multi-stage build: npm ci → npm run build → copy build to slim Node image.

### 5.4.2 — docker-compose.yml

Two services: `app` (SvelteKit) and `db` (Postgres 16). Named volume for Postgres data persistence.

### 5.4.3 — Nginx reverse proxy + SSL

Nginx config with proxy_pass to SvelteKit. Certbot for Let's Encrypt SSL.

### 5.4.4 — Deploy to Hetzner

Provision VPS, install Docker, copy compose files, set environment variables, `docker compose up -d`.

### 5.4.5 — Health check endpoint

`GET /api/health` → `{ status: 'ok', version: '2.0.0' }`

---

## 🤔 Decision Point for User

> **Domain:** What domain/subdomain? (A) `v2.lingofriends.com` (keeps V1 live), (B) `app.lingofriends.com`, (C) replace V1 at `lingofriends.com`. Recommend A for testing period. Please provide domain.

---

## Tests (Post-Deployment Smoke)

```bash
curl -s https://[DOMAIN]/api/health | jq .
# Expected: {"status":"ok","version":"2.0.0"}

curl -s -o /dev/null -w "%{http_code}" https://[DOMAIN]/login
# Expected: 200
```

---

## Acceptance Criteria

- [ ] App runs in Docker
- [ ] Postgres data persists across restarts
- [ ] HTTPS with valid certificate
- [ ] Health check returns 200
- [ ] No secrets in code/Dockerfile
- [ ] EU-hosted (Hetzner)
- [ ] Smoke tests pass

---

## Completion

**Confidence:** ___/10
**What Was Built:** ___
