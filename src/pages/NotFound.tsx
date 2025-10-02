import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <div className="text-6xl">🛰️</div>
      <h1 className="text-2xl font-semibold text-white">Signal lost</h1>
      <p className="text-sm text-slate-400">
        We couldn't find the page you were looking for. Maybe the video has been archived or moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        Return home
      </Link>
    </div>
  );
}
