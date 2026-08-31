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
          <img 
            src="/rathinam_logo_student.png" 
            alt="Rathinam Group Logo" 
            className="h-16 w-auto mx-auto mb-3 object-contain"
          />
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


        </CardContent>
      </Card>
    </div>
  );
};
