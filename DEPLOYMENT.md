# Docker and Jenkins deployment

Keep `SkillBridge-backend` and `SkillBridge-frontend` in **one GitHub repository**. They produce separate Docker images and are deployed together with PostgreSQL. The root `Jenkinsfile` is the pipeline entry point.

```text
Checkout → Build Docker images → Tests → Transfer to VPS → Deploy with Compose
                                        SSH archive       runs on the VPS
```

## 1. Build and run locally with Docker

Docker Desktop must use Linux containers. On a fresh checkout, copy `.env.docker.example` to `.env.docker`, then set a unique database password. This checkout already has an ignored `.env.docker` with a generated password. Do not overwrite it after the database volume has been initialized.

Run from the project root:

```powershell
docker compose --env-file .env.docker build backend frontend
docker compose --env-file .env.docker up -d --no-build --wait
docker compose --env-file .env.docker ps
```

Open [http://localhost:8088](http://localhost:8088). The existing native development app on port 5173 can run alongside it.

| Service | Image | Responsibility |
| --- | --- | --- |
| frontend | `skillbridge/frontend:local` | Nginx serves the React production build and forwards `/api` to the backend. |
| backend | `skillbridge/backend:local` | Java 17 API, Flyway migrations, authentication, and database access. |
| database | `postgres:17-alpine` | Official PostgreSQL image with the `postgres_data` named volume. |

The database needs no custom image: schema migrations and initial seed content belong to the backend. A database volume stores records separately from the container image. This Docker database is separate from the existing native pgAdmin database; starting the stack does not copy or change native records.

Only port 8088 is published, bound to loopback. Database and backend ports stay inside Docker networks. Frontend and backend run as unprivileged users with health checks. Compose waits for the database and backend to become healthy before starting dependent services. See [Docker's startup-order documentation](https://docs.docker.com/compose/how-tos/startup-order/).

Standalone image commands:

```powershell
docker build -t skillbridge/frontend:local ./SkillBridge-frontend
docker build -t skillbridge/backend:local ./SkillBridge-backend
docker pull postgres:17-alpine
```

### Optional prebuilt-artifact fallback

On this machine, Docker's outbound build-network requests to package registries timed out. The local images were built from host-produced artifacts using `Dockerfile.prebuilt`, and the ignored `.env.docker` selects that mode. The Java/Nginx runtime base images were obtained from their publisher repositories with manifest/blob digest verification.

To use this fallback after code changes, first run `npm run build` in `SkillBridge-frontend` and `mvn package` in `SkillBridge-backend` (stop a native API using that JAR first on Windows), then set `DOCKER_BUILD_FILE=Dockerfile.prebuilt` in `.env.docker` and run the Compose build command above. The Dockerfile-specific ignore files include only the built artifacts and runtime configuration, excluding credentials.

The standard `Dockerfile` builds remain available for machines with normal Docker egress. Jenkins explicitly selects those source builds, so CI does not depend on local `dist/` or `target/` directories.

Local Docker development uses the existing six seeded application accounts with password `SkillBridge!2026`. Production uses a separately configured administrator and disables those seed accounts.

Stop the local stack with `docker compose --env-file .env.docker down`; the database volume remains. Removing the volume removes that Docker database's records.

## 2. GitHub repository

The repository is https://github.com/hajer1098/SkillBridge. Keep both application folders, `compose.yaml`, and `Jenkinsfile` there. Commit and push from the local Windows checkout, not from the VPS release directory:

```sh
git push origin main
```

Review and commit the source changes, then push your chosen branch. Configure `DEPLOY_BRANCH` in Jenkins to match that actual branch. Local `.env` files, Docker settings, build output, database dumps, and old exported artifacts are ignored. Do not add credentials or private keys to Git.

## 3. Jenkins

Use a Jenkins **Multibranch Pipeline** connected to the GitHub repository. Use GitHub Branch Source and an authenticated GitHub webhook to trigger branch builds. Configure `Jenkinsfile` as the script path. Only trusted repository branches should be eligible for credentials; do not run untrusted fork Jenkinsfiles on a credential-bearing Docker agent. See [Jenkins Pipeline documentation](https://www.jenkins.io/doc/book/pipeline/) and [Pipeline syntax](https://www.jenkins.io/doc/book/pipeline/syntax/).

The Jenkinsfile uses **`agent any`**. The selected agent needs Linux, Docker Engine with Compose supporting `up --wait`, Git, Bash, OpenSSH, OpenSSL, gzip, sha256sum, and permission to use its Docker daemon. Maven, Java, Node, and Nginx for application builds run inside their Docker build stages. Required Jenkins plugins include Pipeline, Git, GitHub Branch Source, Credentials Binding, and SSH Credentials. The key is bound to a temporary file and passed to OpenSSH directly; the SSH Agent plugin is not required.

The pipeline:

1. **Checkout**: fetch source, validate scripts and image-transfer contracts, and prepare a unique `skillbridge-ci-*` environment. Local image names are forced to that project prefix.
2. **Build Docker images**: build frontend and backend; Maven runs backend unit tests.
3. **Tests**: start temporary PostgreSQL, run the API suites, deployment-script scenarios, frontend and proxy checks. Failures stop transfer and deployment.
4. **Transfer to VPS**: export the two tested application images using `docker image save`, compress them, record a SHA-256 checksum and immutable image IDs, and copy the archive and release scripts over SSH/SCP.
5. **Deploy with Compose**: on the VPS, verify the checksum, import images with `docker image load`, verify both image IDs, ensure PostgreSQL is healthy, back up the database, update the apps, and check health. Advance `current` only on success.

**No GHCR, registry login, publishing token, or Docker Hub account is required.** Public base images and package dependencies still need to be available to the build agent. PostgreSQL uses its official image; application images arrive directly through SSH. The old registry scripts remain available for older workflows but are not called by this Jenkinsfile.

Transfer and deployment are enabled only when `DEPLOY_TO_VPS=true`, the branch matches `DEPLOY_BRANCH`, and the build is not a pull request. Temporary CI resources and the local compressed image archive are cleaned in post actions. Jenkins archives only small release metadata files. No global Jenkins settings need changing.

The `test` command builds the two targets in `SkillBridge-backend/Dockerfile.tests` before running them. Test sources are copied into these images, with a dedicated ignore file that excludes local secrets and build artifacts. The test containers do not bind-mount the workspace: when Jenkins itself runs in Docker and uses the host Docker socket, its workspace path can differ from the path on the Docker host. Only the frontend and backend images are transferred; the test images stay on the build agent.

Create these Jenkins credentials:

| Credential ID | Kind | Purpose |
| --- | --- | --- |
| `vps-ssh-key` | SSH username with private key | SSH key authorized for your VPS deployment user. |
| `vps-known-hosts` | Secret file | The VPS host public key verified through the VPS provider or console, in OpenSSH known_hosts format. |

Scope both SSH credentials to SkillBridge. Use username `hajer` and the dedicated unencrypted deployment key for `vps-ssh-key`, and the verified entry for `[51.210.107.84]:2244` in `vps-known-hosts`. Keys and production secrets are never archived. A credential used by GitHub Branch Source to scan the code repository is separate and may remain configured.

Parameters default to `DEPLOY_BRANCH=main`, `VPS_HOST=51.210.107.84`, `VPS_USER=hajer`, `VPS_PORT=2244`, and `VPS_DIRECTORY=/home/hajer/skillbridge`. Keep `DEPLOY_TO_VPS=false` for CI only; enable it after configuring both SSH credentials. `PUBLISH_IMAGES` and `REGISTRY_PREFIX` are removed. Old parameter definitions may remain visible until the new Jenkinsfile has run once.

## 4. VPS setup

The deployment scripts target a Linux VPS with Docker Engine, Docker Compose v2, Bash, OpenSSH, and `flock`. The SSH deployment user must be able to use Docker and own the application directory. These files do not install or replace software on a server automatically.

Use the existing `/home/hajer/skillbridge` directory and `.env.production` there, with mode `600`. Do not overwrite existing credentials. On a fresh server, create that file from `SkillBridge-backend/deploy/.env.production.example`. Set:

- A unique PostgreSQL password; retain it for the lifetime of that database volume.
- `PUBLIC_ORIGIN` to the actual HTTPS website origin.
- `BOOTSTRAP_ADMIN_EMAIL`, a unique password of 12–128 characters, and the admin name for the first deployment.
- SMTP settings and `MAIL_ENABLED=true` for registration verification and password-reset email. With mail disabled and development seeds disabled, self-registration is unavailable; the bootstrapped administrator can still sign in.

The bootstrap creates a verified admin with a BCrypt password hash only when that email does not exist. It does not reset existing credentials, promote an existing learner, or reset a workspace on restart. After initial provisioning, both bootstrap email and password can be removed together from the server environment.

The VPS user needs Docker permissions and ownership of the application directory. Deployment uses no sudo and needs no registry authentication. Bash, `flock`, and `sha256sum` must be installed.

The production frontend binds only `127.0.0.1:8088`. The existing separate SkillBridge HTTPS proxy exposes `https://51.210.107.84:8443`; keep that value in `PUBLIC_ORIGIN`. The current private test certificate still causes a browser trust warning. Application releases do not change the proxy or the company's services on ports 80/443. Database and backend ports stay internal. Production resource/log limits preserve the caps used in the initial VPS deployment.

## 5. Releases, backups, and recovery

Jenkins uploads six release files to `/home/hajer/skillbridge/releases/<commit-build>/`: `images.tar.gz`, `images.sha256`, `images.env`, `release.txt`, `compose.production.yaml`, and `deploy-vps.sh`. The archive contains only frontend/backend images. Production credentials and PostgreSQL data stay on the VPS and are never included.

The server script takes a deployment lock, verifies the archive checksum, imports the images, and checks both immutable `sha256:` image IDs. It ensures PostgreSQL is healthy and writes a custom-format `pg_dump` under `/home/hajer/skillbridge/backups/` **before** starting new app containers and their Flyway migrations. It checks the frontend, admin route and API proxy, and changes `current` only on success. Compose replaces containers as needed; separate stop/remove stages are unnecessary. Updates can briefly interrupt requests. Older registry-digest releases remain supported for recovery.

If a deployment fails after app replacement, the script attempts to start the previous application images and returns failure to Jenkins. **Database migrations are not automatically reversed.** Backward-incompatible schema changes require a reviewed recovery plan; image rollback alone may not recover them. Database restoration is an operator action using the saved dump, because restoring it would discard newer writes.

Archives, imported images and backups remain on the VPS. Configure retention and off-server backup storage separately. The pipeline does not prune other applications or delete the production volume.

To migrate the existing local database, use PostgreSQL dump/restore as a separate planned step before the first live deployment. The pipeline deliberately does not read or upload your local pgAdmin database.

## Current activation requirements

The registry-free pipeline is prepared in source. A successful CI run does not mean Jenkins has deployed to the VPS: both SSH credentials and `DEPLOY_TO_VPS=true` are required. The existing public SkillBridge instance was initially deployed manually.

Validation distinguishes local archive/image-ID/Compose checks from an actual Jenkins-to-VPS deployment. Isolated deployment scenarios cover success, rollback, backup failure, malformed releases, locking, corrupt archives, unavailable image IDs and import failure; these scenarios do not connect to a VPS.
