import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', icon: '🏠', label: '首页' },
  { path: '/tasks', icon: '📋', label: '任务' },
  { path: '/exercise', icon: '🏃', label: '运动' },
  { path: '/weekly', icon: '📅', label: '周报' },
  { path: '/redeem', icon: '🎁', label: '兑换' },
  { path: '/stats', icon: '📊', label: '统计' },
  { path: '/settings', icon: '⚙️', label: '设置' },
];

export default function NavBar() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 max-w-[800px] mx-auto">
      <div className="flex justify-around items-center h-16">
        {navItems.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                active ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
