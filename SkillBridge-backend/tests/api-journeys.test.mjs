import { test } from "node:test";
import crypto from "node:crypto";
import assert from "node:assert/strict";
const base = process.env.TEST_API_URL || "http://127.0.0.1:8080/api";
async function api(path, body, token, expected = 200, method) {
  const response = await fetch(base + path, {
    method: method || (body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  assert.equal(response.status, expected, JSON.stringify({ path, data }));
  return data;
}
const login = async (email, password = "SkillBridge!2026") =>
  (await api("/auth/login", { email, password })).token;
test("SkillBridge journeys on PostgreSQL: identity, learning, approval, booking, privacy, portfolio, moderation", async (t) => {
  let learner,
    admin,
    mentor,
    newUser,
    email,
    applicationId,
    mentorId,
    bookingId,
    slot;
  await t.test("public catalog and private workspace boundary", async () => {
    assert.equal((await api("/health")).status, "up");
    const reactCourses = await api("/catalog/courses?q=React");
    assert.ok(reactCourses.total >= 1);
    assert.ok(reactCourses.items.some(course => course.id === 2 && course.title.includes("React")));
    await api("/workspace", undefined, undefined, 401);
    learner = await login("learner@skillbridge.local");
    admin = await login("admin@skillbridge.local");
    mentor = await login("mentor@skillbridge.local");
    await api("/admin/users", undefined, learner, 403);
    const email = "learner-" + crypto.randomUUID() + "@example.test";
    const r = await api("/auth/register", {
      name: "Fresh Learner",
      email,
      password: "SkillBridge!2026",
    });
    await api("/auth/verify", { token: r.developmentVerificationToken });
    learner = await login(email);
  });
  await t.test(
    "registration, one-time verification, and profile recommendations",
    async () => {
      email = "journey-" + crypto.randomUUID() + "@example.test";
      const registration = await api("/auth/register", {
        name: "Journey Learner",
        email,
        password: "A-test-password!2026",
      });
      assert.ok(registration.developmentVerificationToken);
      await api(
        "/auth/login",
        { email, password: "A-test-password!2026" },
        undefined,
        403,
      );
      await api("/auth/verify", {
        token: registration.developmentVerificationToken,
      });
      await api(
        "/auth/verify",
        { token: registration.developmentVerificationToken },
        undefined,
        400,
      );
      newUser = await login(email, "A-test-password!2026");
      await api(
        "/workspace/profile",
        {
          name: "Journey Learner",
          bio: "Learning with intention.",
          goal: "Become a product designer",
          level: "Beginner",
          skills: ["UX design", "Figma"],
          interests: ["Design"],
        },
        newUser,
      );
      const rec = await api("/recommendations", undefined, newUser);
      assert.equal(rec.mode, "rules-based");
      assert.equal(rec.items[0].id, 1);
      assert.ok(rec.items[0].explanation.includes("UX design"));
    },
  );
  await t.test(
    "enrollment and lesson completion are persistent and idempotent",
    async () => {
      await api("/courses/1/lessons/0", {}, newUser, 403);
      await api("/courses/1/enroll", {}, newUser);
      await api("/courses/1/enroll", {}, newUser);
      await api("/courses/1/lessons/0", {}, newUser);
      const state = await api("/courses/1/lessons/0", {}, newUser);
      assert.deepEqual(state.enrolled, [1]);
      assert.deepEqual(state.completed["1"], [0]);
      assert.ok(state.lessonDates["1:0"]);
      await api("/courses/1/lessons/100", {}, newUser, 400);
    },
  );
  await t.test(
    "mentor application requires admin approval before availability",
    async () => {
      await api("/mentor/availability", { price: 40, slots: [] }, newUser, 403);
      const state = await api(
        "/mentor/application",
        {
          name: "Journey Mentor "+(await api("/workspace",undefined,newUser)).email,
          expertise: "UX design, Figma",
          experience:
            "Five years of design experience and two years of supporting new designers.",
          documents: "https://example.test/public-cv.pdf",
        },
        newUser,
      );
      applicationId = state.application.id;
      await api(
        "/admin/applications/decision",
        {
          applicationId,
          status: "Approved",
          decision: "Verified sample qualifications for the development test.",
        },
        newUser,
        403,
      );
      await api(
        "/admin/applications/decision",
        {
          applicationId,
          status: "Approved",
          decision: "Verified sample qualifications for the development test.",
        },
        admin,
      );
      const logged = await api("/auth/login", {
        email,
        password: "A-test-password!2026",
      });
      assert.equal(logged.role, "MENTOR");
      newUser = logged.token;
      const directory = await api("/catalog/mentors?q="+encodeURIComponent("Journey Mentor "+email));
      mentorId = directory[0].id;
      slot = new Date(Date.now() + 3 * 86400000);
      slot.setUTCHours(15, 0, 0, 0);
      slot = slot.toISOString();
      await api("/mentor/availability", { price: 40, slots: [slot] }, newUser);
      assert.deepEqual(await api("/catalog/mentors/" + mentorId + "/slots"), [
        slot.replace(".000Z", "Z"),
      ]);
    },
  );
  await t.test(
    "concurrent duplicate bookings charge once and conflicting slots fail",
    async () => {
      const body = {
        mentorId,
        time: slot,
        idempotencyKey: crypto.randomUUID(),
      };
      const [a, b] = await Promise.all([
        api("/bookings", body, learner),
        api("/bookings", body, learner),
      ]);
      const booked = a.bookings.filter(
        (x) => x.mentorId === mentorId && x.time === slot.replace(".000Z", "Z"),
      );
      assert.equal(booked.length, 1);
      assert.equal(b.bookings.filter((x) => x.mentorId === mentorId).length, 1);
      bookingId = booked[0].id;
      await api(
        "/bookings",
        { ...body, idempotencyKey: crypto.randomUUID() },
        learner,
        409,
      );
      const audit = await api("/admin/audit", undefined, admin);
      assert.equal(
        audit.filter(
          (x) => x.target === bookingId && x.action === "payment.test_paid",
        ).length,
        1,
      );
    },
  );
  await t.test(
    "private messages and bookings remain scoped to participants",
    async () => {
      await api(
        "/messages",
        { mentorId, text: "Looking forward to discussing my portfolio." },
        learner,
      );
      const mentorState = await api("/workspace", undefined, newUser);
      assert.ok(mentorState.messages.some((m) => m.text.includes("portfolio")));
      const outsiderEmail = "outsider-" + crypto.randomUUID() + "@example.test";
      const r = await api("/auth/register", {
        name: "Unrelated Learner",
        email: outsiderEmail,
        password: "Another-test!2026",
      });
      await api("/auth/verify", { token: r.developmentVerificationToken });
      const outsider = await login(outsiderEmail, "Another-test!2026");
      const privateState = await api("/workspace", undefined, outsider);
      assert.equal(privateState.bookings.length, 0);
      assert.equal(privateState.messages.length, 0);
      await api("/bookings/" + bookingId + "/cancel", {}, outsider, 403);
      await api(
        "/messages",
        { mentorId, text: "Unauthorized conversation attempt" },
        outsider,
        403,
      );
    },
  );
  await t.test(
    "project portfolio validates prerequisites and URLs",
    async () => {
      const item = {
        id: 1,
        title: "A more mindful day",
        description:
          "I interviewed two learners, mapped their daily routines, and tested a three-screen wellness prototype.",
        repository: "https://example.test/repo",
        demo: "https://example.test/demo",
        screenshot: "",
      };
      await api("/portfolio", item, learner, 400);
      await api("/projects/1/start", {}, learner);
      await api(
        "/portfolio",
        { ...item, demo: "javascript:alert(1)" },
        learner,
        400,
      );
      const state = await api("/portfolio", item, learner);
      assert.ok(state.portfolio.some((x) => x.id === 1));
    },
  );
  await t.test("mentor feedback is limited to booked learners", async () => {
    const learnerState = await api("/workspace", undefined, learner);
    const learnerId = learnerState.bookings.find(
      (x) => x.id === bookingId,
    ).learnerId;
    await api(
      "/mentor/feedback",
      {
        learnerId,
        projectId: 1,
        feedback:
          "A clear narrative. Add notes about the usability test and its limitations.",
      },
      newUser,
    );
    await api(
      "/mentor/feedback",
      {
        learnerId,
        projectId: 1,
        feedback:
          "A clear narrative. Add notes about the usability test and its limitations.",
      },
      mentor,
      403,
    );
  });
  await t.test(
    "cancellation and refund actions are idempotent and auditable",
    async () => {
      await api("/bookings/" + bookingId + "/cancel", {}, learner);
      await api("/bookings/" + bookingId + "/cancel", {}, learner);
      const audit = await api("/admin/audit", undefined, admin);
      assert.equal(
        audit.filter(
          (x) =>
            x.target === bookingId &&
            x.action === "booking.cancel_and_test_refund",
        ).length,
        1,
      );
      const transactions = await api("/admin/bookings", undefined, admin);
      assert.equal(
        transactions.find((x) => x.id === bookingId).payment_status,
        "test_refunded",
      );
    },
  );
  await t.test(
    "admin content, moderation, and suspension revoke access",
    async () => {
      const created = await api(
        "/admin/content",
        {
          type: "Course",
          title: "A new learning chapter",
          description: "Development integration test draft",
        },
        admin,
      );
      assert.equal(created.status, "Draft");
      await api(
        "/admin/content/" + created.id,
        { status: "Archived" },
        admin,
        200,
        "PATCH",
      );
      const reports = await api("/admin/reports", undefined, admin);
      await api(
        "/admin/reports/" + reports[0].id,
        { decision: "Attribution checked and development report resolved." },
        admin,
        200,
        "PATCH",
      );
      const users = await api(
        "/admin/users?q=" + encodeURIComponent(email),
        undefined,
        admin,
      );
      await api(
        "/admin/users/" + users[0].id,
        { enabled: false },
        admin,
        200,
        "PATCH",
      );
      await api("/workspace", undefined, newUser, 401);
      await api(
        "/auth/login",
        { email, password: "A-test-password!2026" },
        undefined,
        401,
      );
      await api(
        "/auth/login",
        { email: "bad-email", password: "x" },
        undefined,
        400,
      );
    },
  );
});
