import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';

interface LikeResponse {
  likes: number;
  liked: boolean;
}

export default function LikeButton({ videoId }: { videoId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['likes', videoId],
    queryFn: async () => {
      const response = await fetch(`/api/likes?videoId=${videoId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to load likes');
      }
      return (await response.json()) as LikeResponse;
    }
  });

  const toggle = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ videoId })
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? 'Unable to like video');
      }
      return (await response.json()) as LikeResponse;
    },
    onSuccess: (result) => {
      queryClient.setQueryData<LikeResponse>(['likes', videoId], result);
    }
  });

  return (
    <button
      disabled={!user || toggle.isPending}
      onClick={() => toggle.mutate()}
      className={clsx(
        'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition backdrop-blur',
        data?.liked
          ? 'border-brand/40 bg-brand/20 text-brand'
          : 'border-white/10 bg-white/10 text-slate-200 hover:border-brand'
      )}
    >
      <span>{data?.liked ? '♥' : '♡'}</span>
      <span>{data?.likes ?? 0}</span>
    </button>
  );
}
