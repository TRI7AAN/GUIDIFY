import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppShell({ children }) {
  return (
    <div className="flex min-h-0 h-screen bg-[#0D0F18]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <div className="flex-1 p-5 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
