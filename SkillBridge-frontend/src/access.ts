export type Role = "LEARNER" | "MENTOR" | "ADMIN";
const env = (import.meta as unknown as { env: Record<string, string> }).env;
export const apiBase = env.VITE_API_URL || "/api";
export const portals = [
  { role: "LEARNER", label: "Learner", description: "Take courses, build projects, and book a mentor.", page: "dashboard" },
  { role: "MENTOR", label: "Mentor", description: "Manage your availability, sessions, and learner feedback.", page: "mentor" },
  { role: "ADMIN", label: "Admin", description: "Manage members, mentors, content, and platform activity.", page: "admin" },
] as const;
export const homeFor = (role: string) => portals.find(p => p.role === role)?.page || "dashboard";
export const roleLabel = (role: string) => portals.find(p => p.role === role)?.label || "Learner";
export function emptyWorkspace() {
  return {
    name: "", email: "", bio: "", goal: "Find my next career step", level: "Beginner",
    skills: [] as string[], interests: [] as string[], enrolled: [] as number[],
    completed: {} as Record<string, number[]>, lessonDates: {} as Record<string, string>,
    saved: [] as number[], bookings: [], messages: [], portfolio: [], started: [] as number[],
    notifications: [], availability: [] as string[], mentorPrice: 45, weeklyGoal: 5, application: null,
  };
}
