import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import VideoCard from '../components/VideoCard';
import type { VideoRecord } from '../../api/_lib/types';

async function fetchVideos(): Promise<VideoRecord[]> {
  const response = await fetch('/api/videos');
  if (!response.ok) {
    throw new Error('Failed to load catalog');
  }
  const data = (await response.json()) as { videos: VideoRecord[] };
  return data.videos;
}

export default function Channel() {
  const params = useParams();
  const channelId = params.id ?? '';
  const { data, isLoading, error } = useQuery({
    queryKey: ['videos', 'channel'],
    queryFn: fetchVideos
  });

  const channelVideos = useMemo(
    () => data?.filter((video) => video.channelId === channelId) ?? [],
    [data, channelId]
  );
  const channelName = channelVideos[0]?.channelName ?? 'Unknown creator';

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-white/10 bg-slate-950/70 p-8 backdrop-blur">
        <h1 className="text-2xl font-semibold text-white">{channelName}</h1>
        <p className="mt-2 text-sm text-slate-300">
          {channelVideos.length} videos · Member since{' '}
          {channelVideos[0] ? new Date(channelVideos[0].createdAt).toLocaleDateString() : 'recently'}
        </p>
      </header>
      {isLoading && <p className="text-sm text-slate-300">Loading channel...</p>}
      {error && <p className="text-sm text-red-400">{(error as Error).message}</p>}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {channelVideos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
}
