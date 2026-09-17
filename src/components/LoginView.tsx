import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Factory, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Background radial accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-900/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-900/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Card Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400 mb-4 shadow-inner">
            <Factory className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Manufacturing ERP</h1>
          <p className="text-sm text-slate-400 mt-1">
            Sign in to access your ERP account
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-sm flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <button
              id="btn-submit-login"
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-900/30 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials Section */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Demo Credentials
            </div>

            <div className="space-y-3">
              {/* ADMIN ACCOUNT CARD */}
              <button
                id="demo-card-admin"
                type="button"
                onClick={() => {
                  setEmail('admin@example.com');
                  setPassword('Admin@123');
                }}
                className="w-full text-left p-3.5 bg-slate-950/70 hover:bg-slate-900/90 border border-slate-800/80 hover:border-purple-500/60 rounded-xl transition-all duration-150 cursor-pointer group focus:outline-none focus:ring-1 focus:ring-purple-500/50 shadow-sm hover:shadow-purple-950/20"
                title="Click to fill Admin credentials"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-200 font-mono tracking-wide uppercase">
                    ADMIN
                  </span>
                  <span className="text-[11px] text-slate-400 group-hover:text-purple-300 font-sans transition-colors">
                    Click to use
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-400 group-hover:text-slate-200 transition-colors">
                  admin@example.com
                </div>
                <div className="text-xs font-mono text-slate-500 group-hover:text-slate-300 transition-colors">
                  Admin@123
                </div>
              </button>

              {/* SALES ACCOUNT CARD */}
              <button
                id="demo-card-sales"
                type="button"
                onClick={() => {
                  setEmail('sales@example.com');
                  setPassword('Sales@123');
                }}
                className="w-full text-left p-3.5 bg-slate-950/70 hover:bg-slate-900/90 border border-slate-800/80 hover:border-emerald-500/60 rounded-xl transition-all duration-150 cursor-pointer group focus:outline-none focus:ring-1 focus:ring-emerald-500/50 shadow-sm hover:shadow-emerald-950/20"
                title="Click to fill Sales credentials"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-200 font-mono tracking-wide uppercase">
                    SALES
                  </span>
                  <span className="text-[11px] text-slate-400 group-hover:text-emerald-300 font-sans transition-colors">
                    Click to use
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-400 group-hover:text-slate-200 transition-colors">
                  sales@example.com
                </div>
                <div className="text-xs font-mono text-slate-500 group-hover:text-slate-300 transition-colors">
                  Sales@123
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

