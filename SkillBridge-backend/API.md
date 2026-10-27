# REST API

Base URL: `/api`. JSON requests and responses. Interactive schemas are generated at `/v3/api-docs` and `/swagger-ui/index.html` while the API is running.

Authenticated requests use `Authorization: Bearer <token>` from `POST /auth/login`. The server derives permissions from the database. An optional login `role` selects the portal and must match the verified account role; it never grants permissions. Errors return an appropriate HTTP status and `{ "message": "…" }`; validation errors additionally include `errors: [{field,message}]`.

## Identity

| Method | Path | Input / behavior |
| --- | --- | --- |
| POST | `/auth/register` | `{name,email,password}`; creates an unverified learner; sends single-use verification token. Development mode without mail returns `developmentVerificationToken`. |
| POST | `/auth/verify` | `{token}`; consumes verification token; does not create a session. |
| POST | `/auth/login` | `{email,password}` → `{token,role,expiresIn}`. Verified, enabled accounts only. |
| POST | `/auth/forgot` | `{email}`; generic reset response; token sent by email. |
| POST | `/auth/reset` | `{token,password}`; consumes reset token and revokes all sessions. |
| GET | `/auth/session` | Authenticated current `{id,role}` from the server for session restoration. |
| POST | `/auth/logout` | Revokes current bearer token. |

## Catalog (public)

| Method | Path | Query / result |
| --- | --- | --- |
| GET | `/catalog/options` | Published skill and category names from database content records. |
| GET | `/catalog/courses`, `/catalog/projects` | `q`, `category`, `level`, zero-based `page`, `size` (1–50) → `{items,total,page,size,developmentData}`. |
| GET | `/catalog/courses/{id}`, `/catalog/projects/{id}` | Published item data; archived and unknown items return 404. |
| GET | `/catalog/mentors` | `q` matches name/expertise, `language`, `maxPrice`, `available`, `page` (12 per page). Approved profiles only, with database profession/company/image/rating/reviews and availability calculated from future unbooked slots. |
| GET | `/catalog/mentors/{id}/slots` | Future unbooked ISO UTC timestamps. |

## Learner workspace

| Method | Path | Input / behavior |
| --- | --- | --- |
| GET | `/workspace` | Current user's workspace with only authorized bookings/messages. Mentors receive their own assigned bookings; administrators receive bookings for management. |
| POST | `/workspace/profile` | `{name,bio,goal,level,skills,interests,avatar?}`. Optional PNG/JPEG/WebP data URL, under 500 KB. |
| POST | `/workspace/goal` | `{weeklyGoal}` between 1 and 30. |
| POST | `/workspace/saved` | `{saved:[courseId,…]}`; validates published course IDs. |
| POST | `/workspace/notifications` | Marks current notifications as read. |
| GET | `/recommendations` | `{mode,items:[{id,explanation,…}],fallbackReason?}`; mode identifies AI vs. rules. |
| POST | `/courses/{id}/enroll` | Idempotent enrollment. |
| POST | `/courses/{id}/lessons/{lesson}` | Zero-based lesson index; requires enrollment; idempotent completion. |
| POST | `/projects/{id}/start` | Idempotent project start. |
| POST | `/portfolio` | `{id,title,description,repository,demo,screenshot}`. Requires started project; URLs may be blank. |
| POST | `/bookings` | `{mentorId,time,idempotencyKey}`. UTC ISO timestamp, UUID key. Checks approved mentor, published slot, conflicting learner/mentor sessions. Records a development test payment atomically. |
| POST | `/bookings/{uuid}/cancel` | Participant/admin only; idempotent cancellation and test refund with audit record. |
| POST | `/messages` | Learner: `{mentorId,text}`. Mentor: `{mentorId,learnerId,text}`. Requires active booking between participants. |

Most mutation endpoints return the refreshed current workspace. Booking operations serialize on the learner and mentor rows; duplicate keys return the existing booking, and conflicting new keys return 409.

## Mentor

| Method | Path | Input / behavior |
| --- | --- | --- |
| POST | `/mentor/application` | `{name,expertise,experience,documents}`. Public supporting-document HTTP(S) URL. Requires an authenticated account; resubmission returns application to pending. |
| POST | `/mentor/availability` | `{slots:[UTC ISO timestamp,…],price}`. Only an approved profile belonging to current user. |
| GET | `/mentor/learners` | Booked learners' names/portfolio, restricted to current mentor. |
| POST | `/mentor/feedback` | `{learnerId,projectId,feedback}`. Requires mentor role, active booking, and the learner's existing portfolio project. |

## Administrator

All `/admin/**` routes require `ADMIN` on the backend.

| Method | Path | Input / behavior |
| --- | --- | --- |
| GET | `/admin/overview` | `days` (1–365); learner/approved-mentor/application/booking/test-revenue metrics. |
| GET | `/admin/users` | `q`, `role`, zero-based `page`; 10 records per page. |
| PATCH | `/admin/users/{id}` | `{name?,role?,enabled?}`; revokes affected sessions; prevents changing one's own role/status. |
| GET | `/admin/mentors` | All profiles with future availability, including hidden profiles. |
| PATCH | `/admin/mentors/{id}` | `{name,expertise,bio,language,price,approved,slots}`; validates future times and active mentor accounts; synchronizes workspace availability and price; audited. |
| GET | `/admin/applications` | Complete application list with structured `data` objects. |
| POST | `/admin/applications/decision` | `{applicationId,status,decision}`; `Approved`, `Rejected`, or `More information requested`; audits and notifies applicant. Approval creates/updates approved mentor profile and role. Review decisions revoke affected sessions. |
| GET, POST | `/admin/content` | List/create `{type,title,description,data?}` draft; list returns structured `data` objects; new catalog IDs are assigned by the database; type is Course/Project/Lesson/Category/Skill. |
| PATCH | `/admin/content/{id}` | `{title?,status?,data?}`; Draft/Published/Archived. Course/Project publication validates minimum catalog data. |
| GET | `/admin/bookings` | Recent bookings and test payment statuses. |
| GET | `/admin/audit` | Recent immutable application-level audit events. |
| GET | `/admin/reports` | Moderation queue. |
| PATCH | `/admin/reports/{id}` | `{decision}` resolves and audits a report. |

Catalog `data.id` identifies a course/project within its kind. Administrative `content.id` is a separate database record ID; retrieve it using `/admin/content`.
