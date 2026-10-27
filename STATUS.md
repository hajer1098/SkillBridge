# Implementation boundaries

The project is separated into `SkillBridge-backend` (Java API, database migrations, seeds, API tests) and `SkillBridge-frontend` (React app and browser assets). Each folder builds independently.

The delivered application is a working development implementation, with separate role login/logout flows, simplified workspaces, and a verified Spring Boot/PostgreSQL backend used by default. Browser-only accounts and local-storage data fallback have been removed. It is not a production-ready education/payment service.

## External configuration

- **Java/PostgreSQL hosting:** the private Sites deployment serves the static frontend demonstration. A production JVM service and PostgreSQL instance must be provisioned separately, then connected using an HTTPS `VITE_API_URL` and server-side CORS configuration.
- **Email:** Compose includes Mailpit for local verification and reset journeys. Real delivery needs SMTP configuration, a sender domain, delivery monitoring, and appropriate email templates. With SMTP disabled, a development-only verification token is explicitly identified.
- **AI:** the generic server-only compatible-provider adapter is implemented but unverified against a real provider. The verified default is transparent rules-based course ranking; mentor/project matching in the interface also uses transparent rules. Dedicated AI-generated mentor/project ranking is not implemented.
- **Payments:** checkout uses an **internal development sandbox**, not a payment provider's sandbox. No cards, real charges, transfers, or real refunds occur. A real provider sandbox integration, signed webhook handling, durable payment retry/reconciliation, and payout/refund authorization are still required. Booking/test-payment atomicity, duplicate-request handling, conflict prevention, and audit history are implemented and tested.

## Known product gaps

- Courses contain sample text modules and a common practical exercise, not a production video/course library. Content editors must replace and expand the curriculum.
- Mentors without published times show an unavailable message. A waitlist-email service is not implemented.
- Supporting mentor documents and portfolio screenshots use URLs. Private file uploads, durable object storage, malware checking, signed downloads, screenshot uploads, and document-access controls are not implemented.
- Mentor pricing and availability are editable by mentors; admins can edit mentor names, expertise, bio, language, approval, pricing, and availability. Time-zone preferences, session meeting/video links, structured learner ratings, earnings payouts, and mentor financial reporting need expansion. The approved-mentor API and booked-learner feedback access are implemented.
- Admins can review every mentor application, edit members and mentors, create/edit course and project fields through forms, publish/archive content, manage bookings, resolve reports with notes, and view audit activity. Advanced syllabus relationships and standalone lesson/category/skill assignment workflows need expansion; draft records for those content types can be created and edited.
- Catalog APIs support pagination and the administrator user list has pagination. Frontend catalogs load up to 50 courses/projects and 12 mentors and filter that loaded set; large catalogs need server-driven pagination throughout the interface.
- Moderation supports an existing report queue and audited resolution. User report submission and rich reported-message/profile/project context are not yet implemented.
- Analytics display recorded workspace counts and basic period totals, not historical cohort/engagement/completion charts. The weekly lesson ring uses recorded completion timestamps; new accounts start with empty progress.
- Authentication has no MFA or distributed rate limiter. Session tokens use browser session storage. Add a reviewed production identity setup, centralized throttling, security headers, dependency/security review, retention policies, backups, observability, and operational recovery before handling real learners' private data.
- Accessibility includes semantic controls, keyboard focus states, a dialog focus trap, reduced-motion handling, responsive layouts, and the requested palette. A full WCAG audit / assistive-technology review has not been completed.

## Verification limits

The actual Java API and PostgreSQL journeys were tested together on this machine. The role login/logout flows and content draft/edit/publication forms were exercised in the browser, along with session restoration and desktop/mobile layouts. Both API suites pass 17 subtests (19 reported tests including parents). The live API was connected to the user-provided `skillbridge-db`, seeded accounts were checked, and saved workspace changes survived an API restart. The earlier hosted static demo does not connect to this local PostgreSQL API. Real email delivery, external AI, external payments, and production infrastructure have not been tested. Docker Compose is supplied; it was not executed here because Docker's Linux engine was stopped. The equivalent JVM/PostgreSQL stack was exercised directly instead.
