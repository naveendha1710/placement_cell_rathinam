import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/database';
import { Shield, Sparkles, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { role, switchRole } = useAuth();
  
  // Auto collapse on small screens (< 1024px)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return window.innerWidth < 1024;
  });

  // Responsive window resize listener
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const rolesList: { label: string; value: UserRole }[] = [
    { label: 'Super Admin', value: 'super_admin' },
    { label: 'Placement Coord', value: 'placement_coordinator' },
    { label: 'Dept Coord (CSE)', value: 'dept_coordinator' },
    { label: 'Data Entry', value: 'data_entry' },
    { label: 'Report Viewer (Read-only)', value: 'report_viewer' },
  ];

  return (
    <div className="min-h-screen flex bg-zinc-50 text-zinc-900 overflow-x-hidden">
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-zinc-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-zinc-700 hidden sm:block" />
            <span className="text-sm font-semibold text-zinc-900 truncate">Rathinam Placement Portal</span>
          </div>

          {/* User Role Badge (Static Read-Only) */}
          <div className="flex items-center gap-2 bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs">
            <Shield className="h-3.5 w-3.5 text-zinc-700" />
            <span className="font-bold text-zinc-900 uppercase tracking-wider text-[11px]">
              {role ? role.replace('_', ' ') : 'SUPER ADMIN'}
            </span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
