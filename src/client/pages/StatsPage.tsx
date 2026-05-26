import StatsOverview from '../components/StatsOverview';
import CheckInCalendar from '../components/CheckInCalendar';
import StatsChart from '../components/StatsChart';

export default function StatsPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">统计</h1>
      <StatsOverview />
      <CheckInCalendar />
      <StatsChart />
    </div>
  );
}
