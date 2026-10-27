CREATE TABLE app_user (
 id BIGSERIAL PRIMARY KEY, name VARCHAR(80) NOT NULL, email VARCHAR(254) UNIQUE NOT NULL,
 password_hash TEXT NOT NULL, role VARCHAR(16) NOT NULL DEFAULT 'LEARNER' CHECK(role IN ('LEARNER','MENTOR','ADMIN')),
 enabled BOOLEAN NOT NULL DEFAULT true, verified BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE auth_token (token_hash CHAR(64) PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES app_user, expires_at TIMESTAMPTZ NOT NULL);
CREATE INDEX auth_token_user ON auth_token(user_id);
CREATE TABLE one_time_token (token_hash CHAR(64) PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES app_user, kind VARCHAR(16) NOT NULL, expires_at TIMESTAMPTZ NOT NULL);
CREATE TABLE workspace (user_id BIGINT PRIMARY KEY REFERENCES app_user, data JSONB NOT NULL DEFAULT '{}', updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE content (id BIGSERIAL PRIMARY KEY, kind VARCHAR(20) NOT NULL, title VARCHAR(150) NOT NULL, description TEXT NOT NULL DEFAULT '', data JSONB NOT NULL DEFAULT '{}', status VARCHAR(16) NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft','Published','Archived')), created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE mentor_profile (id BIGSERIAL PRIMARY KEY, user_id BIGINT UNIQUE REFERENCES app_user, name TEXT NOT NULL, expertise TEXT NOT NULL, bio TEXT NOT NULL, price NUMERIC(10,2) NOT NULL CHECK(price>=0), language TEXT NOT NULL DEFAULT 'English', timezone TEXT NOT NULL DEFAULT 'UTC', approved BOOLEAN NOT NULL DEFAULT false, development_seed BOOLEAN NOT NULL DEFAULT false);
CREATE TABLE mentor_application (id BIGSERIAL PRIMARY KEY, user_id BIGINT UNIQUE NOT NULL REFERENCES app_user, data JSONB NOT NULL, status VARCHAR(40) NOT NULL DEFAULT 'Pending', decision TEXT, reviewed_by BIGINT REFERENCES app_user, reviewed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE mentor_slot (mentor_id BIGINT NOT NULL REFERENCES mentor_profile, starts_at TIMESTAMPTZ NOT NULL, PRIMARY KEY(mentor_id,starts_at));
CREATE TABLE booking (id UUID PRIMARY KEY, learner_id BIGINT NOT NULL REFERENCES app_user, mentor_id BIGINT NOT NULL REFERENCES mentor_profile, starts_at TIMESTAMPTZ NOT NULL, status VARCHAR(16) NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled')), price NUMERIC(10,2) NOT NULL, idempotency_key UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(learner_id,idempotency_key));
CREATE UNIQUE INDEX active_booking_slot ON booking(mentor_id,starts_at) WHERE status='confirmed';
CREATE TABLE payment (id UUID PRIMARY KEY, booking_id UUID UNIQUE NOT NULL REFERENCES booking, provider VARCHAR(30) NOT NULL, provider_reference TEXT, status VARCHAR(20) NOT NULL CHECK(status IN ('test_paid','test_refunded','pending','paid','refunded')), amount NUMERIC(10,2) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE message (id BIGSERIAL PRIMARY KEY, booking_id UUID NOT NULL REFERENCES booking, sender_id BIGINT NOT NULL REFERENCES app_user, body VARCHAR(2000) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE project_feedback (id BIGSERIAL PRIMARY KEY, learner_id BIGINT NOT NULL REFERENCES app_user, mentor_id BIGINT NOT NULL REFERENCES app_user, project_id BIGINT NOT NULL, body TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE report (id BIGSERIAL PRIMARY KEY, reporter_id BIGINT REFERENCES app_user, kind VARCHAR(30) NOT NULL, description TEXT NOT NULL, status VARCHAR(16) NOT NULL DEFAULT 'Open', decision TEXT, reviewed_by BIGINT REFERENCES app_user, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE audit_event (id BIGSERIAL PRIMARY KEY, actor_id BIGINT REFERENCES app_user, action VARCHAR(80) NOT NULL, target TEXT NOT NULL, detail JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now());
