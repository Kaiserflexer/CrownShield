import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import CommentList from '../components/CommentList';
import LikeButton from '../components/LikeButton';
import VideoCard from '../components/VideoCard';
import type { VideoRecord } from '../../api/_lib/types';

async function fetchVideo(id: string): Promise<VideoRecord> {
  const response = await fetch(`/api/videos/${id}`);
  if (!response.ok) {
    throw new Error('Video not found');
  }
  const data = (await response.json()) as { video: VideoRecord };
  return data.video;
}

async function fetchRelated(currentId: string): Promise<VideoRecord[]> {
  const response = await fetch('/api/videos');
  if (!response.ok) {
    return [];
  }
  const data = (await response.json()) as { videos: VideoRecord[] };
  return data.videos.filter((video) => video.id !== currentId).slice(0, 6);
}

export default function Watch() {
  const params = useParams();
  const id = params.id!;

  const videoQuery = useQuery({
    queryKey: ['video', id],
    queryFn: () => fetchVideo(id)
  });

  const relatedQuery = useQuery({
    queryKey: ['video', id, 'related'],
    queryFn: () => fetchRelated(id)
  });

  useEffect(() => {
    if (!id) return;
    fetch('/api/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: id })
    }).catch(() => undefined);
  }, [id]);

  if (videoQuery.isLoading) {
    return <p className="text-sm text-slate-400">Loading video...</p>;
  }

  if (videoQuery.error) {
    return <p className="text-sm text-red-400">{(videoQuery.error as Error).message}</p>;
  }

  const video = videoQuery.data!;

  return (
    <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/80 shadow-lg">
          <video
            src={video.videoUrl}
            poster={video.posterUrl}
            controls
            className="h-full w-full"
          />
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-white">{video.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <span>{video.channelName}</span>
            <span>•</span>
            <span>{video.views} views</span>
            <span>•</span>
            <span>{new Date(video.createdAt).toLocaleDateString()}</span>
            <LikeButton videoId={video.id} />
          </div>
          <div className="space-y-2 rounded-xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-200 backdrop-blur">
            <p className="whitespace-pre-wrap">{video.description}</p>
            <div className="flex flex-wrap gap-2 text-xs text-slate-300">
              {video.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 px-2 py-0.5">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <CommentList videoId={video.id} />
      </div>
      <aside className="space-y-4">
        <h2 className="text-sm font-semibold text-white">Recommended</h2>
        <div className="space-y-4">
          {relatedQuery.data?.map((item) => (
            <VideoCard key={item.id} video={item} />
          ))}
        </div>
      </aside>
    </div>
  );
}
