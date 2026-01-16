'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  User,
  LogOut,
  Clock
} from 'lucide-react';
import { BreakNotificationCenter } from './BreakNotificationCenter';

interface EmployeeLayoutProps {
  children: React.ReactNode;
}

const EmployeeLayout: React.FC<EmployeeLayoutProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/employee' },
    { label: 'History', icon: <Calendar size={20} />, path: '/employee/history' },
    { label: 'Profile', icon: <User size={20} />, path: '/employee/profile' },
  ];

  return (
    <div className="flex min-h-screen bg-white selection:bg-black selection:text-white">
      {/* Sidebar Desktop Only */}
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 bg-white border-r border-zinc-100 z-50 w-28 flex-col justify-between">
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-6 flex flex-col items-center gap-6 min-h-[100px]">
            <Link
              href="/"
              className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-black shrink-0 shadow-lg cursor-pointer hover:scale-105 transition-transform"
            >
              C
            </Link>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-4 flex flex-col items-center">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                title={item.label}
                className={`w-full flex flex-col items-center justify-center gap-2 py-4 rounded-xl transition-all duration-300 ${pathname === item.path
                  ? 'bg-black text-white shadow-xl shadow-zinc-200'
                  : 'text-zinc-400 hover:text-black hover:bg-zinc-50'
                  }`}
              >
                <div className="shrink-0">{item.icon}</div>
                <span className="text-[9px] font-black uppercase tracking-widest text-center">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-zinc-50 flex flex-col items-center">
            <button
              onClick={signOut}
              title="Logout"
              className="w-full flex flex-col items-center justify-center gap-2 py-4 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-300"
            >
              <div className="shrink-0"><LogOut size={20} /></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-center">End Task</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:pl-28 transition-all duration-300">
        {/* Header Mobile Only */}
        <header className="lg:hidden h-20 bg-white/80 backdrop-blur-md border-b border-zinc-100 px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-white font-black text-xs">C</div>
          <div className="flex items-center gap-3">
            <BreakNotificationCenter />
            <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center text-black font-black text-[10px] uppercase">
              {new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }).split(' ')[0]}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 md:p-8 lg:p-12 animate-in fade-in slide-in-from-bottom-4 duration-700 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="hidden lg:flex justify-end items-center gap-4 mb-8">
              <BreakNotificationCenter />
              <div className="flex items-center gap-3 bg-zinc-50 px-6 py-3 rounded-2xl border border-zinc-100 shadow-sm">
                <Clock size={16} className="text-zinc-400" />
                <span className="text-[10px] font-black text-black uppercase tracking-[0.2em]">
                  {new Date().toLocaleString('en-PK', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
            {children}
          </div>
        </main>
      </div>

      {/* Bottom Nav for Mobile */}
      <nav className="lg:hidden fixed bottom-6 left-6 right-6 bg-black text-white shadow-2xl rounded-3xl px-8 py-4 flex justify-between items-center z-40">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`flex flex-col items-center gap-1 transition-all ${pathname === item.path ? 'text-white scale-125' : 'text-zinc-500'
              }`}
          >
            {item.icon}
          </Link>
        ))}
        <button onClick={signOut} className="text-zinc-500 hover:text-white transition-colors"><LogOut size={20} /></button>
      </nav>
    </div>
  );
};

export default EmployeeLayout;
