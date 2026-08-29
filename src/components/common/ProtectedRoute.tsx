import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/database';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-zinc-500 font-medium">Loading Placement Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="p-12 text-center max-w-md mx-auto my-12 bg-white rounded-xl border border-zinc-200 shadow-xs">
        <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
          !
        </div>
        <h2 className="text-lg font-bold text-zinc-900 mb-1">Access Restricted</h2>
        <p className="text-xs text-zinc-500 mb-4">
          Your role (<span className="font-semibold text-zinc-800">{role}</span>) does not have permission to view this section.
        </p>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-zinc-900 text-white rounded-md text-xs font-medium hover:bg-zinc-800"
        >
          Go Back
        </button>
      </div>
    );
  }

  return <Outlet />;
};
