import { FormEvent, useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setQuery(params.get('q') ?? '');
  }, [location.search]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = query.trim();
    if (value.length === 0) {
      navigate('/');
      return;
    }
    navigate(`/search?q=${encodeURIComponent(value)}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-xl font-semibold">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-white">
                CS
              </span>
              CrownShield
            </Link>
            <nav className="hidden items-center gap-4 text-sm font-medium sm:flex">
              <Link className="hover:text-brand" to="/">
                Home
              </Link>
              <Link className="hover:text-brand" to="/upload">
                Upload
              </Link>
            </nav>
          </div>
          <form onSubmit={handleSubmit} className="flex w-full max-w-md items-center gap-2">
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              placeholder="Search videos"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button
              type="submit"
              className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Search
            </button>
          </form>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="hidden text-sm font-medium sm:inline">{user.displayName}</span>
                <Link
                  to="/settings/profile"
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:border-brand"
                >
                  Settings
                </Link>
                <button
                  onClick={() => logout().catch(() => undefined)}
                  className="rounded-lg bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-slate-800 bg-slate-900 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} CrownShield. Stream responsibly.
      </footer>
    </div>
  );
}
