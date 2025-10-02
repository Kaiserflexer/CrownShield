import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface CommentRecord {
  id: string;
  videoId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface CommentListProps {
  videoId: string;
}

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    },
    credentials: 'include'
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error ?? 'Failed to load comments');
  }
  return (await response.json()) as T;
}

export default function CommentList({ videoId }: CommentListProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['comments', videoId],
    queryFn: () => request<{ comments: CommentRecord[] }>(`/api/comments?videoId=${videoId}`)
  });

  const createComment = useMutation({
    mutationFn: () =>
      request<{ comment: CommentRecord }>(`/api/comments`, {
        method: 'POST',
        body: JSON.stringify({ videoId, content })
      }),
    onSuccess: () => {
      setContent('');
      return queryClient.invalidateQueries({ queryKey: ['comments', videoId] });
    }
  });

  const deleteComment = useMutation({
    mutationFn: (commentId: string) =>
      request(`/api/comments/${commentId}`, {
        method: 'DELETE'
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', videoId] })
  });

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Comments ({data?.comments.length ?? 0})
        </h2>
      </header>
      {user && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!content.trim()) return;
            createComment.mutate();
          }}
          className="space-y-2"
        >
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Share your thoughts"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            disabled={createComment.isPending}
          >
            {createComment.isPending ? 'Posting...' : 'Post comment'}
          </button>
        </form>
      )}
      {isLoading && <p className="text-sm text-slate-400">Loading comments...</p>}
      {error && <p className="text-sm text-red-400">{(error as Error).message}</p>}
      <ul className="space-y-4">
        {data?.comments.map((comment) => (
          <li key={comment.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{comment.authorName}</p>
                <p className="text-xs text-slate-500">
                  {new Date(comment.createdAt).toLocaleString()}
                </p>
              </div>
              {user?.id === comment.authorId && (
                <button
                  onClick={() => deleteComment.mutate(comment.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Delete
                </button>
              )}
            </div>
            <p className="mt-3 text-sm text-slate-200 whitespace-pre-wrap">{comment.content}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
