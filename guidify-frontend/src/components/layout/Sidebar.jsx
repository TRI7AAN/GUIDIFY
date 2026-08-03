import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Home, LayoutDashboard, Route, User, BookOpen,
  Briefcase, GraduationCap, Settings, LogOut, Brain
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/roadmap', label: 'Learning Path', icon: Route },
  { to: '/resume', label: 'Resume', icon: BookOpen },
  { to: '/interview', label: 'Interview', icon: Briefcase },
  { to: '/psychometric-test', label: 'Psychometric', icon: Brain },
];

export default function Sidebar() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside className="flex-shrink-0 w-56 bg-[#0D0F18] p-3 flex flex-col justify-between border-r border-[#1F2330]">
      <div className="flex flex-col gap-5">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-9 h-9 rounded-full bg-[#3cff14] flex items-center justify-center">
            <span className="text-[#0D0F18] font-bold text-base">G</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-white text-xl font-bold font-display">GUIDIFY</h1>
            <p className="text-[#A4ACBC] text-sm">AI Learning Platform</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#3cff14]/10 text-[#3cff14]'
                    : 'text-[#A4ACBC] hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom section */}
      <div className="flex flex-col gap-1.5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-2.5 py-1.5 text-[#A4ACBC] hover:text-white transition-colors rounded-lg"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
