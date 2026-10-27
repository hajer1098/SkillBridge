import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  LayoutDashboard,
  Route,
  BookOpen,
  Users,
  FolderKanban,
  BriefcaseBusiness,
  MessageCircle,
  BarChart3,
  Settings,
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  Plus,
  Check,
  Clock,
  Flame,
  Star,
  Bookmark,
  MoreHorizontal,
  Play,
  CalendarDays,
  X,
  Sparkles,
  Target,
  LogOut,
  ShieldCheck,
  Menu,
  Send,
  GraduationCap,
  CheckCircle2,
  ExternalLink,
  Heart,
  Leaf,
  Upload,
  Download,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  courses as seedCourses,
  mentors as seedMentors,
  projects as seedProjects,
  initialState,
  skillOptions,
  scoreItem,
  explanation,
} from "./data";
import type { AppState, Course } from "./data";
import { Bridge, HeroArt, CourseArt } from "./Art";

const nav = [
  ["dashboard", "Overview", LayoutDashboard],
  ["path", "My learning path", Route],
  ["learning", "My learning", BookOpen],
  ["mentors", "Find a mentor", Users],
  ["projects", "Explore projects", FolderKanban],
  ["portfolio", "My portfolio", BriefcaseBusiness],
  ["messages", "Messages", MessageCircle],
  ["progress", "My progress", BarChart3],
] as const;
const apiBase = (import.meta as unknown as { env: Record<string, string> }).env
  .VITE_API_URL;
