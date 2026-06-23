# HungryHub Deployment Guidelines

This guide details instructions to run HungryHub locally and package builds for cloud servers.

---

## 1. Quickstart (Development Mode)

From the root project folder, execute:
```bash
# Install dependencies for both folders
npm run install:all

# Run both Vite app and Node server concurrently
npm run dev
```
The frontend starts on `http://localhost:3000` and proxies requests to `http://localhost:5000`.

---

## 2. Docker Compose (Instant Deployment)

We provide a `docker-compose.yml` to package both services along with a MySQL server instance:
```bash
# Build and run containers
docker-compose up --build
```
This maps:
* **React SPA (Vite)**: `http://localhost:3000`
* **Node Backend APIs**: `http://localhost:5000`
* **MySQL server**: Port `3306`

---

## 3. Deployment Checklists

### Backend Cloud Hosts (Render / Railway / VPS)
1. Add environment configurations (`PORT`, `JWT_SECRET`, `NODE_ENV=production`).
2. Attach variables for DB: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
3. Set start command to `node backend/server.js`.

### Frontend Cloud Hosts (Vercel / Netlify)
1. Build script: `npm run build` inside `frontend/` folder.
2. Publish folder directory: `frontend/dist`.
3. Define server API redirections or proxies in hosting custom router parameters (e.g. `vercel.json` rewrite settings).
