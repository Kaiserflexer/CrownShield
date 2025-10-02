import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import VideoCard from '../components/VideoCard';
import type { VideoRecord } from '../../api/_lib/types';

async function fetchVideos(): Promise<VideoRecord[]> {
  const response = await fetch('/api/videos');
  if (!response.ok) {
    throw new Error('Failed to load videos');
  }
  const data = (await response.json()) as { videos: VideoRecord[] };
  return data.videos;
}

export default function Home() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['videos', 'home'],
    queryFn: fetchVideos
  });

  const tags = useMemo(() => {
    const all = new Set<string>();
    data?.forEach((video) => video.tags.forEach((tag) => all.add(tag)));
    return Array.from(all).slice(0, 12);
  }, [data]);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-800 bg-gradient-to-r from-brand/20 to-slate-900 p-8">
        <h1 className="text-2xl font-semibold text-white">Discover new creators</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          CrownShield curates indie storytellers and educators. Dive into the catalog or upload your
          own masterpiece.
        </p>
      </section>
      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Popular tags</h2>
          <button
            onClick={() => window.open('/catalog/index.json', '_blank')}
            className="text-xs text-slate-400 hover:text-brand"
          >
            View catalog JSON
          </button>
        </header>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => navigate(`/search?tag=${encodeURIComponent(tag)}`)}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-brand"
            >
              #{tag}
            </button>
          ))}
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Latest uploads</h2>
        {isLoading && <p className="text-sm text-slate-400">Loading videos...</p>}
        {error && <p className="text-sm text-red-400">{(error as Error).message}</p>}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      </section>
    </div>
  );
}