type Modal = { type: string; id?: number };
const dateText = (v: string) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(v));
function loadState(): AppState {
  if (apiBase)
    return {
      ...initialState,
      name: "Curious learner",
      email: "",
      enrolled: [],
      completed: {},
      lessonDates: {},
      bookings: [],
      messages: [],
      portfolio: [],
      started: [],
      notifications: [],
    };
  try {
    return {
      ...initialState,
      ...JSON.parse(localStorage.getItem("skillbridge-v1") || "null"),
    };
  } catch {
    return initialState;
  }
}
export default function App() {
  const [courses, setCourses] = useState(seedCourses),
    [mentors, setMentors] = useState(seedMentors),
    [projects, setProjects] = useState(seedProjects),
    [serverSlots, setServerSlots] = useState<string[]>([]),
    [remoteRecommendations, setRemoteRecommendations] = useState<{
      mode: string;
      items: { id: number; explanation: string }[];
    } | null>(null),
    [selectedLearner, setSelectedLearner] = useState(0),
    [verificationToken, setVerificationToken] = useState(""),
    [userPage, setUserPage] = useState(0),
    [adminContent, setAdminContent] = useState<
      {
        id: number;
        title: string;
        kind: string;
        status: string;
        data: Record<string, unknown>;
      }[]
    >([]),
    [mentorLearners, setMentorLearners] = useState<
      { id: number; name: string; portfolio: { id: number; title: string }[] }[]
    >([]),
    [adminOverview, setAdminOverview] = useState<{
      learners: number;
      mentors: number;
      pendingApplications: number;
      testRevenue: number;
    } | null>(null);
  const [state, setState] = useState<AppState>(loadState),
    [page, setPage] = useState(
      location.hash.slice(1) ||
        (location.pathname === "/admin" ? "admin" : "dashboard"),
    ),
    [modal, setModal] = useState<Modal | null>(null),
    [toast, setToast] = useState(""),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All topics"),
    [level, setLevel] = useState("All levels"),
    [duration, setDuration] = useState("Any duration"),
    [language, setLanguage] = useState("All languages"),
    [price, setPrice] = useState("Any price"),
    [available, setAvailable] = useState(false),
    [role, setRole] = useState(sessionStorage.getItem("sb-role") || "LEARNER"),
    [roleMenu, setRoleMenu] = useState(false),
    [mobile, setMobile] = useState(false),
    [selectedMentor, setSelectedMentor] = useState(1),
    [loading, setLoading] = useState(false),
    [authMode, setAuthMode] = useState("login"),
    [slot, setSlot] = useState(""),
    [adminTab, setAdminTab] = useState("Overview"),
    [adminUsers, setAdminUsers] = useState([
      {
        id: 1,
        name: "Jamie Taylor",
        email: "jamie@example.com",
        role: "LEARNER",
        enabled: true,
      },
      {
        id: 2,
        name: "Sophie Chen",
        email: "sophie@example.com",
        role: "MENTOR",
        enabled: true,
      },
    ]),
    [contentStatus, setContentStatus] = useState<Record<number, string>>({}),
    [reports, setReports] = useState([
      {
        id: 1,
        text: "Reported project: missing image attribution",
        status: "Open",
      },
    ]),
    [adminRange, setAdminRange] = useState("Last 30 days");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined,
    ),
    dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!apiBase) return;
    Promise.all([
      request("/catalog/courses?size=50"),
      request("/catalog/projects?size=50"),
      request("/catalog/mentors"),
    ])
      .then(([c, p, m]) => {
        setCourses(c.items);
        setProjects(p.items);
        setMentors(
          m.map((v: Record<string, unknown>) => {
            const seed = seedMentors.find((x) => x.id === v.id);
            return {
              ...seed,
              id: Number(v.id),
              name: String(v.name),
              skills:
                typeof v.expertise === "string"
                  ? String(v.expertise).startsWith("[")
                    ? JSON.parse(String(v.expertise))
                    : String(v.expertise)
                        .split(",")
                        .map((x) => x.trim())
                  : [],
              bio: String(v.bio),
              price: Number(v.price),
              language: String(v.language),
              role: seed?.role || "SkillBridge Mentor",
              company: seed?.company || "Independent",
              rating: seed?.rating || "New",
              reviews: seed?.reviews || 0,
              image: seed?.image || seedMentors[0].image,
              available: true,
            };
          }),
        );
      })
      .catch((e) => notify("Catalog could not load: " + e.message));
  }, []);
  useEffect(() => {
    if (modal?.type !== "mentor") return;
    setSlot("");
    if (apiBase)
      request("/catalog/mentors/" + modal.id + "/slots")
        .then(setServerSlots)
        .catch((e) => notify(e.message));
  }, [modal?.type, modal?.id]);
  useEffect(() => {
    if (apiBase && sessionStorage.getItem("sb-token"))
      request("/recommendations")
        .then(setRemoteRecommendations)
        .catch(() => setRemoteRecommendations(null));
  }, [
    state.skills.join(","),
    state.goal,
    state.level,
    JSON.stringify(state.completed),
  ]);
  useEffect(() => {
    if (!apiBase || !sessionStorage.getItem("sb-token")) return;
    if (page === "admin" && role === "ADMIN") {
      request("/admin/content")
        .then(setAdminContent)
        .catch((e) => notify(e.message));
      request("/admin/reports")
        .then((rows) =>
          setReports(
            rows.map(
              (r: { id: number; description: string; status: string }) => ({
                id: r.id,
                text: r.description,
                status: r.status,
              }),
            ),
          ),
        )
        .catch((e) => notify(e.message));
      request(
        "/admin/overview?days=" +
          (adminRange === "Today" ? 1 : adminRange === "Last 7 days" ? 7 : 30),
      )
        .then(setAdminOverview)
        .catch((e) => notify(e.message));
    }
    if (page === "mentor" && role === "MENTOR")
      request("/mentor/learners")
        .then((rows) =>
          setMentorLearners(
            rows.map((r: { id: number; name: string; portfolio: unknown }) => ({
              ...r,
              portfolio:
                typeof r.portfolio === "string"
                  ? JSON.parse(r.portfolio)
                  : r.portfolio || [],
            })),
          ),
        )
        .catch((e) => notify(e.message));
  }, [page, role, adminRange, adminTab]);
  const token = () => sessionStorage.getItem("sb-token");
  function notify(text: string) {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4200);
  }
  function go(p: string) {
    setPage(p);
    location.hash = p;
    setQuery("");
    setCategory("All topics");
    setLevel("All levels");
    setDuration("Any duration");
    setMobile(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function update(partial: Partial<AppState>) {
    setState((s) => ({ ...s, ...partial }));
  }
  function addNotification(text: string, s: AppState) {
    return [{ text, read: false }, ...s.notifications];
  }
  async function request(path: string, body?: unknown, method?: string) {
    const r = await fetch(apiBase + path, {
      method: method || (body ? "POST" : "GET"),
      headers: {
        "Content-Type": "application/json",
        ...(token() ? { Authorization: "Bearer " + token() } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await r.json();
    if (!r.ok)
      throw new Error(
        data.message || "Something went wrong. Please try again.",
      );
    return data;
  }
  async function action(
    path: string,
    body: unknown,
    local: (s: AppState) => AppState,
    success: string,
  ) {
    if (apiBase && !token()) {
      setAuthMode("login");
      setTimeout(() => setModal({ type: "auth" }), 0);
      notify("Please sign in to save changes to your server workspace.");
      return false;
    }
    setLoading(true);
    try {
      if (apiBase) {
        if (!token()) {
          setAuthMode("login");
          setModal({ type: "auth" });
          throw new Error(
            "Please sign in to save changes to your server workspace.",
          );
        }
        const data = await request(path, body);
        setState(data);
      } else setState(local);
      notify(success);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!apiBase) localStorage.setItem("skillbridge-v1", JSON.stringify(state));
  }, [state]);
  useEffect(() => {
    const listener = () => setPage(location.hash.slice(1) || "dashboard");
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  useEffect(() => {
    document.title =
      (page === "dashboard"
        ? "Your learning, connected"
        : page.charAt(0).toUpperCase() + page.slice(1)) + " · SkillBridge";
  }, [page]);
  useEffect(() => {
    if (apiBase && token())
      request("/workspace")
        .then(setState)
        .catch(() => {
          sessionStorage.removeItem("sb-token");
          notify("Your session has expired. Please sign in again.");
        });
  }, []);
  useEffect(() => {
    if (page === "admin" && apiBase && token())
      request(
        "/admin/users?page=" + userPage + "&q=" + encodeURIComponent(query),
      )
        .then(setAdminUsers)
        .catch((e) => notify(e.message));
  }, [page, userPage, query]);
  useEffect(() => {
    if (!modal) return;
    const prev = document.activeElement as HTMLElement;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(null);
      if (e.key === "Tab") {
        const els = dialogRef.current?.querySelectorAll<HTMLElement>(
          "button,input,select,textarea,a[href]",
        );
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", key);
      prev?.focus();
    };
  }, [modal]);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const weekLessons = Object.values(state.lessonDates || {}).filter(
    (d) => new Date(d) >= weekStart,
  ).length;
  const visibleEnrollments=state.enrolled.filter(id=>courses.some(c=>c.id===id));
  const done = Object.values(state.completed).reduce((a, v) => a + v.length, 0),
    progress = Math.min(
      100,
      Math.round(
        (done /
          Math.max(
            1,
            state.enrolled.reduce(
              (n, id) =>
                n + (courses.find((c) => c.id === id)?.lessons.length || 0),
              0,
            ),
          )) *
          100,
      ),
    );
  const recommended = [...courses].sort((a, b) =>
    remoteRecommendations
      ? remoteRecommendations.items.findIndex((x) => x.id === a.id) -
        remoteRecommendations.items.findIndex((x) => x.id === b.id)
      : scoreItem(b, state) - scoreItem(a, state),
  );
  const recommendMode =
    remoteRecommendations?.mode === "ai"
      ? "AI-assisted recommendations"
      : "Rules-based recommendations";
  const reason = (item: { id: number; skills: string[]; level?: string }) =>
    remoteRecommendations?.items.find((x) => x.id === item.id)?.explanation ||
    explanation(item, state);
  const filteredCourses = (
    page === "learning"
      ? courses.filter((c) => state.enrolled.includes(c.id))
      : courses
  ).filter(
    (c) =>
      (c.title + " " + c.skills.join(" "))
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (category === "All topics" || c.category === category) &&
      (level === "All levels" || c.level === level) &&
      (duration === "Any duration" ||
        (duration === "Under 8 hours" ? c.hours < 8 : c.hours >= 8)),
  );
  const filteredMentors = mentors.filter(
    (m) =>
      (m.name + " " + m.skills.join(" "))
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (language === "All languages" || m.language === language) &&
      (!available || m.available) &&
      (price === "Any price" || m.price <= 50) &&
      (category === "All topics" ||
        m.skills.some((s) => s.toLowerCase().includes(category.toLowerCase()))),
  );
  const filteredProjects = projects.filter(
    (p) =>
      (p.title + " " + p.skills.join(" "))
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (category === "All topics" || p.category === category) &&
      (level === "All levels" || p.level === level) &&
      (duration === "Any duration" ||
        (duration === "Under 8 hours" ? p.hours < 8 : p.hours >= 8)),
  );
  const activeBookings = state.bookings.filter((b) => b.status === "confirmed"),
    upcoming = activeBookings[0];
  function toggleSave(id: number) {
    const next = state.saved.includes(id)
      ? state.saved.filter((x) => x !== id)
      : [...state.saved, id];
    action(
      "/workspace/saved",
      { saved: next },
      (s) => ({ ...s, saved: next }),
      next.includes(id)
        ? "Saved to your collection"
        : "Removed from saved courses",
    );
  }
  function enroll(id: number) {
    action(
      "/courses/" + id + "/enroll",
      {},
      (s) => ({ ...s, enrolled: [...new Set([...s.enrolled, id])] }),
      "You’re enrolled. Let’s make a little progress!",
    );
  }
  function completeLesson(id: number, index: number) {
    action(
      "/courses/" + id + "/lessons/" + index,
      {},
      (s) => ({
        ...s,
        completed: {
          ...s.completed,
          [id]: [...new Set([...(s.completed[id] || []), index])],
        },
        lessonDates: {
          ...s.lessonDates,
          [id + ":" + index]: new Date().toISOString(),
        },
        notifications: addNotification(
          "A little progress! You completed a new lesson.",
          s,
        ),
      }),
      "Lesson complete. One step closer!",
    );
  }
  const empty = (title: string, desc: string) => (
    <div className="empty">
      <Leaf size={32} />
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
  const sectionTitle = (
    title: string,
    sub: string,
    actionLabel?: string,
    onAction?: () => void,
  ) => (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        <p>{sub}</p>
      </div>
      {actionLabel && (
        <button className="text-button" onClick={onAction}>
          {actionLabel}
          <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
  const courseCard = (c: Course) => (
    <article className="course-card" key={c.id}>
      <button
        className="art-button"
        aria-label={"View " + c.title}
        onClick={() => setModal({ type: "course", id: c.id })}
      >
        <CourseArt type={c.art} />
      </button>
      <div className="course-body">
        <div className="card-meta">
          <span className={"tag " + c.color}>{c.category}</span>
          <button
            className={
              "icon-button save " +
              (state.saved.includes(c.id) ? "is-saved" : "")
            }
            onClick={() => toggleSave(c.id)}
            aria-label={
              state.saved.includes(c.id)
                ? "Unsave " + c.title
                : "Save " + c.title
            }
          >
            <Bookmark
              size={16}
              fill={state.saved.includes(c.id) ? "currentColor" : "none"}
            />
          </button>
        </div>
        <button
          className="card-title"
          onClick={() => setModal({ type: "course", id: c.id })}
        >
          {c.title}
        </button>
        <p className="instructor">with {c.instructor}</p>
        <div className="course-facts">
          <span>
            <Clock size={13} />
            {c.hours} hours
          </span>
          <span>
            <BarChart3 size={13} />
            {c.level}
          </span>
          <span className="rating">
            <Star size={12} fill="currentColor" />
            {c.rating}
          </span>
        </div>
        {page === "learning" && (
          <div className="learning-progress">
            <div className="progress-track">
              <i
                style={{
                  width:
                    ((state.completed[c.id]?.length || 0) / c.lessons.length) *
                      100 +
                    "%",
                }}
              />
            </div>
            <span>
              {state.completed[c.id]?.length || 0} of {c.lessons.length} lessons
            </span>
          </div>
        )}
      </div>
    </article>
  );
  const filterBar = (kind: string) => (
    <div className="filters">
      <div className="field-search">
        <Search size={17} />
        <input
          aria-label={"Search " + kind}
          placeholder={"Search " + kind + " or skills…"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <select
        aria-label="Topic"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option>All topics</option>
        {(kind === "mentors"
          ? ["UX design", "React", "Data analysis", "Research"]
          : ["Design", "Development", "Data science", "Business"]
        ).map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      {kind === "mentors" ? (
        <>
          <select
            aria-label="Language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option>All languages</option>
            <option>English</option>
            <option>French</option>
          </select>
          <select
            aria-label="Session price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          >
            <option>Any price</option>
            <option>Up to €50</option>
          </select>
          <label className="check-filter">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
            />
            Available now
          </label>
        </>
      ) : (
        <>
          <select
            aria-label="Difficulty"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option>All levels</option>
            <option>Beginner</option>
            <option>Intermediate</option>
          </select>
          <select
            aria-label="Duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          >
            <option>Any duration</option>
            <option>Under 8 hours</option>
            <option>8 hours or more</option>
          </select>
        </>
      )}
    </div>
  );
  const pageHeader = (eyebrow: string, title: string, description: string) => (
    <div className="page-heading">
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
  async function auth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setLoading(true);
    try {
      if (apiBase) {
        const data = await request("/auth/" + authMode, Object.fromEntries(f));
        if (data.token) {
          sessionStorage.setItem("sb-token", data.token);
          sessionStorage.setItem("sb-role", data.role);
          setRole(data.role);
          setState(await request("/workspace"));
          setModal(null);
          notify("Welcome back. Your workspace is ready.");
        } else {
          notify(data.message);
          if (data.developmentVerificationToken) {
            setVerificationToken(data.developmentVerificationToken);
            setAuthMode("verify");
          } else if (authMode === "verify" || authMode === "reset")
            setAuthMode("login");
        }
      } else if (authMode === "login" || authMode === "register") {
        if (authMode === "register")
          setState({
            ...initialState,
            name: String(f.get("name")),
            email: String(f.get("email")),
            enrolled: [],
            completed: {},
          });
        setModal(null);
        notify(
          authMode === "register"
            ? "Demo profile created on this browser. Complete your profile to get started."
            : "Demo workspace opened. Server authentication requires the backend.",
        );
        if (authMode === "register") go("settings");
      } else
        notify(
          "Demo mode: email delivery requires the backend and SMTP configuration.",
        );
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const partial = {
      name: String(f.get("name")),
      bio: String(f.get("bio")),
      goal: String(f.get("goal")),
      level: String(f.get("level")),
      interests: String(f.get("interests"))
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      skills: state.skills,
      avatar: state.avatar,
    };
    await action(
      "/workspace/profile",
      partial,
      (s) => ({ ...s, ...partial }),
      "Profile updated. Your recommendations have been refreshed.",
    );
  }
  function renderDashboard() {
    return (
      <>
        <div className="greeting">
          <div>
            <div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div>
            <h1>
              A little progress, every day
              <span className="greeting-dot">.</span>
            </h1>
            <p>
              Welcome back, {state.name.split(" ")[0]}. Let’s turn your
              potential into possibility.
            </p>
          </div>
          <div className="date-label">
            <CalendarDays size={15} />
            {new Intl.DateTimeFormat("en", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(new Date())}
          </div>
        </div>
        <div className="dashboard-grid">
          <div className="main-column">
            <section className="welcome-banner">
              <div className="banner-copy">
                <span className="banner-kicker">
                  <Sparkles size={13} /> A PATH THAT’S UNIQUELY YOU
                </span>
                <h2>
                  Your ambitions.
                  <br />A little more within reach.
                </h2>
                <p>
                  Build the skills, meet your people, and
                  <br className="desktop-break" /> take the next step toward
                  your future.
                </p>
                <button className="primary" onClick={() => go("path")}>
                  Explore my learning path
                  <ArrowRight size={16} />
                </button>
              </div>
              <HeroArt />
            </section>
            <div className="stats-row">
              {(
                [
                  [
                    BookOpen,
                    "Courses in progress",
                    visibleEnrollments.filter(
                      (id) =>
                        (state.completed[id]?.length || 0) <
                        courses.find((c) => c.id === id)!.lessons.length,
                    ).length,
                    "rose",
                  ],
                  [CheckCircle2, "Lessons completed", done, "pistachio"],
                  [
                    FolderKanban,
                    "Projects started",
                    state.started.length,
                    "apricot",
                  ],
                ] as [LucideIcon, string, number, string][]
              ).map(([Icon, label, value, color]) => (
                <button
                  className="stat-card"
                  key={label}
                  onClick={() =>
                    go(
                      label.startsWith("Projects")
                        ? "projects"
                        : label.startsWith("Lessons")
                          ? "progress"
                          : "learning",
                    )
                  }
                >
                  <span className={"stat-icon " + color}>
                    <Icon size={19} />
                  </span>
                  <span>
                    <strong>{String(value).padStart(2, "0")}</strong>
                    <small>{label}</small>
                  </span>
                  <ArrowUpRight className="stat-arrow" size={15} />
                </button>
              ))}
            </div>
            {sectionTitle(
              "Pick up where you left off",
              "Your next small step is waiting.",
              "My learning",
              () => go("learning"),
            )}
            {visibleEnrollments.length > 0 ? (
              (() => {
                const c = courses.find((c) => c.id === visibleEnrollments[0])!,
                  count = state.completed[c.id]?.length || 0;
                return (
                  <div className="continue-card">
                    <div className="mini-art">
                      <CourseArt type={c.art} />
                    </div>
                    <div className="continue-info">
                      <span className="micro-label">
                        {c.category} <span>•</span> {c.level}
                      </span>
                      <h3>{c.title}</h3>
                      <p>
                        {count === c.lessons.length
                          ? "All lessons complete. Beautiful work."
                          : `Up next: ${c.lessons[count]}`}
                      </p>
                      <div className="continue-progress">
                        <div className="progress-track">
                          <i
                            style={{
                              width: (count / c.lessons.length) * 100 + "%",
                            }}
                          />
                        </div>
                        <span>
                          {Math.round((count / c.lessons.length) * 100)}%
                        </span>
                      </div>
                    </div>
                    <button
                      className="play-button"
                      aria-label="Continue learning"
                      onClick={() => setModal({ type: "course", id: c.id })}
                    >
                      <Play size={17} fill="currentColor" />
                    </button>
                  </div>
                );
              })()
            ) : (
              <div className="continue-card">
                <BookOpen />
                <div>
                  <h3>Your first chapter awaits.</h3>
                  <p>Choose a course to start building momentum.</p>
                </div>
                <button className="primary" onClick={() => go("courses")}>
                  Find a course
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
            {sectionTitle(
              "A good fit for your next chapter",
              "Handpicked for your skills, interests, and goals.",
              "Explore all",
              () => go("courses"),
            )}
            <div className="recommend-label">
              <Sparkles size={12} /> PERSONALIZED FOR YOU{" "}
              <span>{recommendMode}</span>
            </div>
            <div className="course-grid dashboard-courses">
              {recommended.slice(0, 3).map(courseCard)}
            </div>
          </div>
          <aside className="right-column">
            <section className="weekly-card">
              <div className="small-heading">
                <h3>Your weekly rhythm</h3>
                <button
                  className="icon-button"
                  aria-label="Edit weekly goal"
                  onClick={() => setModal({ type: "goal" })}
                >
                  <MoreHorizontal size={20} />
                </button>
              </div>
              <div className="weekly-ring">
                <svg viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#E3EACF"
                    strokeWidth="8"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#526044"
                    strokeWidth="8"
                    strokeDasharray={`${Math.min(1, weekLessons / state.weeklyGoal) * 314} 314`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div>
                  <strong>
                    {Math.min(weekLessons, state.weeklyGoal)}
                    <small> / {state.weeklyGoal}</small>
                  </strong>
                  <span>lessons this week</span>
                </div>
              </div>
              <div className="week-days">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <span key={i}>
                    <b
                      className={
                        Object.values(state.lessonDates || {}).some(
                          (d) =>
                            new Date(d) >= weekStart &&
                            (new Date(d).getDay() + 6) % 7 === i,
                        )
                          ? "day-done"
                          : i === (new Date().getDay() + 6) % 7
                            ? "day-current"
                            : ""
                      }
                    >
                      {Object.values(state.lessonDates || {}).some(
                        (d) =>
                          new Date(d) >= weekStart &&
                          (new Date(d).getDay() + 6) % 7 === i,
                      ) ? (
                        <Check size={11} />
                      ) : (
                        d
                      )}
                    </b>
                    <small>{d}</small>
                  </span>
                ))}
              </div>
              <div className="rhythm-note">
                <Flame size={16} />
                <span>
                  {done > 0
                    ? "You’re building something good."
                    : "Every journey starts with one step."}
                  <small>Keep showing up for yourself.</small>
                </span>
              </div>
            </section>
            <section className="mentor-widget">
              <div className="small-heading">
                <h3>Your next connection</h3>
                <span className="tiny-dot" />
              </div>
              {upcoming ? (
                (() => {
                  const m =
                    mentors.find((m) => m.id === upcoming.mentorId) ||
                    seedMentors[0];
                  return (
                    <>
                      <div className="mini-mentor">
                        <img src={m.image} alt={m.name} />
                        <div>
                          <h4>{m.name}</h4>
                          <p>{m.role}</p>
                        </div>
                      </div>
                      <div className="session-time">
                        <CalendarDays size={15} />
                        {dateText(upcoming.time)}
                      </div>
                      <button
                        className="outline full"
                        onClick={() => go("bookings")}
                      >
                        View your session
                        <ArrowUpRight size={14} />
                      </button>
                    </>
                  );
                })()
              ) : (
                <>
                  <div className="mini-mentor">
                    <img
                      src={(mentors[0] || seedMentors[0]).image}
                      alt="Sophie Chen"
                    />
                    <div>
                      <h4>Sophie Chen</h4>
                      <p>Senior Product Designer</p>
                      <span>
                        <Star size={11} fill="currentColor" /> 4.9{" "}
                        <small> · 42 sessions</small>
                      </span>
                    </div>
                  </div>
                  <p className="widget-copy">
                    A little guidance can go a long way.
                    <br />
                    Meet someone who’s been there.
                  </p>
                  <button
                    className="outline full"
                    onClick={() => setModal({ type: "mentor", id: 1 })}
                  >
                    Meet your mentor
                    <ArrowUpRight size={14} />
                  </button>
                </>
              )}
            </section>
            <section className="project-widget">
              <span className="tag white">LEARN BY DOING</span>
              <div className="project-doodle">
                <FolderKanban size={34} />
                <span>✳</span>
              </div>
              <h3>
                Make it real.
                <br />
                Make it yours.
              </h3>
              <p>
                Turn what you’re learning into something you can show the world.
              </p>
              <button className="text-button" onClick={() => go("projects")}>
                Find your first project
                <ArrowRight size={15} />
              </button>
            </section>
          </aside>
        </div>
        <footer className="workspace-footer">
          <span>A little curiosity. A lot of possibility.</span>
          <span>
            Made for your next chapter <Heart size={11} />
          </span>
        </footer>
      </>
    );
  }
  function renderMentorCard(m: (typeof mentors)[number]) {
    return (
      <article className="mentor-card" key={m.id}>
        <div className="mentor-card-top">
          <img src={m.image} alt={m.name} />
          <span className={"tag " + (m.available ? "pistachio" : "apricot")}>
            {m.available ? "Available this week" : "Waitlist open"}
          </span>
        </div>
        <h3>{m.name}</h3>
        <p>
          {m.role} at <strong>{m.company}</strong>
        </p>
        <div className="skill-tags">
          {m.skills.slice(0, 3).map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <p className="mentor-bio">{m.bio}</p>
        <div className="mentor-bottom">
          <span>
            <Star size={13} fill="currentColor" /> {m.rating}{" "}
            <small>({m.reviews} reviews)</small>
          </span>
          <strong>
            €{m.price}
            <small> / session</small>
          </strong>
        </div>
        <button
          className="outline full"
          onClick={() => setModal({ type: "mentor", id: m.id })}
        >
          Meet {m.name.split(" ")[0]}
          <ArrowUpRight size={15} />
        </button>
      </article>
    );
  }
  function renderProjects() {
    return (
      <>
        {pageHeader(
          "LEARN BY DOING",
          "Good ideas deserve to become real.",
          "Build your confidence and your portfolio with meaningful, hands-on projects.",
        )}
        {filterBar("projects")}
        <div className="project-grid">
          {filteredProjects.map((p) => (
            <article className="project-card" key={p.id}>
              <div className={"project-illustration " + p.color}>
                {p.art === "wellness" ? (
                  <>
                    <div className="phone-mock">
                      <Leaf size={26} />
                      <span>Room to breathe.</span>
                      <i />
                      <i />
                      <div className="phone-play">
                        <Play size={13} />
                      </div>
                    </div>
                    <span className="project-flower">✳</span>
                  </>
                ) : p.art === "portfolio" ? (
                  <div className="portfolio-mock">
                    <div>hello, world ↗</div>
                    <b>
                      A little curious.
                      <br />
                      Always creating.
                    </b>
                    <span>
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                ) : (
                  <div className="data-mock">
                    <div>Things are looking up. ↗</div>
                    {[30, 45, 38, 65, 80, 94].map((h, i) => (
                      <i key={i} style={{ height: h }} />
                    ))}
                  </div>
                )}
              </div>
              <div className="project-body">
                <div className="card-meta">
                  <span className={"tag " + p.color}>{p.category}</span>
                  {state.portfolio.some((x) => x.id === p.id) ? (
                    <span className="status-label">
                      <CheckCircle2 size={13} />
                      Completed
                    </span>
                  ) : state.started.includes(p.id) ? (
                    <span className="status-label">In progress</span>
                  ) : (
                    <span className="micro-label">{p.level}</span>
                  )}
                </div>
                <h3>{p.title}</h3>
                <p>{p.subtitle}</p>
                <div className="skill-tags">
                  {p.skills.map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
                <div className="project-bottom">
                  <span>
                    <Clock size={14} /> {p.hours} hours
                  </span>
                  <button
                    className="text-button"
                    onClick={() => setModal({ type: "project", id: p.id })}
                  >
                    {state.started.includes(p.id)
                      ? "Continue project"
                      : "Explore project"}
                    <ArrowUpRight size={15} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {!filteredProjects.length &&
          empty("No projects found", "Try another skill or a different topic.")}
      </>
    );
  }
  function renderPath() {
    return (
      <>
        {pageHeader(
          "YOUR PERSONAL ROADMAP",
          "A path to your kind of future.",
          state.goal + ". One meaningful step at a time.",
        )}
        <div className="path-summary">
          <span className="stat-icon rose">
            <Route size={24} />
          </span>
          <div>
            <h3>{state.goal}</h3>
            <p>
              Built around {state.skills.join(", ")} · {state.level}
            </p>
          </div>
          <button className="outline" onClick={() => go("settings")}>
            Update my goals
            <Settings size={15} />
          </button>
        </div>
        <div className="recommend-label path-label">
          <Sparkles size={14} /> {recommendMode.toUpperCase()}
          <span>Updated when your skills and progress change</span>
        </div>
        <div className="path-timeline">
          {recommended.slice(0, 4).map((c, i) => {
            const completed =
              (state.completed[c.id]?.length || 0) >= c.lessons.length;
            return (
              <article className="path-step" key={c.id}>
                <div className={"step-number " + (completed ? "complete" : "")}>
                  {completed ? (
                    <Check size={20} />
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </div>
                <div className="path-step-body">
                  <div className="card-meta">
                    <span className={"tag " + c.color}>
                      {i === 0
                        ? "FOUNDATION"
                        : i === 1
                          ? "BUILD YOUR SKILLS"
                          : i === 2
                            ? "GO DEEPER"
                            : "MAKE IT A HABIT"}
                    </span>
                    <span className="micro-label">
                      {c.hours} hours · {c.level}
                    </span>
                  </div>
                  <h2>{c.title}</h2>
                  <p>{reason(c)}</p>
                  <div className="path-bottom">
                    <span>
                      {i === 0
                        ? "Prerequisites: curiosity and a little time"
                        : `Suggested prerequisite: ${recommended[i - 1].title}`}
                    </span>
                    <button
                      className={i === 0 ? "primary" : "outline"}
                      onClick={() => setModal({ type: "course", id: c.id })}
                    >
                      {completed
                        ? "Revisit course"
                        : state.enrolled.includes(c.id)
                          ? "Continue learning"
                          : "Explore this step"}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          <article className="path-step">
            <div className="step-number milestone">
              <GraduationCap size={22} />
            </div>
            <div className="path-step-body milestone-card">
              <h2>Put your skills into the world.</h2>
              <p>
                Your milestone: complete a real project and add it to your
                portfolio.
              </p>
              <button className="secondary" onClick={() => go("projects")}>
                Find a meaningful project
                <ArrowRight size={15} />
              </button>
            </div>
          </article>
        </div>
      </>
    );
  }
  function renderMessages() {
    const m = mentors.find((m) => m.id === selectedMentor) || mentors[0];
    if (!m)
      return empty(
        "Connections are on their way.",
        "Approved mentors will appear here.",
      );
    const allowed = state.bookings.some(
      (b) => b.mentorId === selectedMentor && b.status === "confirmed",
    );
    return (
      <>
        {pageHeader(
          "GROW THROUGH CONVERSATION",
          "A little connection goes a long way.",
          "Keep in touch with your mentors and make the most of every session.",
        )}
        <div className="messaging">
          <aside>
            {role === "MENTOR" &&
              state.bookings
                .filter((b) => b.status === "confirmed")
                .map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setSelectedMentor(b.mentorId);
                      setSelectedLearner(
                        (b as typeof b & { learnerId?: number }).learnerId || 0,
                      );
                    }}
                  >
                    <MessageCircle size={20} />
                    <div>
                      <strong>
                        Learner #
                        {(b as typeof b & { learnerId?: number }).learnerId}
                      </strong>
                      <span>{dateText(b.time)}</span>
                    </div>
                  </button>
                ))}
            {mentors
              .filter((m) => state.bookings.some((b) => b.mentorId === m.id))
              .map((m) => (
                <button
                  className={selectedMentor === m.id ? "selected" : ""}
                  key={m.id}
                  onClick={() => setSelectedMentor(m.id)}
                >
                  <img src={m.image} alt="" />
                  <div>
                    <strong>{m.name}</strong>
                    <span>{m.role}</span>
                  </div>
                </button>
              ))}
            {!state.bookings.length && (
              <div className="conversation-empty">
                <MessageCircle size={28} />
                <p>
                  Your conversations will start here after your first booking.
                </p>
                <button className="text-button" onClick={() => go("mentors")}>
                  Find a mentor
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
          </aside>
          <div className="message-main">
            <div className="message-person">
              <img src={m.image} alt="" />
              <div>
                <h3>{m.name}</h3>
                <p>{m.role}</p>
              </div>
            </div>
            <div className="message-history">
              {state.messages
                .filter((x) => x.mentorId === selectedMentor && (role!=="MENTOR" || !selectedLearner || (x as typeof x&{learnerId?:number}).learnerId===selectedLearner))
                .map((msg, i) => (
                  <div
                    className={
                      "message " +
                      (msg.from === "learner" ? "outgoing" : "incoming")
                    }
                    key={i}
                  >
                    <p>{msg.text}</p>
                    <small>{dateText(msg.time)}</small>
                  </div>
                ))}
              {!state.messages.some((x) => x.mentorId === selectedMentor) &&
                empty(
                  allowed
                    ? "Start with a hello."
                    : "Your next conversation is waiting.",
                  allowed
                    ? "Share what you’d like to work on before your session."
                    : "Book a mentor session to start a private conversation.",
                )}
            </div>
            <form
              className="message-compose"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const text = String(new FormData(form).get("message")).trim();
                if (!text) return;
                action(
                  "/messages",
                  {
                    mentorId: selectedMentor,
                    ...(role === "MENTOR"
                      ? { learnerId: selectedLearner }
                      : {}),
                    text,
                  },
                  (s) => ({
                    ...s,
                    messages: [
                      ...s.messages,
                      {
                        mentorId: selectedMentor,
                        text,
                        from: role === "MENTOR" ? "mentor" : "learner",
                        time: new Date().toISOString(),
                      },
                    ],
                  }),
                  "Message sent",
                );
                form.reset();
              }}
            >
              <input
                name="message"
                placeholder={
                  allowed
                    ? "Write a thoughtful hello…"
                    : "Book a session to send a message"
                }
                required
                disabled={!allowed}
                maxLength={2000}
                aria-label="Message"
              />
              <button
                className="primary"
                disabled={!allowed || loading}
                aria-label="Send message"
              >
                <Send size={17} />
              </button>
            </form>
          </div>
        </div>
      </>
    );
  }
  function renderBookings() {
    return (
      <>
        {pageHeader(
          "MAKE TIME FOR GROWTH",
          "Your mentor sessions.",
          "A little preparation makes every conversation count.",
        )}
        <div className="booking-list">
          {state.bookings.map((b) => {
            const m = mentors.find((m) => m.id === b.mentorId) || {
              ...seedMentors[0],
              name: "Your mentor",
            };
            return (
              <article className="booking-card" key={b.id}>
                <img src={m.image} alt={m.name} />
                <div>
                  <span
                    className={
                      "tag " + (b.status === "confirmed" ? "pistachio" : "rose")
                    }
                  >
                    {b.status} · test payment
                  </span>
                  <h3>{m.name}</h3>
                  <p>
                    {dateText(b.time)} · 45 minutes · €{b.price}
                  </p>
                </div>
                {b.status === "confirmed" && (
                  <>
                    <button
                      className="outline"
                      onClick={() => {
                        setSelectedMentor(m.id);
                        go("messages");
                      }}
                    >
                      Send a message
                      <MessageCircle size={15} />
                    </button>
                    <button
                      className="text-button"
                      onClick={() =>
                        setModal({
                          type: "cancel",
                          id: state.bookings.indexOf(b),
                        })
                      }
                    >
                      Cancel session
                    </button>
                  </>
                )}
              </article>
            );
          })}
        </div>
        {!state.bookings.length && (
          <>
            {empty(
              "Make room for a new perspective.",
              "Book your first session with someone who can help you move forward.",
            )}
            <button className="primary centered" onClick={() => go("mentors")}>
              Find your mentor
              <ArrowRight size={16} />
            </button>
          </>
        )}
      </>
    );
  }
  function renderProgress() {
    return (
      <>
        {pageHeader(
          "LOOK HOW FAR YOU’VE COME",
          "Small steps add up.",
          "Every lesson, every question, every project is a little investment in you.",
        )}
        <div className="big-stats">
          {[
            ["Lessons completed", done, BookOpen],
            [
              "Courses completed",
              visibleEnrollments.filter(
                (id) =>
                  (state.completed[id]?.length || 0) >=
                  courses.find((c) => c.id === id)!.lessons.length,
              ).length,
              GraduationCap,
            ],
            ["Portfolio projects", state.portfolio.length, BriefcaseBusiness],
            ["Mentor sessions", activeBookings.length, Users],
          ].map(([label, value, Icon]) => {
            const I = Icon as LucideIcon;
            return (
              <div className="panel big-stat" key={String(label)}>
                <I size={24} />
                <strong>{String(value)}</strong>
                <span>{String(label)}</span>
              </div>
            );
          })}
        </div>
        <div className="two-columns">
          <section className="panel">
            <h2>Your learning momentum</h2>
            <p>Completed lessons across your enrolled courses</p>
            <div className="progress-chart">
              {visibleEnrollments.map((id) => {
                const c = courses.find((c) => c.id === id)!;
                return (
                  <div key={id}>
                    <span>{c.title}</span>
                    <div className="progress-track">
                      <i
                        style={{
                          width:
                            ((state.completed[id]?.length || 0) /
                              c.lessons.length) *
                              100 +
                            "%",
                        }}
                      />
                    </div>
                    <strong>
                      {state.completed[id]?.length || 0}/{c.lessons.length}
                    </strong>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="panel">
            <h2>Skills you’re growing</h2>
            <p>Your learning is becoming part of who you are.</p>
            <div className="large-tags">
              {state.skills.map((s) => (
                <span key={s}>
                  <Leaf size={14} />
                  {s}
                </span>
              ))}
            </div>
            <button className="text-button" onClick={() => go("settings")}>
              Update your skills
              <ArrowRight size={15} />
            </button>
          </section>
        </div>
        <section className="panel achievements">
          <h2>Little milestones. Real pride.</h2>
          <div>
            {[
              [done >= 1, "First step", "Complete your first lesson", BookOpen],
              [
                done >= 5,
                "Finding your rhythm",
                "Complete five lessons",
                Flame,
              ],
              [
                state.portfolio.length > 0,
                "Made it real",
                "Publish your first project",
                FolderKanban,
              ],
              [
                activeBookings.length > 0,
                "Better together",
                "Book your first mentor",
                Users,
              ],
            ].map(([earned, title, desc, Icon]) => {
              const I = Icon as LucideIcon;
              return (
                <article
                  className={earned ? "earned" : "locked"}
                  key={String(title)}
                >
                  <span>
                    <I size={26} />
                  </span>
                  <h3>{String(title)}</h3>
                  <p>{String(desc)}</p>
                  <small>{earned ? "ACHIEVED" : "STILL GROWING"}</small>
                </article>
              );
            })}
          </div>
        </section>
      </>
    );
  }
  function renderSettings() {
    return (
      <>
        {pageHeader(
          "YOUR STORY, STILL UNFOLDING",
          "Make yourself at home.",
          "Help us understand where you are and where you’d like to go.",
        )}
        <form className="profile-form panel" onSubmit={saveProfile}>
          <div className="profile-photo">
            <div className="avatar large">
              {state.avatar ? (
                <img src={state.avatar} alt="Your profile" />
              ) : (
                state.name
                  .split(" ")
                  .map((x) => x[0])
                  .slice(0, 2)
                  .join("")
              )}
            </div>
            <div>
              <h3>A face to your name</h3>
              <label className="outline upload-label">
                <Upload size={15} />
                Upload a photo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 500000)
                        return notify(
                          "Please choose an image smaller than 500 KB.",
                        );
                      const reader = new FileReader();
                      reader.onload = () =>
                        update({ avatar: String(reader.result) });
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
              <small>JPG, PNG or WebP · up to 500 KB</small>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Full name
              <input
                name="name"
                defaultValue={state.name}
                required
                maxLength={80}
              />
            </label>
            <label>
              Email address
              <input value={state.email} readOnly />
              <small>Contact an administrator to change your email.</small>
            </label>
          </div>
          <label>
            A little about you
            <textarea
              name="bio"
              defaultValue={state.bio}
              rows={3}
              maxLength={1000}
            />
          </label>
          <div className="form-grid">
            <label>
              Your next career goal
              <input
                name="goal"
                defaultValue={state.goal}
                required
                maxLength={200}
              />
            </label>
            <label>
              Your experience
              <select name="level" defaultValue={state.level}>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </label>
          </div>
          <label>
            Interests <small>(separate with commas)</small>
            <input
              name="interests"
              defaultValue={state.interests.join(", ")}
              maxLength={200}
            />
          </label>
          <fieldset>
            <legend>Skills you bring with you</legend>
            <div className="skill-choices">
              {skillOptions.map((skill) => (
                <button
                  type="button"
                  className={state.skills.includes(skill) ? "selected" : ""}
                  key={skill}
                  onClick={() =>
                    update({
                      skills: state.skills.includes(skill)
                        ? state.skills.filter((s) => s !== skill)
                        : [...state.skills, skill],
                    })
                  }
                >
                  {state.skills.includes(skill) ? (
                    <Check size={13} />
                  ) : (
                    <Plus size={13} />
                  )}{" "}
                  {skill}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="form-footer">
            <span>
              <Sparkles size={15} />
              Your recommendations grow with you.
            </span>
            <button className="primary" disabled={loading}>
              Save my profile
              <Check size={16} />
            </button>
          </div>
        </form>
        <section className="panel account-panel">
          <h3>Your workspace</h3>
          <p>
            {apiBase
              ? "Connected to the SkillBridge API."
              : "Demo mode — changes are saved in this browser. No real payments are collected."}
          </p>
          <button
            className="outline"
            onClick={() => {
              const a = document.createElement("a");
              a.href = URL.createObjectURL(
                new Blob([JSON.stringify(state, null, 2)], {
                  type: "application/json",
                }),
              );
              a.download = "skillbridge-workspace.json";
              a.click();
              URL.revokeObjectURL(a.href);
              notify("Your workspace has been exported.");
            }}
          >
            <Download size={15} />
            Export my data
          </button>
        </section>
      </>
    );
  }
  function renderPortfolio() {
    return (
      <>
        {pageHeader(
          "PROOF OF WHAT’S POSSIBLE",
          "Your work. Your story.",
          "A growing collection of the things you’ve learned to make.",
        )}
        <div className="section-heading">
          <p>
            {state.portfolio.length} project
            {state.portfolio.length !== 1 ? "s" : ""} in your portfolio
          </p>
          <button className="primary" onClick={() => go("projects")}>
            <Plus size={16} />
            Add a project
          </button>
        </div>
        {!state.portfolio.length ? (
          empty(
            "Your best work is still ahead.",
            "Complete a project, tell its story, and give your new skills a place to shine.",
          )
        ) : (
          <div className="project-grid">
            {state.portfolio.map((p) => (
              <article className="panel portfolio-item" key={p.id}>
                {p.screenshot ? (
                  <img
                    className="portfolio-screenshot"
                    src={p.screenshot}
                    alt={p.title}
                  />
                ) : (
                  <div className="portfolio-cover">
                    <BriefcaseBusiness size={40} />
                  </div>
                )}
                <span className="tag pistachio">COMPLETED PROJECT</span>
                <h2>{p.title}</h2>
                <p>{p.description}</p>
                <div className="skill-tags">
                  {p.skills.map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
                <div className="portfolio-links">
                  {p.repository && (
                    <a href={p.repository} target="_blank" rel="noreferrer">
                      Repository
                      <ExternalLink size={13} />
                    </a>
                  )}
                  {p.demo && (
                    <a href={p.demo} target="_blank" rel="noreferrer">
                      Live demo
                      <ExternalLink size={13} />
                    </a>
                  )}
                  <button
                    className="text-button"
                    onClick={() => setModal({ type: "submit", id: p.id })}
                  >
                    Edit project
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </>
    );
  }
  function renderMentorDashboard() {
    return (
      <>
        {pageHeader(
          "A LITTLE GUIDANCE. A LASTING IMPACT.",
          "Share what you know.",
          "Help the next generation find their own way forward.",
        )}
        <div className="mentor-dashboard-status panel">
          <ShieldCheck size={28} />
          <div>
            <h3>
              {state.application?.status === "Approved"
                ? "Your mentor profile is approved"
                : state.application
                  ? `Application ${state.application.status.toLowerCase()}`
                  : "Your experience could be someone’s turning point."}
            </h3>
            <p>
              {state.application?.decision ||
                "Tell us about your expertise and how you’d like to help."}
            </p>
          </div>
          <button
            className="primary"
            onClick={() => setModal({ type: "apply" })}
          >
            {state.application ? "View application" : "Apply to mentor"}
            <ArrowRight size={15} />
          </button>
        </div>
        <div className="two-columns">
          <form
            className="panel stack-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const slots = String(f.get("slots"))
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              if (
                slots.some(
                  (s) =>
                    Number.isNaN(Date.parse(s)) || Date.parse(s) <= Date.now(),
                )
              )
                return notify(
                  "Add future dates in ISO format, separated by commas.",
                );
              action(
                "/mentor/availability",
                { slots, price: Number(f.get("price")) },
                (s) => ({
                  ...s,
                  availability: slots,
                  mentorPrice: Number(f.get("price")),
                }),
                "Availability saved.",
              );
            }}
          >
            <h2>Make time for connection.</h2>
            <label>
              Session price (€)
              <input
                name="price"
                type="number"
                min={0}
                max={1000}
                defaultValue={state.mentorPrice}
                required
              />
            </label>
            <label>
              Availability (UTC)
              <textarea
                name="slots"
                rows={4}
                defaultValue={state.availability.join(", ")}
                placeholder="2026-11-02T14:00:00Z, 2026-11-03T10:00:00Z"
              />
              <small>
                Add future ISO timestamps separated by commas. Displayed to
                learners in their local time.
              </small>
            </label>
            <button className="secondary" disabled={loading}>
              Publish availability
              <Check size={15} />
            </button>
          </form>
          <section className="panel">
            <h2>Your impact so far</h2>
            <p>Sessions, feedback, and sandbox earnings</p>
            <div className="mentor-metrics">
              <div>
                <strong>{activeBookings.length}</strong>
                <span>Sessions in this demo</span>
              </div>
              <div>
                <strong>
                  €{activeBookings.reduce((n, b) => n + b.price, 0)}
                </strong>
                <span>Test transaction value</span>
              </div>
            </div>
            <p>
              Backend mode limits this view to bookings assigned to the
              signed-in mentor. Demo mode shows this browser’s sample bookings.
            </p>
            <button className="outline" onClick={() => go("bookings")}>
              Manage sessions
              <ArrowRight size={15} />
            </button>
          </section>
        </div>
        <section className="panel">
          <h2>Project review</h2>
          {apiBase &&
            mentorLearners.map((learner) => (
              <div key={learner.id}>
                <h3>{learner.name}</h3>
                {learner.portfolio.map((p) => (
                  <div className="review-row" key={p.id}>
                    <span>{p.title}</span>
                    <button
                      className="outline"
                      onClick={() =>
                        setModal({
                          type: "feedback",
                          id: p.id,
                          learnerId: learner.id,
                        } as Modal)
                      }
                    >
                      Give feedback
                      <MessageCircle size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          <p>
            Review completed learner projects and offer constructive feedback.
          </p>
          {!state.portfolio.length
            ? empty(
                "No submissions to review yet.",
                "Completed projects will appear here in the local demo.",
              )
            : state.portfolio.map((p) => (
                <div className="review-row" key={p.id}>
                  <h3>{p.title}</h3>
                  <button
                    className="outline"
                    onClick={() => setModal({ type: "feedback", id: p.id })}
                  >
                    Give feedback
                    <MessageCircle size={15} />
                  </button>
                </div>
              ))}
        </section>
      </>
    );
  }
  function renderAdmin() {
    if (role !== "ADMIN")
      return (
        <>
          {pageHeader(
            "ADMINISTRATOR ACCESS",
            "This space needs a different key.",
            "Sign in with an administrator account to manage the platform.",
          )}
          <button
            className="primary"
            onClick={() => {
              setAuthMode("login");
              setModal({ type: "auth" });
            }}
          >
            Sign in
            <ArrowRight size={15} />
          </button>
          {!apiBase && (
            <button
              className="outline demo-admin"
              onClick={() => {
                setRole("ADMIN");
                sessionStorage.setItem("sb-role", "ADMIN");
                notify("Administrator demo opened — local sample data only.");
              }}
            >
              Open administrator demo
            </button>
          )}
        </>
      );
    return (
      <>
        {pageHeader(
          "PLATFORM WORKSPACE",
          "A place for every kind of potential.",
          "Keep SkillBridge welcoming, useful, and growing.",
        )}
        <div className="admin-toolbar">
          <div className="admin-tabs">
            {[
              "Overview",
              "Users",
              "Applications",
              "Content",
              "Bookings",
              "Reports",
            ].map((t) => (
              <button
                className={adminTab === t ? "active" : ""}
                onClick={() => setAdminTab(t)}
                key={t}
              >
                {t}
                {t === "Applications" &&
                  state.application?.status === "Pending" && <span>1</span>}
              </button>
            ))}
          </div>
          <select
            aria-label="Report date range"
            value={adminRange}
            onChange={(e) => setAdminRange(e.target.value)}
          >
            <option>Last 30 days</option>
            <option>Last 7 days</option>
            <option>Today</option>
          </select>
        </div>
        {adminTab === "Overview" ? (
          <>
            <div className="big-stats">
              {[
                [
                  "Learners",
                  adminOverview?.learners ??
                    adminUsers.filter((u) => u.role === "LEARNER").length,
                ],
                ["Approved mentors", adminOverview?.mentors ?? mentors.length],
                [
                  "Pending applications",
                  adminOverview?.pendingApplications ??
                    (state.application?.status === "Pending" ? 1 : 0),
                ],
                [
                  "Test revenue",
                  "€" +
                    (adminOverview?.testRevenue ??
                      activeBookings
                        .filter(
                          (b) =>
                            new Date(b.time) >
                            new Date(
                              Date.now() -
                                (adminRange === "Today"
                                  ? 1
                                  : adminRange === "Last 7 days"
                                    ? 7
                                    : 30) *
                                  86400000,
                            ),
                        )
                        .reduce((n, b) => n + b.price, 0)),
                ],
              ].map(([label, value]) => (
                <div className="panel big-stat" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <small>Development sample data</small>
                </div>
              ))}
            </div>
            <div className="two-columns">
              <section className="panel">
                <h2>Learning activity</h2>
                <p>{adminRange} · recorded activity in this workspace</p>
                <div className="admin-chart">
                  {[
                    state.enrolled.length,
                    done,
                    state.started.length,
                    state.portfolio.length,
                    activeBookings.length,
                  ].map((n, i) => (
                    <div key={i}>
                      <i style={{ height: Math.max(4, n * 22) }} />
                      <span>
                        {
                          [
                            "Courses",
                            "Lessons",
                            "Projects",
                            "Portfolio",
                            "Sessions",
                          ][i]
                        }
                      </span>
                      <strong>{n}</strong>
                    </div>
                  ))}
                </div>
              </section>
              <section className="panel">
                <h2>Recent platform activity</h2>
                {state.notifications.slice(0, 5).map((n, i) => (
                  <div className="activity-row" key={i}>
                    <span className="activity-dot" />
                    <p>{n.text}</p>
                  </div>
                ))}
              </section>
            </div>
          </>
        ) : adminTab === "Users" ? (
          <section className="panel">
            <div className="field-search">
              <Search size={17} />
              <input
                placeholder="Search users…"
                aria-label="Search users"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Manage</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers
                    .filter((u) =>
                      (u.name + u.email)
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    )
                    .slice(0, 10)
                    .map((u) => (
                      <tr key={u.id}>
                        <td>
                          <strong>{u.name}</strong>
                          <small>{u.email}</small>
                        </td>
                        <td>
                          <select
                            aria-label={"Role for " + u.name}
                            value={u.role}
                            onChange={async (e) => {
                              const next = e.target.value;
                              try {
                                if (apiBase && token())
                                  await request(
                                    "/admin/users/" + u.id,
                                    { role: next },
                                    "PATCH",
                                  );
                                setAdminUsers((users) =>
                                  users.map((x) =>
                                    x.id === u.id ? { ...x, role: next } : x,
                                  ),
                                );
                                notify("Role updated.");
                              } catch (e) {
                                notify((e as Error).message);
                              }
                            }}
                          >
                            <option>LEARNER</option>
                            <option>MENTOR</option>
                            <option>ADMIN</option>
                          </select>
                        </td>
                        <td>
                          <span
                            className={
                              "tag " + (u.enabled ? "pistachio" : "rose")
                            }
                          >
                            {u.enabled ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td>
                          <button
                            className="text-button"
                            onClick={async () => {
                              try {
                                if (apiBase && token())
                                  await request(
                                    "/admin/users/" + u.id,
                                    { enabled: !u.enabled },
                                    "PATCH",
                                  );
                                setAdminUsers((users) =>
                                  users.map((x) =>
                                    x.id === u.id
                                      ? { ...x, enabled: !x.enabled }
                                      : x,
                                  ),
                                );
                                notify(
                                  u.enabled
                                    ? "Account suspended"
                                    : "Account reactivated",
                                );
                              } catch (e) {
                                notify((e as Error).message);
                              }
                            }}
                          >
                            {u.enabled ? "Suspend" : "Reactivate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <button
                className="outline"
                disabled={userPage === 0}
                onClick={() => setUserPage((p) => p - 1)}
              >
                <ArrowLeft size={13} />
                Previous
              </button>
              <small>Page {userPage + 1}</small>
              <button
                className="outline"
                disabled={adminUsers.length < 10}
                onClick={() => setUserPage((p) => p + 1)}
              >
                Next
                <ArrowRight size={13} />
              </button>
            </div>
          </section>
        ) : adminTab === "Applications" ? (
          <section className="panel">
            {state.application ? (
              <>
                <span className="tag apricot">{state.application.status}</span>
                <h2>{state.application.name}</h2>
                <p>{state.application.expertise}</p>
                <p>{state.application.experience}</p>
                <p>
                  Supporting document:{" "}
                  {state.application.documents || "Not provided"}
                </p>
                <div className="application-actions">
                  {["Approved", "Rejected", "More information requested"].map(
                    (status) => (
                      <button
                        className={
                          status === "Approved" ? "secondary" : "outline"
                        }
                        key={status}
                        onClick={() =>
                          setModal({
                            type: "decision",
                            id: [
                              "Approved",
                              "Rejected",
                              "More information requested",
                            ].indexOf(status),
                          })
                        }
                      >
                        {status === "Approved"
                          ? "Approve"
                          : status === "Rejected"
                            ? "Reject"
                            : "Request information"}
                      </button>
                    ),
                  )}
                </div>
              </>
            ) : (
              empty(
                "A little quiet here.",
                "New mentor applications will appear here for review.",
              )
            )}
          </section>
        ) : adminTab === "Content" ? (
          <section className="panel">
            <div className="section-heading">
              <h2>Learning content</h2>
              <button
                className="primary"
                onClick={() => setModal({ type: "content" })}
              >
                <Plus size={15} />
                Create content
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.id}>
                      <td>{c.title}</td>
                      <td>{c.category}</td>
                      <td>
                        <span className="tag pistachio">
                          {contentStatus[c.id] || "Published"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="text-button"
                          onClick={() => {
                            setContentStatus((s) => ({
                              ...s,
                              [c.id]:
                                s[c.id] === "Archived"
                                  ? "Published"
                                  : "Archived",
                            }));
                            notify("Demo content status updated.");
                          }}
                        >
                          {contentStatus[c.id] === "Archived"
                            ? "Publish"
                            : "Archive"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {apiBase && (
              <div className="content-drafts">
                <h3>All content records</h3>
                {adminContent.map((c) => (
                  <div className="review-row" key={c.id}>
                    <div>
                      <span className="tag apricot">
                        {c.kind} · {c.status}
                      </span>
                      <h3>{c.title}</h3>
                    </div>
                    <button
                      className="text-button"
                      onClick={() =>
                        setModal({ type: "editContent", id: c.id })
                      }
                    >
                      Edit record
                      <ArrowUpRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : adminTab === "Bookings" ? (
          renderBookings()
        ) : (
          <section className="panel">
            <h2>Reports & moderation</h2>
            {reports.map((r) => (
              <div className="review-row" key={r.id}>
                <div>
                  <span className="tag apricot">{r.status}</span>
                  <h3>{r.text}</h3>
                </div>
                <button
                  className="outline"
                  disabled={r.status === "Resolved"}
                  onClick={() => {
                    if (apiBase)
                      request(
                        "/admin/reports/" + r.id,
                        {
                          decision:
                            "Reviewed by platform administrator. Attribution issue resolved.",
                        },
                        "PATCH",
                      )
                        .then(() => {
                          setReports((rs) =>
                            rs.map((x) =>
                              x.id === r.id ? { ...x, status: "Resolved" } : x,
                            ),
                          );
                          notify("Report resolved and decision audited.");
                        })
                        .catch((e) => notify(e.message));
                    else {
                      setReports((rs) =>
                        rs.map((x) =>
                          x.id === r.id ? { ...x, status: "Resolved" } : x,
                        ),
                      );
                      notify("Report resolved for this demo session.");
                    }
                  }}
                >
                  {r.status === "Resolved" ? (
                    <Check size={15} />
                  ) : (
                    "Resolve report"
                  )}
                </button>
              </div>
            ))}
          </section>
        )}
      </>
    );
  }
  function renderHome() {
    return (
      <>
        <div className="public-nav">
          <span className="tag pistachio">
            A LITTLE CURIOUS? YOU BELONG HERE.
          </span>
          <button
            className="outline"
            onClick={() => {
              setAuthMode("login");
              setModal({ type: "auth" });
            }}
          >
            Sign in
            <ArrowRight size={15} />
          </button>
        </div>
        <section className="public-hero">
          <div>
            <div className="eyebrow">
              LEARNING, WITH A LITTLE MORE DIRECTION.
            </div>
            <h1>
              Your next chapter
              <br />
              starts with <em>you.</em>
            </h1>
            <p>
              Find your path, learn from people who’ve been there, and turn your
              potential into something real.
            </p>
            <button
              className="primary"
              onClick={() => {
                setAuthMode("register");
                setModal({ type: "auth" });
              }}
            >
              Find my way forward
              <ArrowRight size={17} />
            </button>
            <div className="social-proof">
              <div>
                {mentors.slice(0, 3).map((m) => (
                  <img src={m.image} alt="" key={m.id} />
                ))}
              </div>
              <span>
                Good people. Real skills.
                <br />
                <strong>A whole world of possibility.</strong>
              </span>
            </div>
          </div>
          <HeroArt />
        </section>
        <div className="how-it-works">
          {[
            [
              Target,
              "Start with your story",
              "Tell us what you know, what you love, and where you want to go.",
            ],
            [
              Route,
              "Find your own path",
              "Get a practical learning roadmap that grows alongside you.",
            ],
            [
              Users,
              "Grow, together",
              "Connect with mentors and build real projects you’re proud of.",
            ],
          ].map(([Icon, title, desc]) => {
            const I = Icon as LucideIcon;
            return (
              <div key={String(title)}>
                <I size={24} />
                <h3>{String(title)}</h3>
                <p>{String(desc)}</p>
              </div>
            );
          })}
        </div>
        {sectionTitle(
          "A little inspiration to get you started",
          "Build something new. Starting with yourself.",
          "Explore courses",
          () => go("courses"),
        )}
        <div className="course-grid">{courses.slice(0, 3).map(courseCard)}</div>
        {sectionTitle(
          "Meet the people in your corner",
          "Thoughtful guidance from people who care.",
          "Find your mentor",
          () => go("mentors"),
        )}
        <div className="mentor-grid">
          {mentors.slice(0, 3).map(renderMentorCard)}
        </div>
      </>
    );
  }
  function renderPage() {
    switch (page) {
      case "home":
        return renderHome();
      case "courses":
      case "learning":
        return (
          <>
            {pageHeader(
              page === "learning"
                ? "YOUR GROWING LIBRARY"
                : "FOLLOW YOUR CURIOSITY",
              page === "learning"
                ? "A little wiser, every time."
                : "Something new starts here.",
              page === "learning"
                ? "The courses you’ve made time for. Ready whenever you are."
                : "Thoughtful courses for the skills you need and the future you want.",
            )}
            {filterBar("courses")}
            <div className="section-heading">
              <p>
                {filteredCourses.length} course
                {filteredCourses.length !== 1 ? "s" : ""} to explore
              </p>
              <button
                className="text-button"
                onClick={() => setModal({ type: "saved" })}
              >
                <Bookmark size={15} />
                Saved ({state.saved.length})
              </button>
            </div>
            <div className="course-grid">{filteredCourses.map(courseCard)}</div>
            {!filteredCourses.length &&
              empty(
                "Room for a new beginning.",
                "Try a different search, or explore the course catalog.",
              )}
          </>
        );
      case "mentors":
        return (
          <>
            {pageHeader(
              "GOOD PEOPLE. GREAT POSSIBILITIES.",
              "Find someone in your corner.",
              "A thoughtful conversation can change the way you see your next step.",
            )}
            <div className="directory-actions">
              <button className="text-button" onClick={() => go("bookings")}>
                My bookings
                <CalendarDays size={15} />
              </button>
              <button className="text-button" onClick={() => go("mentor")}>
                Become a mentor
                <ArrowUpRight size={15} />
              </button>
            </div>
            {filterBar("mentors")}
            <div className="mentor-grid">
              {filteredMentors.map(renderMentorCard)}
            </div>
            {!filteredMentors.length &&
              empty(
                "Your person is out there.",
                "Try widening your search or changing a filter.",
              )}
          </>
        );
      case "projects":
        return renderProjects();
      case "path":
        return renderPath();
      case "messages":
        return renderMessages();
      case "progress":
        return renderProgress();
      case "settings":
        return renderSettings();
      case "portfolio":
        return renderPortfolio();
      case "bookings":
        return renderBookings();
      case "mentor":
        return renderMentorDashboard();
      case "admin":
        return renderAdmin();
      default:
        return renderDashboard();
    }
  }
  const modalCourse = modal?.id
      ? courses.find((c) => c.id === modal.id)
      : undefined,
    modalMentor = modal?.id
      ? mentors.find((m) => m.id === modal.id)
      : undefined,
    modalProject = modal?.id
      ? projects.find((p) => p.id === modal.id)
      : undefined;
  return (
    <div
      className={
        "app " + (page === "admin" && role === "ADMIN" ? "admin-app" : "")
      }
    >
      <button
        className="mobile-menu icon-button"
        aria-label="Open navigation"
        onClick={() => setMobile(!mobile)}
      >
        <Menu size={22} />
      </button>
      {mobile && (
        <div className="sidebar-backdrop" onClick={() => setMobile(false)} />
      )}
      <aside className={"sidebar " + (mobile ? "mobile-open" : "")}>
        <a
          className="brand"
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            go("dashboard");
          }}
        >
          <span className="brand-icon">
            <Bridge />
          </span>
          <span>
            skillbridge<span className="brand-period">.</span>
          </span>
        </a>
        <button
          className="workspace-picker"
          onClick={() => setRoleMenu(!roleMenu)}
        >
          <span className="workspace-avatar">
            <GraduationCap size={17} />
          </span>
          <span>
            {role === "ADMIN"
              ? "Admin workspace"
              : role === "MENTOR"
                ? "Mentor workspace"
                : "My learning space"}
            <small>
              {apiBase ? "Connected workspace" : "Personal workspace"}
            </small>
          </span>
          <ChevronDown size={14} />
        </button>
        {roleMenu && (
          <div className="role-menu">
            {!apiBase &&
              ["LEARNER", "MENTOR", "ADMIN"].map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRole(r);
                    sessionStorage.setItem("sb-role", r);
                    setRoleMenu(false);
                    go(
                      r === "ADMIN"
                        ? "admin"
                        : r === "MENTOR"
                          ? "mentor"
                          : "dashboard",
                    );
                  }}
                >
                  {r.charAt(0) + r.slice(1).toLowerCase()} demo
                  <ArrowUpRight size={13} />
                </button>
              ))}
            <button
              onClick={() => {
                setRoleMenu(false);
                setAuthMode("login");
                setModal({ type: "auth" });
              }}
            >
              Sign in / register
              <ArrowRight size={13} />
            </button>
            <button
              onClick={() => {
                setRoleMenu(false);
                go("home");
              }}
            >
              Visit public website
              <ExternalLink size={13} />
            </button>
          </div>
        )}
        <div className="nav-label">YOUR WORKSPACE</div>
        <nav>
          {nav.map(([key, label, Icon]) => (
            <button
              key={key}
              className={page === key ? "active" : ""}
              onClick={() => go(key)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {key === "messages" &&
                state.messages.some((m) => m.from === "mentor") && (
                  <span className="nav-dot" />
                )}
              {key === "dashboard" && page === key && (
                <span className="active-dot" />
              )}
            </button>
          ))}
        </nav>
        {role === "ADMIN" && (
          <button
            className={"extra-nav " + (page === "admin" ? "active" : "")}
            onClick={() => go("admin")}
          >
            <ShieldCheck size={18} />
            Admin panel
          </button>
        )}
        {role === "MENTOR" && (
          <button className="extra-nav" onClick={() => go("mentor")}>
            <GraduationCap size={18} />
            Mentor studio
          </button>
        )}
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="sidebar-star">✳</span>
            <h4>
              A little guidance.
              <br />A whole lot of growth.
            </h4>
            <p>
              Your next breakthrough might
              <br />
              start with a conversation.
            </p>
            <button onClick={() => go("mentors")}>
              Find your mentor
              <ArrowUpRight size={14} />
            </button>
          </div>
          <button
            className={"settings-link " + (page === "settings" ? "active" : "")}
            onClick={() => go("settings")}
          >
            <Settings size={18} />
            Settings & profile
          </button>
          <button className="sidebar-user" onClick={() => go("settings")}>
            <span className="avatar">
              {state.avatar ? (
                <img src={state.avatar} alt="" />
              ) : (
                state.name
                  .split(" ")
                  .map((x) => x[0])
                  .slice(0, 2)
                  .join("")
              )}
            </span>
            <span>
              <strong>{state.name}</strong>
              <small>
                {role === "ADMIN"
                  ? "Platform administrator"
                  : role === "MENTOR"
                    ? "A little guidance, every day"
                    : "A lifelong work in progress"}
              </small>
            </span>
            <ChevronDown size={14} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <span>My workspace</span>
            <ChevronRight size={13} />
            <strong>
              {nav.find((n) => n[0] === page)?.[1] ||
                (
                  {
                    courses: "Course catalog",
                    settings: "Settings & profile",
                    bookings: "My bookings",
                    mentor: "Mentor studio",
                    admin: "Admin panel",
                    home: "Discover SkillBridge",
                  } as Record<string, string>
                )[page] ||
                "Overview"}
            </strong>
          </div>
          <div className="topbar-right">
            <form
              className="global-search"
              onSubmit={(e) => {
                e.preventDefault();
                setPage("courses");
                location.hash = "courses";
              }}
            >
              <Search size={16} />
              <input
                aria-label="Search the course catalog"
                placeholder="A little curiosity goes a long way…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd>↵</kbd>
            </form>
            <button
              className="notification-button icon-button"
              aria-label="Notifications"
              onClick={() => setModal({ type: "notifications" })}
            >
              <Bell size={18} />
              {state.notifications.some((n) => !n.read) && <i />}
            </button>
            <div className="topbar-divider" />
            <button
              className="avatar small"
              aria-label="Your profile"
              onClick={() => go("settings")}
            >
              {state.avatar ? (
                <img src={state.avatar} alt="" />
              ) : (
                state.name
                  .split(" ")
                  .map((x) => x[0])
                  .slice(0, 2)
                  .join("")
              )}
            </button>
          </div>
        </header>
        <main id="main-content">{renderPage()}</main>
        <div className="demo-indicator">
          <span />
          {apiBase ? "Backend connected" : "Development demo"}
          <span className="demo-separator">·</span>
          {apiBase
            ? "Secure API workspace"
            : "Sample data · saved on this browser"}
          <button
            onClick={() => setModal({ type: "about" })}
            aria-label="About this workspace"
          >
            ⓘ
          </button>
        </div>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {modal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div
            className={
              "modal " +
              (["course", "mentor", "project", "submit"].includes(modal.type)
                ? "wide-modal"
                : "")
            }
            role="dialog"
            aria-modal="true"
            aria-label={modal.type + " details"}
            ref={dialogRef}
            tabIndex={-1}
          >
            <button
              className="modal-close icon-button"
              aria-label="Close dialog"
              onClick={() => setModal(null)}
            >
              <X size={20} />
            </button>
            {modal.type === "course" && modalCourse && (
              <>
                <CourseArt type={modalCourse.art} />
                <div className="modal-content">
                  <span className={"tag " + modalCourse.color}>
                    {modalCourse.category} · {modalCourse.level}
                  </span>
                  <h2>{modalCourse.title}</h2>
                  <p>
                    With {modalCourse.instructor} · {modalCourse.hours} hours ·
                    ★ {modalCourse.rating}
                  </p>
                  <div className="recommend-explanation">
                    <Sparkles size={16} />
                    <span>
                      <strong>Why this could be your next step</strong>
                      {reason(modalCourse)}
                      <small>{recommendMode} using your profile</small>
                    </span>
                  </div>
                  <h3>Your course, one step at a time</h3>
                  <p className="prerequisite">
                    Prerequisites:{" "}
                    {modalCourse.level === "Beginner"
                      ? "No prior experience. Bring your curiosity."
                      : modalCourse.category === "Development"
                        ? "Basic JavaScript and HTML knowledge."
                        : "A foundation in " + modalCourse.skills[0] + "."}
                  </p>
                  <div className="lesson-list">
                    {modalCourse.lessons.map((lesson, i) => (
                      <div key={lesson}>
                        <span
                          className={
                            "lesson-num " +
                            (state.completed[modalCourse.id]?.includes(i)
                              ? "done"
                              : "")
                          }
                        >
                          {state.completed[modalCourse.id]?.includes(i) ? (
                            <Check size={15} />
                          ) : (
                            String(i + 1).padStart(2, "0")
                          )}
                        </span>
                        <div>
                          <strong>{lesson}</strong>
                          <small>
                            {Math.round(
                              (modalCourse.hours * 60) /
                                modalCourse.lessons.length,
                            )}{" "}
                            minute learning module
                          </small>
                        </div>
                        <button
                          className="text-button"
                          disabled={!state.enrolled.includes(modalCourse.id)}
                          onClick={() =>
                            setModal({
                              type: "lesson",
                              id: modalCourse.id * 100 + i,
                            })
                          }
                        >
                          {state.completed[modalCourse.id]?.includes(i)
                            ? "Review"
                            : "Open lesson"}
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {!state.enrolled.includes(modalCourse.id) ? (
                    <button
                      className="primary full"
                      disabled={loading}
                      onClick={() => enroll(modalCourse.id)}
                    >
                      Start this chapter · Enroll free
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <div className="enrolled-note">
                      <CheckCircle2 size={17} />
                      You’re enrolled. Take it one thoughtful step at a time.
                    </div>
                  )}
                </div>
              </>
            )}
            {modal.type === "lesson" &&
              (() => {
                const id = Math.floor(modal.id! / 100),
                  i = modal.id! % 100,
                  c = courses.find((c) => c.id === id)!;
                return (
                  <div className="modal-content lesson-content">
                    <button
                      className="text-button"
                      onClick={() => setModal({ type: "course", id })}
                    >
                      <ArrowLeft size={14} />
                      Back to course
                    </button>
                    <div className="eyebrow">
                      LESSON {i + 1} OF {c.lessons.length}
                    </div>
                    <h2>{c.lessons[i]}</h2>
                    <p className="lesson-intro">
                      {c.category === "Design"
                        ? "Good design starts with paying attention. Before reaching for a tool, take a moment to understand the people and the problem."
                        : c.category === "Development"
                          ? "Great software grows from small, understandable pieces. Start with a clear goal and build one working part at a time."
                          : "Start with a question that matters. Gather what you know, notice what’s missing, and let curiosity guide your next step."}
                    </p>
                    <h3>1. Notice the details</h3>
                    <p>
                      Choose a product you use every day. Write down the task it
                      helps you accomplish, who it serves, and one thing that
                      could work better.
                    </p>
                    <h3>2. Put it into practice</h3>
                    <p>
                      {c.category === "Development"
                        ? "Create a small component for the task you chose. Define its inputs, add one interaction, and test how it behaves on a small screen."
                        : c.category === "Design"
                          ? "Sketch three different ways to improve the experience. Share the simplest sketch with someone and ask them to describe what they would do first."
                          : "List three questions about your chosen subject. Identify one dataset or reliable source, and sketch a simple way to communicate a useful finding."}
                    </p>
                    <div className="lesson-exercise">
                      <Leaf size={22} />
                      <h3>A little reflection</h3>
                      <p>
                        What surprised you? What would you try differently next
                        time? Keep your notes for your portfolio project.
                      </p>
                    </div>
                    <p className="micro-label">
                      Development sample lesson · replace with your own
                      curriculum before production.
                    </p>
                    <button
                      className="primary full"
                      disabled={loading || state.completed[id]?.includes(i)}
                      onClick={() => {
                        completeLesson(id, i);
                        setModal({ type: "course", id });
                      }}
                    >
                      {state.completed[id]?.includes(i)
                        ? "Lesson completed"
                        : "Mark lesson complete"}
                      <Check size={16} />
                    </button>
                  </div>
                );
              })()}
            {modal.type === "mentor" && modalMentor && (
              <div className="modal-content mentor-detail">
                <img
                  className="mentor-large"
                  src={modalMentor.image}
                  alt={modalMentor.name}
                />
                <span className="tag pistachio">
                  APPROVED MENTOR · DEVELOPMENT PROFILE
                </span>
                <h2>{modalMentor.name}</h2>
                <p>
                  {modalMentor.role} at {modalMentor.company} · ★{" "}
                  {modalMentor.rating} ({modalMentor.reviews} reviews)
                </p>
                <p>{modalMentor.bio}</p>
                <div className="skill-tags">
                  {modalMentor.skills.map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
                <div className="recommend-explanation">
                  <Sparkles size={16} />
                  <span>
                    <strong>A connection with a little purpose</strong>
                    {explanation(modalMentor, state)}
                    <small>Rules-based recommendation</small>
                  </span>
                </div>
                <h3>A little time for your next step</h3>
                <p>
                  45-minute session · €{modalMentor.price} ·{" "}
                  {modalMentor.language}
                  <br />
                  <small>Times shown in your device’s local time zone.</small>
                </p>
                {modalMentor.available || serverSlots.length > 0 ? (
                  <>
                    <div className="booking-slots">
                      {(apiBase
                        ? serverSlots.slice(0, 8)
                        : [1, 2, 3, 4].map((d) => {
                            const date = new Date();
                            date.setDate(date.getDate() + d);
                            date.setHours(d % 2 ? 14 : 10, 0, 0, 0);
                            return date.toISOString();
                          })
                      ).map((iso) => {
                        const date = new Date(iso),
                          booked = state.bookings.some(
                            (b) =>
                              b.time === iso &&
                              b.mentorId === modalMentor.id &&
                              b.status === "confirmed",
                          );
                        return (
                          <button
                            disabled={booked}
                            className={slot === iso ? "selected" : ""}
                            key={iso}
                            onClick={() => setSlot(iso)}
                          >
                            {new Intl.DateTimeFormat("en", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            }).format(date)}
                            <strong>
                              {new Intl.DateTimeFormat("en", {
                                hour: "numeric",
                                minute: "2-digit",
                              }).format(date)}
                            </strong>
                            {booked && <small>Booked</small>}
                          </button>
                        );
                      })}
                    </div>
                    <div className="test-payment">
                      <ShieldCheck size={18} />
                      <div>
                        <strong>Sandbox checkout</strong>
                        <p>
                          Test payment only. No card details needed and no real
                          charge.
                        </p>
                      </div>
                    </div>
                    <button
                      className="primary full"
                      disabled={!slot || loading}
                      onClick={() => {
                        const time = slot;
                        action(
                          "/bookings",
                          {
                            mentorId: modalMentor.id,
                            time,
                            idempotencyKey: crypto.randomUUID(),
                          },
                          (s) => {
                            if (
                              s.bookings.some(
                                (b) =>
                                  b.time === time &&
                                  b.mentorId === modalMentor.id &&
                                  b.status === "confirmed",
                              )
                            )
                              return s;
                            return {
                              ...s,
                              bookings: [
                                ...s.bookings,
                                {
                                  id: crypto.randomUUID(),
                                  mentorId: modalMentor.id,
                                  time,
                                  status: "confirmed",
                                  price: modalMentor.price,
                                },
                              ],
                              notifications: addNotification(
                                `Your session with ${modalMentor.name} is confirmed. Test payment received.`,
                                s,
                              ),
                            };
                          },
                          "Session booked. Your next connection is on the calendar.",
                        );
                        setSlot("");
                        setModal(null);
                      }}
                    >
                      Confirm test payment · €{modalMentor.price}
                      <ArrowRight size={16} />
                    </button>
                  </>
                ) : (
                  <button
                    className="outline full"
                    onClick={() =>
                      notify(
                        "You’re on the local demo waitlist. Live waitlist email is not configured.",
                      )
                    }
                  >
                    Join the demo waitlist
                    <Plus size={15} />
                  </button>
                )}
              </div>
            )}
            {modal.type === "project" && modalProject && (
              <div className="modal-content">
                <span className={"tag " + modalProject.color}>
                  {modalProject.category} · {modalProject.level}
                </span>
                <h2>{modalProject.title}</h2>
                <p>{modalProject.subtitle}</p>
                <div className="project-brief">
                  <h3>Your brief</h3>
                  <p>{modalProject.brief}</p>
                  <h3>Skills you’ll put into practice</h3>
                  <div className="skill-tags">
                    {modalProject.skills.map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </div>
                  <h3>What to include</h3>
                  <ul>
                    <li>
                      A short description of the problem and your approach
                    </li>
                    <li>Screenshots showing the finished experience</li>
                    <li>A repository or live demo link, when applicable</li>
                    <li>A reflection on what you learned along the way</li>
                  </ul>
                  <p>
                    <Clock size={14} /> Around {modalProject.hours} hours, at
                    your own pace.
                  </p>
                </div>
                {state.started.includes(modalProject.id) ? (
                  <button
                    className="primary full"
                    onClick={() =>
                      setModal({ type: "submit", id: modalProject.id })
                    }
                  >
                    Add your work to your portfolio
                    <ArrowRight size={15} />
                  </button>
                ) : (
                  <button
                    className="primary full"
                    onClick={() =>
                      action(
                        "/projects/" + modalProject.id + "/start",
                        {},
                        (s) => ({
                          ...s,
                          started: [
                            ...new Set([...s.started, modalProject.id]),
                          ],
                        }),
                        "Project started. Make something you’re proud of.",
                      )
                    }
                  >
                    Make this your next project
                    <ArrowRight size={15} />
                  </button>
                )}
              </div>
            )}
            {modal.type === "submit" && modalProject && (
              <form
                className="modal-content stack-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const p = {
                    id: modalProject.id,
                    title: String(f.get("title")),
                    description: String(f.get("description")),
                    repository: String(f.get("repository")),
                    demo: String(f.get("demo")),
                    screenshot: String(f.get("screenshot")),
                    skills: modalProject.skills,
                  };
                  await action(
                    "/portfolio",
                    p,
                    (s) => ({
                      ...s,
                      portfolio: [
                        ...s.portfolio.filter((x) => x.id !== p.id),
                        p,
                      ],
                      notifications: addNotification(
                        "Your portfolio has a new chapter. Beautiful work!",
                        s,
                      ),
                    }),
                    "Your project is in your portfolio. Look at you grow.",
                  );
                  setModal(null);
                  go("portfolio");
                }}
              >
                <span className="tag pistachio">
                  YOUR WORK DESERVES TO BE SEEN
                </span>
                <h2>A little story about what you made.</h2>
                <label>
                  Project title
                  <input
                    name="title"
                    required
                    maxLength={120}
                    defaultValue={
                      state.portfolio.find((p) => p.id === modalProject.id)
                        ?.title || modalProject.title
                    }
                  />
                </label>
                <label>
                  The problem, your approach, and what you learned
                  <textarea
                    name="description"
                    required
                    minLength={20}
                    maxLength={3000}
                    rows={5}
                    defaultValue={
                      state.portfolio.find((p) => p.id === modalProject.id)
                        ?.description
                    }
                  />
                </label>
                <label>
                  Repository URL
                  <input
                    name="repository"
                    type="url"
                    placeholder="https://github.com/you/your-project"
                    defaultValue={
                      state.portfolio.find((p) => p.id === modalProject.id)
                        ?.repository
                    }
                  />
                </label>
                <label>
                  Live demo URL
                  <input
                    name="demo"
                    type="url"
                    placeholder="https://your-project.com"
                    defaultValue={
                      state.portfolio.find((p) => p.id === modalProject.id)
                        ?.demo
                    }
                  />
                </label>
                <label>
                  Screenshot URL
                  <input
                    name="screenshot"
                    type="url"
                    placeholder="https://…/screenshot.png"
                    defaultValue={
                      state.portfolio.find((p) => p.id === modalProject.id)
                        ?.screenshot
                    }
                  />
                </label>
                <button className="primary" disabled={loading}>
                  Save to my portfolio
                  <ArrowRight size={16} />
                </button>
              </form>
            )}
            {modal.type === "notifications" && (
              <div className="modal-content">
                <span className="eyebrow">LITTLE THINGS TO KNOW</span>
                <h2>You’re in the loop.</h2>
                <button
                  className="text-button"
                  onClick={() =>
                    action(
                      "/workspace/notifications",
                      {},
                      (s) => ({
                        ...s,
                        notifications: s.notifications.map((n) => ({
                          ...n,
                          read: true,
                        })),
                      }),
                      "All caught up.",
                    )
                  }
                >
                  Mark all as read
                  <Check size={14} />
                </button>
                <div className="notification-list">
                  {state.notifications.map((n, i) => (
                    <div className={n.read ? "read" : ""} key={i}>
                      <span className="activity-dot" />
                      <p>{n.text}</p>
                      {!n.read && <span className="tag rose">New</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {modal.type === "saved" && (
              <div className="modal-content">
                <span className="eyebrow">FOR A LITTLE LATER</span>
                <h2>Your saved possibilities.</h2>
                {!state.saved.length
                  ? empty(
                      "Something will catch your eye.",
                      "Save a course with the bookmark button to find it here.",
                    )
                  : courses
                      .filter((c) => state.saved.includes(c.id))
                      .map((c) => (
                        <button
                          className="saved-row"
                          key={c.id}
                          onClick={() => setModal({ type: "course", id: c.id })}
                        >
                          <BookOpen size={20} />
                          <span>{c.title}</span>
                          <ArrowUpRight size={16} />
                        </button>
                      ))}
              </div>
            )}
            {modal.type === "goal" && (
              <form
                className="modal-content stack-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = Number(new FormData(e.currentTarget).get("goal"));
                  action(
                    "/workspace/goal",
                    { weeklyGoal: n },
                    (s) => ({ ...s, weeklyGoal: n }),
                    "Your weekly rhythm is set.",
                  );
                  setModal(null);
                }}
              >
                <span className="eyebrow">A RHYTHM THAT FITS YOUR LIFE</span>
                <h2>A little, often.</h2>
                <p>
                  Choose an achievable weekly lesson goal. Consistency grows
                  from a little kindness to yourself.
                </p>
                <label>
                  Lessons per week
                  <input
                    type="number"
                    name="goal"
                    defaultValue={state.weeklyGoal}
                    min={1}
                    max={30}
                    required
                  />
                </label>
                <button className="primary">
                  Save my goal
                  <Check size={16} />
                </button>
              </form>
            )}
            {modal.type === "auth" && (
              <form className="modal-content stack-form" onSubmit={auth}>
                <span className="brand-icon auth-logo">
                  <Bridge />
                </span>
                <span className="eyebrow">A PLACE TO BECOME.</span>
                <h2>
                  {authMode === "login"
                    ? "Welcome back, curious mind."
                    : authMode === "register"
                      ? "Your next chapter starts here."
                      : authMode === "verify"
                        ? "One little verification."
                        : "Let’s find your way back."}
                </h2>
                {!apiBase && (
                  <div className="test-payment">
                    <ShieldCheck size={18} />
                    <p>
                      Development demo. Profiles stay on this browser. Backend
                      configuration enables secure accounts and email.
                    </p>
                  </div>
                )}
                {authMode === "register" && (
                  <label>
                    Your full name
                    <input
                      name="name"
                      required
                      minLength={2}
                      maxLength={80}
                      autoComplete="name"
                    />
                  </label>
                )}
                {authMode !== "verify" && (
                  <label>
                    Email address
                    <input
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                    />
                  </label>
                )}
                {(authMode === "login" || authMode === "register") && (
                  <label>
                    Password
                    <input
                      name="password"
                      type="password"
                      minLength={8}
                      maxLength={128}
                      required
                      autoComplete={
                        authMode === "register"
                          ? "new-password"
                          : "current-password"
                      }
                    />
                  </label>
                )}
                {authMode === "verify" && (
                  <label>
                    Verification token
                    <input
                      name="token"
                      defaultValue={verificationToken}
                      required
                    />
                    {verificationToken && (
                      <small>
                        Development verification token prefilled. SMTP is
                        disabled.
                      </small>
                    )}
                  </label>
                )}
                {authMode === "reset" && (
                  <>
                    <label>
                      Reset token (from your email)
                      <input name="token" required />
                    </label>
                    <label>
                      New password
                      <input
                        name="password"
                        type="password"
                        minLength={8}
                        required
                        autoComplete="new-password"
                      />
                    </label>
                  </>
                )}
                <button className="primary" disabled={loading}>
                  {loading
                    ? "A moment…"
                    : authMode === "login"
                      ? "Sign in"
                      : authMode === "register"
                        ? "Create my account"
                        : authMode === "forgot"
                          ? "Send reset email"
                          : authMode === "verify"
                            ? "Verify email"
                            : "Reset password"}
                  <ArrowRight size={16} />
                </button>
                <div className="auth-links">
                  {authMode === "login" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setAuthMode("register")}
                      >
                        New here? Make yourself at home.
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthMode("forgot")}
                      >
                        Forgot your password?
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthMode("verify")}
                      >
                        Verify email
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setAuthMode("login")}
                      >
                        Back to sign in
                      </button>
                      {authMode === "forgot" && (
                        <button
                          type="button"
                          onClick={() => setAuthMode("reset")}
                        >
                          I have a reset token
                        </button>
                      )}
                    </>
                  )}
                </div>
              </form>
            )}
            {modal.type === "apply" && (
              <form
                className="modal-content stack-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const app = {
                    name: String(f.get("name")),
                    expertise: String(f.get("expertise")),
                    experience: String(f.get("experience")),
                    documents: String(f.get("documents")),
                    status: "Pending",
                  };
                  action(
                    "/mentor/application",
                    app,
                    (s) => ({
                      ...s,
                      application: app,
                      notifications: addNotification(
                        "Your mentor application is ready for review.",
                        s,
                      ),
                    }),
                    "Application submitted. Thanks for sharing what you know.",
                  );
                  setModal(null);
                }}
              >
                <span className="eyebrow">HELP SOMEONE FIND THEIR WAY.</span>
                <h2>Experience worth sharing.</h2>
                {state.application && (
                  <span className="tag apricot">
                    {state.application.status}
                  </span>
                )}
                <label>
                  Full name
                  <input
                    name="name"
                    required
                    defaultValue={state.application?.name || state.name}
                  />
                </label>
                <label>
                  Your areas of expertise
                  <input
                    name="expertise"
                    required
                    defaultValue={state.application?.expertise}
                    placeholder="UX design, research, Figma…"
                  />
                </label>
                <label>
                  Qualifications and mentoring experience
                  <textarea
                    name="experience"
                    required
                    minLength={30}
                    maxLength={3000}
                    rows={5}
                    defaultValue={state.application?.experience}
                  />
                </label>
                <label>
                  Supporting document URL
                  <input
                    name="documents"
                    type="url"
                    required
                    defaultValue={state.application?.documents}
                    placeholder="https://…/your-cv.pdf"
                  />
                </label>
                <button className="primary" disabled={loading}>
                  Submit for review
                  <ArrowRight size={16} />
                </button>
              </form>
            )}
            {modal.type === "decision" && (
              <form
                className="modal-content stack-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const decision = String(
                    new FormData(e.currentTarget).get("decision"),
                  );
                  const status = [
                    "Approved",
                    "Rejected",
                    "More information requested",
                  ][modal.id!];
                  action(
                    "/admin/applications/decision",
                    {
                      status,
                      decision,
                      applicationId: (
                        state.application as unknown as { id?: number }
                      )?.id,
                    },
                    (s) => ({
                      ...s,
                      application: s.application
                        ? { ...s.application, status, decision }
                        : null,
                      notifications: addNotification(
                        "Mentor application: " + status + ". " + decision,
                        s,
                      ),
                    }),
                    "Review decision recorded and applicant notified.",
                  );
                  setModal(null);
                }}
              >
                <h2>A thoughtful decision.</h2>
                <p>
                  {
                    [
                      "Approve this mentor",
                      "Reject this application",
                      "Request more information",
                    ][modal.id!]
                  }
                </p>
                <label>
                  Review notes
                  <textarea name="decision" required minLength={10} rows={4} />
                </label>
                <button className="primary" disabled={loading}>
                  Record decision
                  <Check size={15} />
                </button>
              </form>
            )}
            {modal.type === "cancel" && (
              <div className="modal-content">
                <span className="eyebrow">PLANS CHANGE. THAT’S OKAY.</span>
                <h2>Make a little room?</h2>
                <p>
                  Cancel this mentor session? The local sandbox payment will be
                  marked for a test refund. No real money was charged.
                </p>
                <button
                  className="primary full"
                  onClick={() => {
                    const b = state.bookings[modal.id!];
                    action(
                      "/bookings/" + b.id + "/cancel",
                      {},
                      (s) => ({
                        ...s,
                        bookings: s.bookings.map((x) =>
                          x.id === b.id ? { ...x, status: "cancelled" } : x,
                        ),
                        notifications: addNotification(
                          "Session cancelled. Sandbox refund recorded.",
                          s,
                        ),
                      }),
                      "Session cancelled. Test refund recorded.",
                    );
                    setModal(null);
                  }}
                >
                  Cancel session
                  <Check size={15} />
                </button>
              </div>
            )}
            {modal.type === "feedback" && (
              <form
                className="modal-content stack-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const feedback = String(
                    new FormData(e.currentTarget).get("feedback"),
                  );
                  action(
                    "/mentor/feedback",
                    {
                      projectId: modal.id,
                      learnerId: (modal as Modal & { learnerId?: number })
                        .learnerId,
                      feedback,
                    },
                    (s) => ({
                      ...s,
                      notifications: addNotification(
                        "Mentor feedback: " + feedback,
                        s,
                      ),
                    }),
                    "Feedback shared with the learner.",
                  );
                  setModal(null);
                }}
              >
                <h2>A little guidance for their next step.</h2>
                <label>
                  Constructive feedback
                  <textarea
                    name="feedback"
                    required
                    minLength={20}
                    maxLength={2000}
                    rows={5}
                  />
                </label>
                <button className="primary">
                  Share feedback
                  <Send size={15} />
                </button>
              </form>
            )}
            {modal.type === "editContent" &&
              (() => {
                const content = adminContent.find((c) => c.id === modal.id);
                return content ? (
                  <form
                    className="modal-content stack-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      try {
                        const data = JSON.parse(String(f.get("data")));
                        await request(
                          "/admin/content/" + content.id,
                          {
                            title: f.get("title"),
                            status: f.get("status"),
                            data,
                          },
                          "PATCH",
                        );
                        setAdminContent(await request("/admin/content"));
                        setModal(null);
                        notify("Content updated and audited.");
                      } catch (e) {
                        notify((e as Error).message);
                      }
                    }}
                  >
                    <span className="eyebrow">CONTENT WORKSPACE</span>
                    <h2>Edit {content.kind.toLowerCase()}</h2>
                    <label>
                      Title
                      <input
                        name="title"
                        defaultValue={content.title}
                        required
                        maxLength={150}
                      />
                    </label>
                    <label>
                      Publication status
                      <select name="status" defaultValue={content.status}>
                        <option>Draft</option>
                        <option>Published</option>
                        <option>Archived</option>
                      </select>
                    </label>
                    <label>
                      Content data, requirements, and prerequisites (JSON)
                      <textarea
                        name="data"
                        rows={12}
                        defaultValue={JSON.stringify(content.data, null, 2)}
                        required
                      />
                    </label>
                    <button className="primary">
                      Save changes
                      <Check size={15} />
                    </button>
                  </form>
                ) : null;
              })()}
            {modal.type === "content" && (
              <form
                className="modal-content stack-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  if (apiBase)
                    request("/admin/content", Object.fromEntries(f))
                      .then(() => {
                        request("/admin/content").then(setAdminContent);
                        notify("Content draft created.");
                        setModal(null);
                      })
                      .catch((e) => notify(e.message));
                  else {
                    const drafts = JSON.parse(
                      localStorage.getItem("sb-content-drafts") || "[]",
                    );
                    localStorage.setItem(
                      "sb-content-drafts",
                      JSON.stringify([...drafts, Object.fromEntries(f)]),
                    );
                    notify(
                      "Content draft saved locally. Production publishing requires the backend.",
                    );
                    setModal(null);
                  }
                }}
              >
                <h2>Make room for something new.</h2>
                <label>
                  Content type
                  <select name="type">
                    <option>Course</option>
                    <option>Project</option>
                    <option>Lesson</option>
                    <option>Category</option>
                    <option>Skill</option>
                  </select>
                </label>
                <label>
                  Title
                  <input name="title" required maxLength={150} />
                </label>
                <label>
                  Description
                  <textarea name="description" required rows={4} />
                </label>
                <button className="primary">
                  Save draft
                  <Check size={15} />
                </button>
              </form>
            )}
            {modal.type === "about" && (
              <div className="modal-content">
                <span className="eyebrow">BUILT FOR WHAT’S NEXT.</span>
                <h2>A little about this workspace.</h2>
                <p>
                  This is the SkillBridge development preview. Sample people,
                  courses, and projects are clearly labeled development data.
                </p>
                <p>
                  In demo mode, your profile, learning progress, bookings,
                  messages, and portfolio are stored on this browser. All
                  checkout transactions are simulated; no money is collected.
                </p>
                <p>
                  Recommendations use transparent rules based on your skills,
                  experience, interests, and career goal. An external AI
                  provider is not configured.
                </p>
                <p>
                  The repository includes the Spring Boot backend, PostgreSQL
                  migrations, role-based permissions, setup instructions, and
                  verification notes. Start that backend and set VITE_API_URL to
                  use authenticated server persistence.
                </p>
                <button
                  className="outline full"
                  onClick={() => {
                    if (apiBase && token())
                      request("/auth/logout", {}).catch(() => {});
                    sessionStorage.removeItem("sb-token");
                    sessionStorage.removeItem("sb-role");
                    setRole("LEARNER");
                    setModal(null);
                    go("home");
                    notify("Signed out.");
                  }}
                >
                  Sign out
                  <LogOut size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
