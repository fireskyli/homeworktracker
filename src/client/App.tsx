import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TaskWithStatus, CheckIn, StatsOverview, StreakData } from './types';
import { fetchTodayTasks, fetchTasks } from './hooks/useTasks';
import { fetchTodayCheckins } from './hooks/useCheckins';
import { fetchStatsOverview, fetchStreak, fetchPointsBalance } from './hooks/useStats';
import NavBar from './components/NavBar';
import HomePage from './pages/HomePage';
import TasksPage from './pages/TasksPage';
import StatsPage from './pages/StatsPage';
import SettingsPage from './pages/SettingsPage';
import WeeklyReportPage from './pages/WeeklyReportPage';
import RedemptionPage from './pages/RedemptionPage';
import MakeupPage from './pages/MakeupPage';
import ExercisePage from './pages/ExercisePage';

interface AppContextType {
  tasks: TaskWithStatus[];
  allTasks: TaskWithStatus[];
  todayCheckins: CheckIn[];
  stats: StatsOverview | null;
  streak: StreakData | null;
  pointsBalance: number;
  isParentMode: boolean;
  setParentMode: (v: boolean) => void;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

export const useApp = () => useContext(AppContext);

export default function App() {
  const [tasks, setTasks] = useState<TaskWithStatus[]>([]);
  const [allTasks, setAllTasks] = useState<TaskWithStatus[]>([]);
  const [todayCheckins, setTodayCheckins] = useState<CheckIn[]>([]);
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [isParentMode, setParentMode] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      const [today, all, checkins, overview, streakData, balance] = await Promise.all([
        fetchTodayTasks(),
        fetchTasks(),
        fetchTodayCheckins(),
        fetchStatsOverview(),
        fetchStreak(),
        fetchPointsBalance(),
      ]);
      setTasks(today as TaskWithStatus[]);
      setAllTasks(all as TaskWithStatus[]);
      setTodayCheckins(checkins);
      setStats(overview);
      setStreak(streakData);
      setPointsBalance(balance.balance);
    } catch (err) {
      console.error('数据加载失败:', err);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <AppContext.Provider
      value={{
        tasks,
        allTasks,
        todayCheckins,
        stats,
        streak,
        pointsBalance,
        isParentMode,
        setParentMode,
        refreshData,
      }}
    >
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 max-w-[800px] mx-auto pb-20">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/weekly" element={<WeeklyReportPage />} />
            <Route path="/redeem" element={<RedemptionPage />} />
            <Route path="/makeup" element={<MakeupPage />} />
            <Route path="/exercise" element={<ExercisePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
          <NavBar />
        </div>
      </BrowserRouter>
    </AppContext.Provider>
  );
}
