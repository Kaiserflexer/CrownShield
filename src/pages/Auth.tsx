import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { login, register } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, displayName);
      }
      const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? '/';
      navigate(redirectTo);
    } catch (authError) {
      setError((authError as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-2xl bg-gradient-to-tr from-brand/60 via-purple-500/40 to-sky-500/40 p-[1px] shadow-xl">
      <div className="space-y-6 rounded-2xl bg-slate-950/80 p-8 backdrop-blur">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold text-white">
            {mode === 'login' ? 'Welcome back' : 'Create your channel'}
          </h1>
          <p className="text-sm text-slate-300">
            {mode === 'login'
              ? 'Sign in to continue watching and upload your own videos.'
              : 'Register to unlock uploads, likes, and comments.'}
          </p>
        </header>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-200">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-brand focus:outline-none"
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-200">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-brand focus:outline-none"
              required
            />
          </label>
          {mode === 'register' && (
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-200">Channel name</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-brand focus:outline-none"
                required={mode === 'register'}
              />
            </label>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-70"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Register'}
          </button>
        </form>
        <p className="text-sm text-slate-300">
          {mode === 'login' ? 'No account yet?' : 'Already a member?'}{' '}
          <button
            className="text-brand hover:text-brand-dark"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Join CrownShield' : 'Sign in instead'}
          </button>
        </p>
      </div>
    </div>
  );
}
