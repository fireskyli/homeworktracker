export interface Task {
  id: number;
  name: string;
  subject: string;
  emoji: string;
  estimatedMin: number;
  deadlineTime: string | null;
  startDate: string | null;
  repeatType: 'once' | 'daily' | 'weekly';
  repeatDays: number[];
  sortOrder: number;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWithStatus extends Task {
  isCheckedIn: boolean;
  checkInId: number | null;
  quality: number | null;
  overdueDays: number;
}

export interface CheckIn {
  id: number;
  taskId: number;
  date: string;
  completedAt: string;
  quality: number | null;
  photoUrl: string | null;
  note: string | null;
  isMakeup: number;
}

export interface StatsOverview {
  todayRate: number;
  weekRate: number;
  currentStreak: number;
  longestStreak: number;
  totalCheckins: number;
}

export interface StreakData {
  current: number;
  longest: number;
}

export interface CalendarData {
  year: number;
  month: number;
  days: Record<string, number>;
}
