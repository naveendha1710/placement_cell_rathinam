import React, { useEffect, useState } from 'react';
import { DataStore } from '../lib/store';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { GraduationCap, Building2, Briefcase, Users, CheckCircle2, Clock, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const { user, departmentScope } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    placedStudents: 0,
    unplacedStudents: 0,
    optedOutStudents: 0,
    totalCompanies: 0,
    approvedCompanies: 0,
    totalOffers: 0,
    approvedOffers: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        let students = await DataStore.getStudents();
        if (departmentScope) {
          students = students.filter(s => s.department.toLowerCase() === departmentScope.toLowerCase());
        }

        const companies = await DataStore.getCompanies();
        const offers = await DataStore.getOffers();
        const profiles = await DataStore.getProfiles();

        setStats({
          totalStudents: students.length,
          placedStudents: students.filter(s => s.placement_status === 'placed').length,
          unplacedStudents: students.filter(s => s.placement_status === 'yet_to_be_placed').length,
          optedOutStudents: students.filter(s => s.placement_status === 'opted_out').length,
          totalCompanies: companies.length,
          approvedCompanies: companies.filter(c => c.approval_status === 'approved').length,
          totalOffers: offers.length,
          approvedOffers: offers.filter(o => o.approval_status === 'approved').length,
          totalUsers: profiles.length,
        });
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [departmentScope]);

  if (loading) {
    return (
      <div className="py-12 text-center text-zinc-500">
        <div className="h-6 w-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading Dashboard Metrics...
      </div>
    );
  }

  const placementPercentage = stats.totalStudents > 0 
    ? Math.round((stats.placedStudents / stats.totalStudents) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Placement Dashboard</h1>
        <p className="text-sm text-zinc-500">
          Welcome back, {user?.name}. {departmentScope ? `Scope: ${departmentScope}` : 'Overview of all drives & statistics.'}
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-zinc-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Total Students
            </CardTitle>
            <GraduationCap className="h-5 w-5 text-zinc-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900">{stats.totalStudents}</div>
            <p className="text-xs text-zinc-500 mt-1">
              {stats.placedStudents} Placed ({placementPercentage}%)
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Active Companies
            </CardTitle>
            <Building2 className="h-5 w-5 text-zinc-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900">{stats.totalCompanies}</div>
            <p className="text-xs text-emerald-700 mt-1 font-medium">
              {stats.approvedCompanies} Approved for Drives
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Offers & Drives
            </CardTitle>
            <Briefcase className="h-5 w-5 text-zinc-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900">{stats.totalOffers}</div>
            <p className="text-xs text-emerald-700 mt-1 font-medium">
              {stats.approvedOffers} Approved Offers
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              System Users
            </CardTitle>
            <Users className="h-5 w-5 text-zinc-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900">{stats.totalUsers}</div>
            <p className="text-xs text-zinc-500 mt-1">Staff & Coordinators</p>
          </CardContent>
        </Card>
      </div>

      {/* Placement Breakdown Sub-cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-medium">Placed Students</p>
            <p className="text-xl font-bold text-zinc-900">{stats.placedStudents}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-50 text-amber-700">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-medium">Yet to be Placed Students</p>
            <p className="text-xl font-bold text-zinc-900">{stats.unplacedStudents}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-lg bg-slate-100 text-slate-700">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-medium">Opted Out / Higher Studies</p>
            <p className="text-xl font-bold text-zinc-900">{stats.optedOutStudents}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
