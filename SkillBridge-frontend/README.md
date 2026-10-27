# SkillBridge frontend

React 19, TypeScript, and Vite. This folder contains only browser application code, styling, public assets, and frontend build configuration. It installs and builds independently of the backend source.

## Start

Requires Node.js 18+ and npm. From this folder:

```sh
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Start the API separately from `../SkillBridge-backend` with `npm run api`. The API connects to the existing `skillbridge-db` PostgreSQL database.

The default frontend API base is `/api`. Vite forwards `/api` to `http://localhost:8080`. An optional local `.env` can override:

```env
VITE_API_URL=/api
API_PROXY_TARGET=http://localhost:8080
```

Restart Vite after changing configuration. Only browser settings belong here: database credentials remain in `../SkillBridge-backend/.env`. Frontend `VITE_*` settings are public build inputs.

## Workspaces and data

The welcome screen offers separate Learner, Mentor, and Admin login buttons. Each signed-in workspace has a logout button. Accounts, catalog records, availability, learning progress, projects, portfolio, messages, and administrative changes use the backend and PostgreSQL; there is no browser-local data fallback. Session storage holds the revocable login token.

- Learners: courses, learning progress, mentor sessions, projects, portfolio, messages, and profile.
- Mentors: availability, pricing, assigned sessions, project feedback, messages, and profile.
- Administrators: users, mentors, applications, content, bookings, reports, and audit activity.

Direct login entries: `/#login/learner`, `/#login/mentor`, and `/#login/admin` (also `/admin`). Account credentials are listed in the [backend README](../SkillBridge-backend/README.md).

## Build

```sh
npm run build
npm run preview
```

The production bundle is written to `dist/`. Preview and static hosting require an API reverse proxy for `/api`, or an HTTPS backend address supplied as `VITE_API_URL` at build time. The Vite development proxy applies only to `npm run dev`.

API integration tests belong to `../SkillBridge-backend/tests` and run from the backend folder with `npm test`. The retained Sites manifest identifies the earlier private static demonstration; reorganizing this local project does not publish changes to it.

The included `Dockerfile` builds the React app and serves it with Nginx on container port 8080, including the `/api` reverse proxy. Run the root Compose stack from [../DEPLOYMENT.md](../DEPLOYMENT.md) to start it with the backend and database.
