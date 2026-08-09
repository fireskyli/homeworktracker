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
  points: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWithStatus extends Task {
  isCheckedIn: boolean;
  checkInId: number | null;
  quality: number | null;
  photoUrl: string | null;
  isMakeup: number;
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

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  totalTasks: number;
  totalCheckins: number;
  weekRate: number;
  checkinDays: number;
  avgQuality: number;
  makeupCount: number;
  photoCount: number;
  totalPointsEarned: number;
  totalPointsSpent: number;
  netPoints: number;
  balance: number;
  dailyBreakdown: {
    date: string;
    count: number;
    rate: number;
    pointsEarned: number;
    tasks: { name: string; subject: string; emoji: string; quality: number | null; pointsEarned: number }[];
  }[];
  subjectDist: Record<string, number>;
  qualityDist: Record<number, number>;
  redemptions: { id: number; name: string; points: number; date: string; photoUrl: string | null }[];
}

export interface Redemption {
  id: number;
  name: string;
  points: number;
  date: string;
  photoUrl: string | null;
  createdAt: string;
  productId?: number | null;
  status?: string;
  appliedAt?: string | null;
  approvedAt?: string | null;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  points: number;
  photoUrl: string | null;
  isActive: number;
  sortOrder: number;
  createdAt: string;
}

export interface ExerciseType {
  id: number;
  name: string;
  emoji: string;
  unit: string;
  isPreset: number;
  isActive: number;
  sortOrder: number;
  createdAt: string;
}

export interface ExerciseSet {
  count: number;
  reps: number;
}

export interface Exercise {
  id: number;
  exerciseTypeId: number;
  exerciseType?: ExerciseType;
  date: string;
  completedAt: string;
  quality: number | null;
  sets: ExerciseSet[] | null;
  note: string | null;
  isMakeup: number;
  createdAt: string;
}

export interface ExerciseStatsOverview {
  todayCount: number;
  weekCount: number;
  todaySuns: number;
  totalSuns: number;
  currentStreak: number;
  totalPoints: number;
}

export interface ExerciseWeeklyReport {
  weekStart: string;
  weekEnd: string;
  totalExercises: number;
  totalSuns: number;
  exerciseDays: number;
  makeupCount: number;
  dailyBreakdown: {
    date: string;
    count: number;
    suns: number;
    exercises: { id: number; name: string; emoji: string; quality: number | null; sets: string | null }[];
  }[];
  typeDist: { name: string; emoji: string; count: number; suns: number }[];
}

// --
export interface AppConfig {
  mode: 'standalone' | 'network';
  features: {
    auth: boolean;
    registration: boolean;
    multiFamily: boolean;
  };
}

// --
export interface UserInfo {
  id: number;
  email: string;
  displayName: string;
  role: string;
}

// --
export interface ScheduleEntry {
  id: number;
  name: string;
  type: 'course' | 'tutoring';
  emoji: string;
  repeatType: 'weekly' | 'once';
  repeatDays: number[]; // 0=周日..6=周六
  date: string | null;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location: string | null;
  appName: string | null; // 远程课的上课 App
  remindDayBefore: number;
  remindMinBefore: number;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

// -- 课程出勤记录 --
export interface ScheduleAttendance {
  id: number;
  scheduleId: number;
  date: string;        // YYYY-MM-DD
  status: 'attended' | 'makeup' | 'absent';
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

// -- 月度出勤统计 --
export interface ScheduleStats {
  scheduleId: number;
  name: string;
  emoji: string;
  type: 'course' | 'tutoring';
  total: number;
  attended: number;
  makeup: number;
  absent: number;
  rate: number;  // 0-100
}

// -- 携带状态的课程条目 --
export interface ScheduleEntryWithStatus extends ScheduleEntry {
  todayStatus?: 'attended' | 'makeup' | 'absent' | 'pending';
}
