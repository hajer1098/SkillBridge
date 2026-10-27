# SkillBridge

A React + TypeScript learning workspace with a Java 17 / Spring Boot REST API and PostgreSQL persistence. The interface follows the supplied burgundy, olive, rose, apricot, pistachio, cream, cocoa, and beige palette.

## Run the interactive browser demo

Requires Node.js 18+ and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Without `VITE_API_URL`, the application uses clearly labeled development data and saves changes in this browser's local storage. The workspace selector opens learner, mentor, and administrator demos. The public introduction is available at `/#home`, and `/admin` opens the admin entry point.

The demo includes search and filters, course details and sample lessons, enrollments, lesson completion, profile and skill editing, deterministic recommendations, mentor profiles, simulated bookings/payments, private conversation UI, project briefs, portfolio submission, progress, notifications, mentor applications, and admin sample workflows. Sample mentors and affiliations are fictional development examples; photos are illustrative.

## Run the complete local stack

Requires Docker with Compose. The database and API ports bind to loopback for development. If port 5432 is already used, change the host port in Compose or use an existing **dedicated** PostgreSQL database with the Java environment below.

```sh
docker compose up --build -d
```

Copy `.env.example` to `.env` and set `VITE_API_URL=/api`. Restart Vite after changing environment variables:

```sh
npm run dev
```

- Frontend: http://localhost:5173
- API health: http://localhost:8080/api/health
- Interactive OpenAPI documentation: http://localhost:8080/swagger-ui/index.html
- Email inbox (Mailpit): http://localhost:8025

Compose enables development seed accounts and sends registration / password reset email to Mailpit. Registration requires email verification; copy the token from Mailpit into the app's **Verify email** form. Reset requests also contain a single-use token; use **I have a reset token** after requesting a reset.

### Development accounts

Enabled only with `DEMO_SEED=true`. All three use **`SkillBridge!2026`**. Disable development seeding and provision proper administrator credentials for any real deployment.

| Role | Email |
| --- | --- |
| Learner | learner@skillbridge.local |
| Approved mentor | mentor@skillbridge.local |
| Administrator | admin@skillbridge.local |

Backend mode requires sign-in for all changes. Demo role switching is unavailable when `VITE_API_URL` is set. Roles and suspension are checked on every API request, independently of the interface. Client-selected roles never authorize server access.

### Run Java without Docker

Create a new PostgreSQL 17 database and user dedicated to this application. Set `DATABASE_URL` to a JDBC URL, `DATABASE_USER`, and `DATABASE_PASSWORD` in the environment that starts Java. Java does **not** automatically read the frontend `.env` file.

```sh
cd backend
mvn package
java -jar target/skillbridge-api-1.0.0.jar
```

Flyway applies `src/main/resources/db/migration/V1__platform.sql` automatically. Set `DEMO_SEED=true` to install sample accounts/catalogs. Set `MAIL_ENABLED=true` and `SMTP_HOST`, `SMTP_PORT`, and optionally `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_AUTH=true`, `SMTP_TLS=true`, and `MAIL_FROM` for email delivery. With development seed mode and email disabled, registration returns a labeled development verification token; the frontend pre-fills it. With seed mode disabled, registration returns a configuration error if mail is unavailable.

`CORS_ORIGINS` is a comma-separated list of approved frontend origins. Configure HTTPS and an appropriate CORS origin for a separately hosted frontend/API. The `/api` Vite proxy is for local development; production requires a reverse proxy or a full HTTPS API base URL at build time.

## Recommendation behavior

The default is **rules-based**. Matching uses skills, learning goals, interests, experience, and learning progress, with explanations and prerequisite guidance. Changing a profile or completing lessons refreshes server recommendations. The frontend demo implements the same basic matching idea locally.

Optional backend-only configuration supports a compatible chat-completion provider endpoint:

- `AI_URL`: complete HTTPS endpoint URL
- `AI_API_KEY`: server-side credential
- `AI_MODEL`: provider model name

The service sends a minimized skills/goal/level/progress profile and permitted course candidates, validates returned course IDs and explanation lengths, and falls back explicitly to rules-based recommendations on timeouts, malformed results, or provider errors. No provider credentials are bundled into the browser. The external provider path has not been tested with real credentials.

## Persistence and security

- BCrypt password hashing; expiring opaque bearer sessions stored as SHA-256 hashes; single-use verification/reset tokens; basic login/registration throttling.
- PostgreSQL stores users, user-owned workspace/progress, catalog content, approved mentors, availability, applications, bookings, payments, messages, reviews, moderation reports, and audit records.
- Booking, message, and project-feedback endpoints validate ownership / participation. Only approved mentors can publish availability. Only approved mentor profiles enter the public API directory.
- UTC timestamps, local-time display, server-side published-slot validation, serialized booking-conflict checks, unique idempotency keys, and auditable idempotent cancellation/test-refund operations.
- Profile and portfolio validation; HTTP(S)-only portfolio links; bounded text fields; JSON error responses; role checks for admin operations.
- Browser demo data and server data are separate. Authenticated server workspace records are not written to local storage. Bearer sessions use session storage and expire after 12 hours; signing out revokes the server session.

## Verification

```sh
npm run build
# Against an isolated API with DEMO_SEED=true and MAIL_ENABLED=false:
npm test
# Or set TEST_API_URL to another isolated development API, including /api.
```

The integration test uses fresh test users and records; it does not clean up those records. Run it against a dedicated development database. Do not run it against production.

Verified on 27 October 2026:

- TypeScript compilation and Vite production build pass.
- Java 17 Maven package passes.
- PostgreSQL 17.7 migrations and real API requests pass all **10 journey subtests (11 reported tests including the parent suite)**: identity/verification, learning, mentor approval/availability, concurrent duplicate booking/payment, privacy, portfolio validation, mentor feedback, cancellation/refund idempotency, and admin moderation/suspension.
- Browser checks: course continuation and lesson completion; sandbox booking and messaging; project start and portfolio save; desktop and narrow mobile layouts. Further changes to those interactions require rechecking them.

See [API.md](API.md) for endpoint contracts and [STATUS.md](STATUS.md) for boundaries and remaining production work.

## Build and publication

```sh
npm run build
```

`dist/` is the static frontend. The included Sites manifest publishes this browser-local demonstration privately. Sites' static hosting does not run Java or PostgreSQL. Deploy the backend separately, configure an HTTPS API URL, and rebuild the frontend to use that backend. Keep `AI_API_KEY`, database passwords, SMTP credentials, and other server secrets out of `VITE_*` variables.

`node scripts/generate-seed.mjs` exports the frontend's development catalog into the Java seed resource. Run it after intentionally updating seed content. `backend/target`, `.local`, `.env`, and `node_modules` are excluded from source publishing.
