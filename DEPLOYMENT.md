# Docker and Jenkins deployment

Keep `SkillBridge-backend` and `SkillBridge-frontend` in **one GitHub repository**. They produce separate Docker images and are deployed together with PostgreSQL. The root `Jenkinsfile` is the pipeline entry point.

```text
GitHub push → Jenkins checkout → build app images → integration and proxy tests
            → publish frontend + backend to GHCR → SSH release to VPS → backup + health checks
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

Create one repository and push the project root, including the two app folders, `compose.yaml`, and `Jenkinsfile`. The local repository currently has no GitHub remote configured. Once your repository exists:

```sh
git remote add origin https://github.com/YOUR_ACCOUNT/SkillBridge.git
```

Review and commit the source changes, then push your chosen branch. Configure `DEPLOY_BRANCH` in Jenkins to match that actual branch. Local `.env` files, Docker settings, build output, database dumps, and old exported artifacts are ignored. Do not add credentials or private keys to Git.

## 3. Jenkins

Use a Jenkins **Multibranch Pipeline** connected to the GitHub repository. Use GitHub Branch Source and an authenticated GitHub webhook to trigger branch builds. Configure `Jenkinsfile` as the script path. Only trusted repository branches should be eligible for credentials; do not run untrusted fork Jenkinsfiles on a credential-bearing Docker agent. See [Jenkins Pipeline documentation](https://www.jenkins.io/doc/book/pipeline/) and [Pipeline syntax](https://www.jenkins.io/doc/book/pipeline/syntax/).

The Jenkinsfile uses **`agent any`**. The selected agent needs Linux, Docker Engine with Compose supporting `up --wait`, Git, Bash, OpenSSH, OpenSSL, and permission to use its Docker daemon. Maven, Java, Node, and Nginx for application builds run inside their Docker build stages. Required Jenkins plugins include Pipeline, Git, GitHub Branch Source, Credentials Binding, and SSH Agent.

The pipeline:

1. Checks out the repository, verifies CI/publication image-name agreement, and creates a unique `skillbridge-ci-*` Compose project with a random temporary database password. CI commands force the local image prefix to that project name; the Jenkins `REGISTRY_PREFIX` parameter is used only for publication. This prevents an exported Jenkins parameter from overriding the CI environment file and changing the names that the publication script expects.
2. Builds both application images. The backend image build runs Maven unit tests.
3. Builds the two test images, starts an isolated PostgreSQL volume, runs the API suites and deployment-script scenarios, and verifies the frontend and API proxy in the `Integration et test` stage. Failures prevent publication and deployment.
4. Publishes images only when `PUBLISH_IMAGES=true`, the branch matches `DEPLOY_BRANCH`, and the build is not a change request.
5. Records the registry image digests in `images.env` and archives the release files.
6. Deploys over SSH only when `DEPLOY_TO_VPS=true` and the same branch conditions pass. Production backup and health checks remain part of deployment.
7. Cleans up only that build's temporary CI resources.

Publishing and deployment default to disabled because repository, registry, and VPS connection details must be supplied first. No Jenkins deployment approval step is required once these are configured and enabled.

The `test` command builds the two targets in `SkillBridge-backend/Dockerfile.tests` before running them. Test sources are copied into these images, with a dedicated ignore file that excludes local secrets and build artifacts. The test containers do not bind-mount the workspace: when Jenkins itself runs in Docker and uses the host Docker socket, its workspace path can differ from the path on the Docker host. Only the frontend and backend images are published; the test images stay on the build agent.

Create these Jenkins credentials:

| Credential ID | Kind | Purpose |
| --- | --- | --- |
| `registry-credentials` | Username/password | Registry username and publishing token. For GHCR, use a classic PAT with `write:packages` and the necessary repository/package permissions. |
| `vps-ssh-key` | SSH username with private key | SSH key authorized for your VPS deployment user. |
| `vps-known-hosts` | Secret file | The VPS host public key verified through the VPS provider or console, in OpenSSH known_hosts format. |

GHCR uses `ghcr.io`; set `REGISTRY_PREFIX` to a lowercase value such as `ghcr.io/your-account/skillbridge`. The VPS needs separate pull access to private packages. The Jenkins and VPS tokens do not belong in image layers or release artifacts. See [GitHub's Container Registry authentication documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

Set Jenkins parameters for your actual branch, `REGISTRY_PREFIX`, `VPS_HOST`, `VPS_USER`, `VPS_PORT`, and `VPS_DIRECTORY`. Initially enable publishing alone, verify the images in the registry, then enable VPS deployment after the following server setup.

## 4. VPS setup

The deployment scripts target a Linux VPS with Docker Engine, Docker Compose v2, Bash, OpenSSH, and `flock`. The SSH deployment user must be able to use Docker and own the application directory. These files do not install or replace software on a server automatically.

Prepare `/opt/skillbridge` for that user, create `/opt/skillbridge/.env.production` from `SkillBridge-backend/deploy/.env.production.example`, and give that file mode `600`. Set:

- A unique PostgreSQL password; retain it for the lifetime of that database volume.
- `PUBLIC_ORIGIN` to the actual HTTPS website origin.
- `BOOTSTRAP_ADMIN_EMAIL`, a unique password of 12–128 characters, and the admin name for the first deployment.
- SMTP settings and `MAIL_ENABLED=true` for registration verification and password-reset email. With mail disabled and development seeds disabled, self-registration is unavailable; the bootstrapped administrator can still sign in.

The bootstrap creates a verified admin with a BCrypt password hash only when that email does not exist. It does not reset existing credentials, promote an existing learner, or reset a workspace on restart. After initial provisioning, both bootstrap email and password can be removed together from the server environment.

Authenticate the VPS deployment user to GHCR using a separate token with `read:packages` if the images are private. Registry authentication is done once on the VPS with `docker login ghcr.io --username YOUR_ACCOUNT --password-stdin` and token input through stdin.

The production frontend binds only `127.0.0.1:8088`. Set up a host reverse proxy for HTTPS; `SkillBridge-backend/deploy/Caddyfile.example` shows the route. Replace its domain, point DNS to the VPS, and allow inbound 80/443. Database and backend ports do not need public firewall rules.

## 5. Releases, backups, and recovery

Jenkins uploads only the production Compose file, deployment script, image digest references, and release identifier to `/opt/skillbridge/releases/<commit-build>/`. Production credentials stay in `/opt/skillbridge/.env.production`.

The server script obtains a deployment lock, pulls the exact app image digests, ensures PostgreSQL is healthy, and writes a custom-format `pg_dump` backup under `/opt/skillbridge/backups/` **before** new application migrations run. It then updates the apps, checks their health and proxy, and changes the `current` symlink only on success. Application updates can briefly interrupt requests; this is not a zero-downtime deployment strategy.

If a deployment fails after app replacement, the script attempts to start the previous application images and returns failure to Jenkins. **Database migrations are not automatically reversed.** Backward-incompatible schema changes require a reviewed recovery plan; image rollback alone may not recover them. Database restoration is an operator action using the saved dump, because restoring it would discard newer writes.

Backups remain on the VPS. Configure off-server backup storage and retention for your deployment; the pipeline does not delete old backups or existing production volumes.

To migrate the existing local database, use PostgreSQL dump/restore as a separate planned step before the first live deployment. The pipeline deliberately does not read or upload your local pgAdmin database.

## Current activation requirements

The Docker build and pipeline source can be prepared and tested locally. Activating remote publication/deployment still requires the GitHub repository URL and branch, a configured Jenkins agent and credentials, registry permissions, the VPS SSH endpoint, and an HTTPS domain/reverse proxy. None of those external resources are created by committing the Docker files.

Validation distinguishes local runtime-image/Compose tests from remote pipeline activation: Jenkins registry publication and SSH deployment cannot be exercised until those external settings are supplied. The deployment script also has five isolated fake-Docker scenarios covering success, app rollback, backup failure, malformed releases, and concurrent deployment locking; those scenarios do not connect to a VPS.
