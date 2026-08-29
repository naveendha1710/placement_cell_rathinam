import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/database';
import { Shield, Sparkles } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { role, switchRole } = useAuth();

  const rolesList: { label: string; value: UserRole }[] = [
    { label: 'Super Admin', value: 'super_admin' },
    { label: 'Placement Coord', value: 'placement_coordinator' },
    { label: 'Dept Coord (CSE)', value: 'dept_coordinator' },
    { label: 'Data Entry', value: 'data_entry' },
    { label: 'Report Viewer (Read-only)', value: 'report_viewer' },
  ];

  return (
    <div className="min-h-screen flex bg-zinc-50 text-zinc-900">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-zinc-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-zinc-700" />
            <span className="text-sm font-medium text-zinc-700">Rathinam Placement Portal</span>
          </div>

          {/* Quick Role Simulator Switcher */}
          <div className="flex items-center gap-3 bg-zinc-100 p-1.5 rounded-lg border border-zinc-200">
            <div className="flex items-center gap-1.5 text-xs text-zinc-600 font-semibold px-2">
              <Sparkles className="h-3.5 w-3.5 text-zinc-800" />
              <span>Simulate Role:</span>
            </div>
            <select
              value={role || ''}
              onChange={(e) => switchRole(e.target.value as UserRole)}
              className="text-xs bg-white text-zinc-900 font-medium px-2 py-1 rounded border border-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-900 cursor-pointer"
            >
              {rolesList.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
