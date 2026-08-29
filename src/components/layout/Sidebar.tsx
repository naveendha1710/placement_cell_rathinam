import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  GraduationCap, 
  Building2, 
  Briefcase, 
  Users, 
  FileSpreadsheet,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const { user, role, logout, canManageUsers } = useAuth();
  const location = useLocation();

  // Auto collapse on route change for smaller screens (< 1024px)
  useEffect(() => {
    if (window.innerWidth < 1024 && !isCollapsed) {
      onToggle();
    }
  }, [location.pathname]);

  const navItems = [
    {
      title: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      show: true,
    },
    {
      title: 'Students',
      path: '/students',
      icon: GraduationCap,
      show: true,
    },
    {
      title: 'Companies',
      path: '/companies',
      icon: Building2,
      show: true,
    },
    {
      title: 'Offers & Drives',
      path: '/offers',
      icon: Briefcase,
      show: true,
    },
    {
      title: 'User Management',
      path: '/users',
      icon: Users,
      show: canManageUsers, // strictly super_admin only
    },
    {
      title: 'Reports',
      path: '/reports',
      icon: FileSpreadsheet,
      show: role !== 'data_entry', // visible to super_admin, placement_coordinator, report_viewer, dept_coordinator
    },
  ];

  return (
    <aside 
      className={cn(
        "border-r border-zinc-200 bg-white min-h-screen flex flex-col justify-between transition-all duration-300 relative z-20 shrink-0",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div>
        {/* Brand Header & Toggle Button */}
        <div className={cn(
          "p-4 border-b border-zinc-100 flex items-center justify-between",
          isCollapsed ? "justify-center" : "px-5 py-4"
        )}>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
              R
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <h1 className="font-bold text-sm text-zinc-900 tracking-tight truncate">Placement Portal</h1>
                <p className="text-[11px] text-zinc-500 truncate">Rathinam Group</p>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Collapsed Toggle Button (Visible when collapsed) */}
        {isCollapsed && (
          <div className="flex justify-center pt-3 pb-1 border-b border-zinc-100">
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
              title="Expand Sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* User Info & Role Badge */}
        <div className={cn(
          "mx-2 my-3 rounded-lg bg-zinc-50 border border-zinc-200 transition-all",
          isCollapsed ? "p-2 text-center" : "p-3"
        )}>
          {isCollapsed ? (
            <div 
              className="h-8 w-8 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center mx-auto"
              title={`${user?.name || 'User'} (${role?.replace('_', ' ').toUpperCase()})`}
            >
              {(user?.name || 'U').substring(0, 1).toUpperCase()}
            </div>
          ) : (
            <div>
              <p className="text-xs font-bold text-zinc-900 truncate">{user?.name || 'Guest'}</p>
              <p className="text-[11px] text-zinc-500 truncate mb-1.5">{user?.email}</p>
              <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-900 text-zinc-50">
                {role?.replace('_', ' ').toUpperCase()}
              </div>
              {user?.department_scope && (
                <p className="text-[10px] text-zinc-600 mt-1 font-medium truncate">
                  Dept: {user.department_scope}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="px-2 py-2 space-y-1">
          {navItems
            .filter(item => item.show)
            .map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={isCollapsed ? item.title : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                      isCollapsed && 'justify-center px-2',
                      isActive
                        ? 'bg-zinc-900 text-white shadow-xs'
                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.title}</span>}
                </NavLink>
              );
            })}
        </nav>
      </div>

      {/* Footer / Logout */}
      <div className="p-2 border-t border-zinc-100">
        <button
          onClick={logout}
          title={isCollapsed ? "Sign Out" : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors",
            isCollapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};
