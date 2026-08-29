import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  GraduationCap, 
  Building2, 
  Briefcase, 
  Users, 
  ShieldAlert,
  LogOut 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

export const Sidebar: React.FC = () => {
  const { user, role, logout, canManageUsers } = useAuth();

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
  ];

  return (
    <aside className="w-64 border-r border-zinc-200 bg-white min-h-screen flex flex-col justify-between">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-zinc-100 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            R
          </div>
          <div>
            <h1 className="font-bold text-sm text-zinc-900 tracking-tight">Placement Portal</h1>
            <p className="text-xs text-zinc-500">Rathinam Group</p>
          </div>
        </div>

        {/* User Info & Role Badge */}
        <div className="p-4 mx-3 my-3 rounded-lg bg-zinc-50 border border-zinc-200">
          <p className="text-xs font-semibold text-zinc-900 truncate">{user?.name || 'Guest'}</p>
          <p className="text-[11px] text-zinc-500 truncate mb-2">{user?.email}</p>
          <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-900 text-zinc-50">
            {role?.replace('_', ' ').toUpperCase()}
          </div>
          {user?.department_scope && (
            <p className="text-[10px] text-zinc-600 mt-1 font-medium">
              Dept: {user.department_scope}
            </p>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="px-3 py-2 space-y-1">
          {navItems
            .filter(item => item.show)
            .map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-zinc-900 text-white shadow-xs'
                        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </NavLink>
              );
            })}
        </nav>
      </div>

      {/* Footer / Logout */}
      <div className="p-3 border-t border-zinc-100">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
