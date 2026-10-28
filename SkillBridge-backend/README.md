# SkillBridge backend

Java 17 / Spring Boot REST API with PostgreSQL persistence. This folder contains `pom.xml`, `Dockerfile`, database migrations, seed content, API helper scripts, and API integration tests. It builds and runs without the frontend source or its dependencies.

## Start with your pgAdmin database

The ignored local `.env` is configured for `skillbridge-db` on `localhost:5432`. It contains the database login separately from application accounts. For a fresh checkout, copy `.env.example` to `.env` and supply your own database settings.

From this folder:

```sh
mvn package
npm run api
```

Java 17, Maven, and Node.js 18+ are required. The Node launcher uses built-in modules, so it needs no `npm install`. A previously built JAR is included only in the local ignored `target/` directory. Stop a running API before rebuilding on Windows.

`npm run api` loads this folder's `.env` and starts `target/skillbridge-api-1.0.0.jar`. Explicit shell environment variables take precedence. `npm start` is an alias. A direct `java -jar target/skillbridge-api-1.0.0.jar` requires exporting the database settings yourself.

- API health: [http://localhost:8080/api/health](http://localhost:8080/api/health)
- OpenAPI: [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)
- Frontend: started separately from `../SkillBridge-frontend` on port 5173.

## Database and seed content

Flyway applies migrations under `src/main/resources/db/migration/`. Courses, projects, taxonomy, mentor display data, and development account definitions belong in `src/main/resources/development-seed.json`; the frontend does not contain catalog fixtures.

With `DEMO_SEED=true`, initial startup creates sample content and six password-authenticated accounts. The `app_seed` marker prevents later startups from resetting accounts or overwriting edits. Make later content changes through the admin UI or a reviewed migration.

```sh
npm run seed:check
```

In pgAdmin, refresh **Schemas → public → Tables**. Accounts are in `app_user`; courses/projects/skills/categories and lessons are in `content`; progress and portfolios are in `workspace.data` JSONB; mentor details and availability are in `mentor_profile` and `mentor_slot`. Bookings, test payments, messages, applications, reports, and audit events have their own tables. Passwords are BCrypt hashes.

## Development accounts

Production accounts are created dynamically from **Admin → Users → Create account**. The administrator supplies a name, email, role (learner, mentor or admin), and initial password. The frontend calls `POST /api/admin/users`; the API validates the request, hashes the password with BCrypt, and stores the account and a separate workspace in PostgreSQL in one transaction. Only an authenticated administrator can use this endpoint. Responses, member lists and audit events never include passwords or password hashes. These accounts are active immediately and do not require SMTP verification because they are provisioned by an administrator. Mentor accounts receive a draft profile that must be completed and approved under **Mentors** before public listing.

Existing logins read `app_user` and validate its saved password hash. Account creation, role changes and suspension persist across restarts. Public self-registration remains a learner-only flow with email verification; production SMTP requirements are unchanged. The bootstrap administrator is only the first account, not a replacement for database-driven account management.

All six initially use **`SkillBridge!2026`**. These website credentials are separate from PostgreSQL credentials.

| Workspace | Email |
| --- | --- |
| Learner | learner@skillbridge.local |
| Admin | admin@skillbridge.local |
| Mentor — Sophie | mentor@skillbridge.local |
| Mentor — Alex | alex@skillbridge.local |
| Mentor — Maya | maya@skillbridge.local |
| Mentor — James | james@skillbridge.local |

New registrations are stored as separate learner accounts and require email verification. With `MAIL_ENABLED=false` and development seeding enabled, the API returns an explicitly labeled verification token for the frontend verification form. Configure SMTP for email delivery. See `.env.example` for server settings. Database, SMTP, and AI credentials must never be placed in frontend `VITE_*` variables.

## Verification

Build with `mvn package`. Run the integration suites only against a dedicated development/test database with `DEMO_SEED=true` and `MAIL_ENABLED=false`; the tests create persistent test records.

```powershell
$env:TEST_API_URL = 'http://127.0.0.1:8081/api'
npm test
```

The two suites cover identity, authorization, separate role logins, logout, catalog data, dynamic account creation for all roles, input validation, duplicate creation races, admin edits, mentor approvals, bookings, test refunds, messaging privacy, portfolio validation, and audit activity.

## Optional Docker development stack

`docker compose up --build -d` starts a separate containerized PostgreSQL database, API, and Mailpit inbox. This optional stack uses its own `postgres_data` volume; it does not connect to your pgAdmin database. Its default ports 5432 and 8080 conflict with a running local stack, so choose one setup. The current local setup uses `npm run api` with your existing database.

See [API.md](API.md) for endpoints and [../STATUS.md](../STATUS.md) for product boundaries.

For the full three-service Docker stack, Docker image builds, and the GitHub/Jenkins/VPS pipeline, use the root [deployment instructions](../DEPLOYMENT.md). The backend-only `compose.yaml` above remains an optional separate development setup.
