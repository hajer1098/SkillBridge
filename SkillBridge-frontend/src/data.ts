export type Course = {
  id: number;
  title: string;
  category: string;
  level: string;
  hours: number;
  skills: string[];
  instructor: string;
  lessons: string[];
  color: string;
  art: string;
  rating: string;
};
export type Mentor = {
  id: number;
  name: string;
  role: string;
  company: string;
  skills: string[];
  rating: string;
  reviews: number;
  price: number;
  language: string;
  available: boolean;
  image: string;
  bio: string;
};
export type Project = {
  id: number;
  title: string;
  subtitle: string;
  category: string;
  skills: string[];
  level: string;
  hours: number;
  color: string;
  art: string;
  brief: string;
};
export type Booking = {
  id: string;
  mentorId: number;
  time: string;
  status: "confirmed" | "cancelled";
  price: number;
  learnerId?: number;
  learnerName?: string;
  mentorName?: string;
};
export type PortfolioItem = {
  id: number;
  title: string;
  description: string;
  repository: string;
  demo: string;
  skills: string[];
  screenshot?: string;
};
export type AppState = {
  name: string;
  email: string;
  bio: string;
  goal: string;
  level: string;
  skills: string[];
  interests: string[];
  avatar?: string;
  enrolled: number[];
  completed: Record<string, number[]>;
  lessonDates: Record<string, string>;
  saved: number[];
  bookings: Booking[];
  messages: { mentorId: number; text: string; from: string; time: string }[];
  portfolio: PortfolioItem[];
  started: number[];
  weeklyGoal: number;
  application: null | {
    name: string;
    expertise: string;
    experience: string;
    documents: string;
    status: string;
    decision?: string;
  };
  notifications: { text: string; read: boolean }[];
  availability: string[];
  mentorPrice: number;
};
export function scoreItem(
  item: { skills: string[]; level?: string; category?: string },
  state: AppState,
) {
  return (
    item.skills.filter((s) => state.skills.includes(s)).length * 4 +
    (item.level === state.level ? 3 : 0) +
    (state.interests.includes(item.category || "") ? 2 : 0) +
    (state.goal.toLowerCase().includes("design") &&
    item.skills.some((s) => /design|Figma/.test(s))
      ? 3
      : 0)
  );
}
export function explanation(
  item: { skills: string[]; level?: string },
  state: AppState,
) {
  const match = item.skills.filter((s) => state.skills.includes(s));
  return match.length
    ? `Builds on your ${match.slice(0, 2).join(" and ")} skills and supports your next career step.`
    : `A practical way to explore ${item.skills[0]} at your ${state.level.toLowerCase()} level.`;
}
