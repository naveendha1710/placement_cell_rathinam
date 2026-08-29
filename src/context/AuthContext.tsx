import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, UserRole } from '../types/database';
import { DataStore } from '../lib/store';

interface AuthContextType {
  user: Profile | null;
  role: UserRole | null;
  departmentScope: string | null;
  loading: boolean;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  
  // Permission Helpers
  canCreateEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canUpdateApplicationStatus: boolean;
  canManageUsers: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Load default initial user (Super Admin for dev mode)
    async function initAuth() {
      try {
        const { INITIAL_PROFILES } = await import('../lib/mockSeed');
        const profiles = await DataStore.getProfiles();
        const storedUserEmail = localStorage.getItem('pp_current_user_email');
        const activeUser = profiles.find(p => p.email === storedUserEmail) || profiles[0] || INITIAL_PROFILES[0];
        setUser(activeUser || null);
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, []);

  const login = async (email: string): Promise<boolean> => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      let profiles = await DataStore.getProfiles();
      let found = profiles.find(p => p.email.toLowerCase() === cleanEmail);

      if (!found) {
        // Fallback check against seed profiles
        const { INITIAL_PROFILES } = await import('../lib/mockSeed');
        const seedMatch = INITIAL_PROFILES.find(p => p.email.toLowerCase() === cleanEmail);
        if (seedMatch) {
          found = await DataStore.saveProfile(seedMatch);
        } else if (cleanEmail) {
          // Auto-generate profile for custom user logins
          const newProfile: Profile = {
            id: crypto.randomUUID(),
            name: cleanEmail.split('@')[0].replace('.', ' ').toUpperCase(),
            email: cleanEmail,
            role: 'super_admin',
            department_scope: null,
            status: 'active',
            created_at: new Date().toISOString(),
          };
          found = await DataStore.saveProfile(newProfile);
        }
      }

      if (found) {
        setUser(found);
        localStorage.setItem('pp_current_user_email', found.email);
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pp_current_user_email');
  };

  const switchRole = async (targetRole: UserRole) => {
    const profiles = await DataStore.getProfiles();
    const match = profiles.find(p => p.role === targetRole);
    if (match) {
      setUser(match);
      localStorage.setItem('pp_current_user_email', match.email);
    } else if (user) {
      const updated = { ...user, role: targetRole };
      setUser(updated);
    }
  };

  const role = user?.role || null;
  const departmentScope = user?.department_scope || null;

  // Permission flags based on spec
  const canCreateEdit = role === 'super_admin' || role === 'placement_coordinator' || role === 'dept_coordinator' || role === 'data_entry';
  const canDelete = role === 'super_admin' || role === 'placement_coordinator' || role === 'dept_coordinator';
  const canApprove = role === 'super_admin' || role === 'placement_coordinator';
  const canUpdateApplicationStatus = role === 'super_admin' || role === 'placement_coordinator' || role === 'dept_coordinator';
  const canManageUsers = role === 'super_admin';

  return (
    <AuthContext.Provider value={{
      user,
      role,
      departmentScope,
      loading,
      login,
      logout,
      switchRole,
      canCreateEdit,
      canDelete,
      canApprove,
      canUpdateApplicationStatus,
      canManageUsers,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
