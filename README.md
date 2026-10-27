# SkillBridge

The project has two independent application folders:

```text
SkillBridge/
├── SkillBridge-backend/   Java 17 / Spring Boot, PostgreSQL migrations, seed data, API tests
└── SkillBridge-frontend/  React / TypeScript / Vite, styles and browser assets
```

The backend's local `.env` connects to your existing PostgreSQL database `skillbridge-db` on `localhost:5432`. Database credentials belong only in `SkillBridge-backend/.env`. The frontend communicates with the backend through `/api`.

Start the backend in one terminal:

```sh
cd SkillBridge-backend
npm run api
```

Start the frontend in another terminal:

```sh
cd SkillBridge-frontend
npm run dev
```

On a fresh checkout, run `npm ci` in the frontend and `mvn package` in the backend first. Backend helper scripts use Node.js built-ins and require no npm dependencies. Stop the API before rebuilding its JAR on Windows.

Open [SkillBridge](http://localhost:5173), choose Learner, Mentor, or Admin login, and use the existing application accounts. Data remains in PostgreSQL.

See the [backend setup and accounts](SkillBridge-backend/README.md), [frontend setup](SkillBridge-frontend/README.md), [API reference](SkillBridge-backend/API.md), and [implementation status](STATUS.md).

To run the frontend, backend, and PostgreSQL together in Docker, see [Docker and Jenkins deployment](DEPLOYMENT.md). The root `Jenkinsfile` builds and tests separate app images and supports registry publication and VPS deployment after its connection settings are supplied.
