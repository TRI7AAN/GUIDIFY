import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Bell } from 'lucide-react';

export default function TopBar() {
  const { user } = useAuth();
  const initials = (user?.user_metadata?.full_name || user?.email || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-[#1F2330] px-5 py-3 sticky top-0 bg-[#0D0F18]/80 backdrop-blur-sm z-10">
      {/* Search */}
      <div className="flex items-center gap-8">
        <label className="flex flex-col min-w-80 h-10">
          <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
            <div className="text-[#A4ACBC] flex border border-[#1F2330] bg-[#151821] items-center justify-center pl-3 rounded-l-lg border-r-0">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search courses, skills..."
              className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-none border border-[#1F2330] bg-[#151821] h-full placeholder:text-[#A4ACBC] px-4 rounded-l-none border-l-0 pl-2 text-base font-normal"
            />
          </div>
        </label>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <button className="flex cursor-pointer items-center justify-center rounded-lg h-10 w-10 bg-[#151821] text-[#A4ACBC] hover:text-white border border-[#1F2330] hover:border-[#3cff14] transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3cff14] to-[#4AD8E6] flex items-center justify-center text-[#0D0F18] font-bold text-sm border-2 border-[#1F2330]">
          {initials}
        </div>
      </div>
    </header>
  );
}
