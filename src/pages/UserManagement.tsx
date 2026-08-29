import React, { useEffect, useState } from 'react';
import { DataStore } from '../lib/store';
import { Profile, UserRole } from '../types/database';
import { UserInlineForm } from '../components/users/UserInlineForm';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Users, UserPlus, Search, Edit, ShieldCheck, UserX, UserCheck } from 'lucide-react';

export const UserManagement: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const data = await DataStore.getProfiles();
      setProfiles(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleSaveUser = async (profileData: Partial<Profile> & { name: string; email: string; role: UserRole; password?: string }) => {
    await DataStore.saveProfile(profileData as Profile & { password?: string });
    setIsFormOpen(false);
    await loadProfiles();
  };

  const handleToggleStatus = async (profile: Profile) => {
    const nextStatus = profile.status === 'active' ? 'disabled' : 'active';
    await DataStore.saveProfile({ ...profile, status: nextStatus });
    await loadProfiles();
  };

  const filtered = profiles.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    p.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Users className="h-6 w-6" />
            <span>User & Access Management</span>
          </h1>
          <p className="text-xs text-zinc-500">
            Super Admin Portal: Manage staff credentials, roles, and department permissions.
          </p>
        </div>

        {!isFormOpen && (
          <Button
            onClick={() => {
              setSelectedUser(null);
              setIsFormOpen(true);
            }}
            className="gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Staff User</span>
          </Button>
        )}
      </div>

      {/* Inline Form Container */}
      {isFormOpen && (
        <UserInlineForm
          userProfile={selectedUser}
          onSave={handleSaveUser}
          onClose={() => setIsFormOpen(false)}
        />
      )}

      {/* Filter Bar */}
      <Card className="p-4 bg-white border-zinc-200">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by user name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>
      </Card>

      {/* Data Table */}
      <Card className="overflow-hidden border-zinc-200">
        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-500">Loading user profiles...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">No user accounts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-700">
              <thead className="bg-zinc-100 border-b border-zinc-200 uppercase text-[11px] font-semibold text-zinc-600 tracking-wider">
                <tr>
                  <th className="py-3 px-4">User Name</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Department Scope</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-bold text-zinc-900 text-sm">{p.name}</p>
                        <p className="text-[11px] text-zinc-500">{p.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-bold text-zinc-900 bg-zinc-100 px-2.5 py-1 rounded border border-zinc-200">
                        <ShieldCheck className="h-3 w-3 text-zinc-700" />
                        {p.role.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-zinc-800">
                      {p.department_scope || <span className="text-zinc-400 italic">All Depts</span>}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={p.status === 'active' ? 'approved' : 'rejected'}>
                        {p.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(p);
                            setIsFormOpen(true);
                          }}
                          className="p-1 rounded hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                          title="Edit User Role"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(p)}
                          className={`p-1 rounded ${
                            p.status === 'active'
                              ? 'hover:bg-rose-50 text-rose-600'
                              : 'hover:bg-emerald-50 text-emerald-600'
                          }`}
                          title={p.status === 'active' ? 'Disable User' : 'Activate User'}
                        >
                          {p.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
