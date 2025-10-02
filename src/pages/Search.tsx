import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import VideoCard from '../components/VideoCard';
import type { VideoRecord } from '../../api/_lib/types';

async function searchVideos(params: URLSearchParams): Promise<VideoRecord[]> {
  const response = await fetch(`/api/videos?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to search videos');
  }
  const data = (await response.json()) as { videos: VideoRecord[] };
  return data.videos;
}

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const tag = params.get('tag') ?? '';
  const queryParams = useMemo(() => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (tag) next.set('tag', tag);
    return next;
  }, [q, tag]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['videos', 'search', q, tag],
    queryFn: () => searchVideos(queryParams)
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-lg font-semibold text-white">
          Results for {q ? `“${q}”` : ''} {tag ? `#${tag}` : ''}
        </h1>
      </header>
      {isLoading && <p className="text-sm text-slate-400">Searching...</p>}
      {error && <p className="text-sm text-red-400">{(error as Error).message}</p>}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
      {!isLoading && data?.length === 0 && (
        <p className="text-sm text-slate-400">No videos match your filters yet.</p>
      )}
    </div>
  );
}
