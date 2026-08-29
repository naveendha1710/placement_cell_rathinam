import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('admin@rathinam.ac.in');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await login(email);
    if (success) {
      navigate('/dashboard');
    } else {
      setError('User profile not found. Try one of the demo emails below.');
    }
  };

  const demoAccounts = [
    { label: 'Super Admin', email: 'admin@rathinam.ac.in' },
    { label: 'Placement Coordinator', email: 'placement@rathinam.ac.in' },
    { label: 'Dept Coordinator (CSE)', email: 'cse.coord@rathinam.ac.in' },
    { label: 'Data Entry Staff', email: 'dataentry@rathinam.ac.in' },
    { label: 'Report Viewer (Auditor)', email: 'viewer@rathinam.ac.in' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 p-4">
      <Card className="w-full max-w-md shadow-lg border-zinc-200">
        <CardHeader className="text-center pb-2">
          <div className="h-12 w-12 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-2xl mx-auto mb-3 shadow-md">
            R
          </div>
          <CardTitle className="text-xl">Placement Portal Sign In</CardTitle>
          <CardDescription>Rathinam Group of Institutions</CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 pt-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="user@rathinam.ac.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

            <Button type="submit" className="w-full gap-2">
              <span>Sign In</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="pt-4 border-t border-zinc-200">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium mb-2">
              <ShieldCheck className="h-4 w-4 text-zinc-700" />
              <span>Quick Login as Demo Account:</span>
            </div>
            <div className="space-y-1.5">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    login(acc.email).then(() => navigate('/dashboard'));
                  }}
                  className="w-full text-left px-3 py-1.5 rounded text-xs bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 flex justify-between items-center transition-colors"
                >
                  <span className="font-medium text-zinc-900">{acc.label}</span>
                  <span className="text-[11px] text-zinc-500">{acc.email}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
