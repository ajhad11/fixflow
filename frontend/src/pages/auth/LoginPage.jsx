import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Wrench, Shield, Lock, Mail, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [authError, setAuthError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: 'owner@apextech.com',
      password: 'Owner@12345',
    },
  });

  const demoAccounts = [
    { label: 'Shop Owner', email: 'owner@apextech.com', pass: 'Owner@12345', role: 'Full Management' },
    { label: 'Technician', email: 'tech@apextech.com', pass: 'Tech@12345', role: 'Repairs & AI Diagnosis' },
    { label: 'Receptionist', email: 'reception@apextech.com', pass: 'Recept@12345', role: 'Intake & Billing' },
    { label: 'Super Admin', email: 'admin@fixflow.com', pass: 'Admin@12345', role: 'Global SaaS Control' },
  ];

  const handleQuickLogin = (email, pass) => {
    setValue('email', email);
    setValue('password', pass);
    setAuthError('');
  };

  const onSubmit = async (data) => {
    setAuthError('');
    setSubmitting(true);
    try {
      await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      const detail = err.response?.data?.detail || 'Invalid email or password. Please verify credentials.';
      setAuthError(detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/25 mb-3">
          <Wrench className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">FixFlow</h2>
        <p className="mt-1 text-sm text-slate-400">Smart Repair Management & Diagnostic Platform</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-200">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Sign in to your shop</h3>
            <p className="text-xs text-slate-500 mt-0.5">Enter your staff credentials to access your dashboard</p>
          </div>

          {authError && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start space-x-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  {...register('email', { required: 'Email is required' })}
                  placeholder="name@repairshop.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900 transition"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  {...register('password', { required: 'Password is required' })}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900 transition"
                />
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm shadow-blue-500/20 transition flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
            >
              {submitting ? (
                <span>Authenticating with PostgreSQL...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Role Selector */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
              Instant Demo Access (Click to Fill):
            </p>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.label}
                  type="button"
                  onClick={() => handleQuickLogin(acc.email, acc.pass)}
                  className="p-2 text-left bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 rounded-lg transition text-xs group cursor-pointer"
                >
                  <div className="font-semibold text-slate-800 group-hover:text-blue-700 truncate">{acc.label}</div>
                  <div className="text-[10px] text-slate-500 truncate">{acc.role}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Connected directly to PostgreSQL database <code className="text-blue-400">fixflow_db</code>
        </p>
      </div>
    </div>
  );
};
