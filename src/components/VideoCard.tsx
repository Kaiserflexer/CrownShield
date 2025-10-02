import { Link } from 'react-router-dom';
import type { VideoRecord } from '../../api/_lib/types';

export interface VideoCardProps {
  video: VideoRecord;
}

export default function VideoCard({ video }: VideoCardProps) {
  return (
    <Link
      to={`/watch/${video.id}`}
      className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-950/70 transition hover:border-brand/60 backdrop-blur"
    >
      <div className="relative aspect-video overflow-hidden rounded-t-xl">
        <img src={video.posterUrl} alt={video.title} className="h-full w-full object-cover" />
        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-xs text-white">
          {formatDuration(video.duration)}
        </span>
      </div>
      <div className="space-y-2 px-4 pb-4">
        <h3 className="text-sm font-semibold text-white line-clamp-2">{video.title}</h3>
        <p className="text-xs text-slate-300">{video.channelName}</p>
        <p className="text-xs text-slate-400">
          {video.views} views · {new Date(video.createdAt).toLocaleDateString()}
        </p>
        <div className="flex flex-wrap gap-1 text-[11px] text-slate-300">
          {video.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-white/10 px-2 py-0.5">
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
