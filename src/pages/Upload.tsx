import axios from 'axios';
import { FormEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface UploadResponse {
  uploadUrl: string;
  uploadToken: string;
  blobPath: string;
  publicUrl: string | null;
  maximumSizeInBytes: number;
}

interface VideoResponse {
  video: {
    id: string;
  };
}

async function requestUpload(payload: {
  filename: string;
  contentType: string;
  resource: 'video' | 'poster';
}): Promise<UploadResponse> {
  const response = await fetch('/api/upload/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error ?? 'Failed to prepare upload');
  }
  return (await response.json()) as UploadResponse;
}

async function createVideo(payload: {
  title: string;
  description: string;
  tags: string[];
  videoUrl: string;
  posterUrl: string;
  duration: number;
}): Promise<VideoResponse> {
  const response = await fetch('/api/videos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error ?? 'Failed to save video metadata');
  }
  return (await response.json()) as VideoResponse;
}

export default function Upload() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string>('');
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [uploadLimit, setUploadLimit] = useState<number | null>(null);

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== 'video/mp4') {
      setError('Only MP4 files are supported.');
      return;
    }
    setError(null);
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
    setPosterPreview('');
  };

  const capturePoster = async () => {
    const videoElement = videoRef.current;
    const canvas = canvasRef.current;
    if (!videoElement || !canvas) return;
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    setPosterPreview(dataUrl);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!videoFile) {
      setError('Select a video to upload.');
      return;
    }
    if (!posterPreview) {
      setError('Capture a poster from the video.');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      const videoUpload = await requestUpload({
        filename: videoFile.name,
        contentType: videoFile.type,
        resource: 'video'
      });
      setUploadLimit(videoUpload.maximumSizeInBytes);
      if (videoFile.size > videoUpload.maximumSizeInBytes) {
        throw new Error('Selected file exceeds the configured upload size.');
      }

      const videoUploadResult = await axios.put<{ url?: string; pathname?: string }>(
        videoUpload.uploadUrl,
        videoFile,
        {
          headers: {
            'Content-Type': videoFile.type,
            Authorization: `Bearer ${videoUpload.uploadToken}`
          },
          onUploadProgress: (event) => {
            if (event.total) {
              setProgress(Math.round((event.loaded / event.total) * 100));
            }
          }
        }
      );

      const posterBlob = await (await fetch(posterPreview)).blob();
      const posterUpload = await requestUpload({
        filename: `${videoFile.name.replace(/\.mp4$/i, '')}-poster.png`,
        contentType: 'image/png',
        resource: 'poster'
      });
      if (posterBlob.size > posterUpload.maximumSizeInBytes) {
        throw new Error('Poster image exceeds the configured upload size.');
      }

      const posterResponse = await fetch(posterUpload.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/png',
          Authorization: `Bearer ${posterUpload.uploadToken}`
        },
        body: posterBlob
      });
      if (!posterResponse.ok) {
        const errorText = await posterResponse.text();
        throw new Error(errorText || 'Poster upload failed');
      }
      const posterResult = (await posterResponse.json()) as { url?: string; pathname?: string };

      const resolveUrl = (result: UploadResponse, fallbackUrl?: string) =>
        result.publicUrl ?? fallbackUrl ?? new URL(result.blobPath, window.location.origin + '/').toString();

      const payload = await createVideo({
        title,
        description,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        videoUrl: resolveUrl(videoUpload, videoUploadResult.data?.url),
        posterUrl: resolveUrl(posterUpload, posterResult.url),
        duration
      });

      navigate(`/watch/${payload.video.id}`);
    } catch (uploadError) {
      setError((uploadError as Error).message);
    } finally {
      setSubmitting(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Upload new video</h1>
        <p className="text-sm text-slate-400">
          Share your latest creation with the CrownShield community. Hi {user?.displayName}!
        </p>
      </header>
      <form onSubmit={handleSubmit} className="space-y-6">
        {uploadLimit && (
          <p className="text-sm text-slate-400">Maximum file size: {(uploadLimit / (1024 * 1024)).toFixed(0)} MB</p>
        )}
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-200">Video file</span>
              <input
                type="file"
                accept="video/mp4"
                onChange={handleVideoChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              />
            </label>
            {videoPreview && (
              <div className="space-y-3">
                <video
                  ref={videoRef}
                  src={videoPreview}
                  controls
                  onLoadedMetadata={(event) => setDuration((event.target as HTMLVideoElement).duration)}
                  className="w-full rounded-xl border border-slate-800"
                />
                <button
                  type="button"
                  onClick={capturePoster}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
                >
                  Capture poster
                </button>
                {posterPreview && (
                  <img
                    src={posterPreview}
                    alt="Poster preview"
                    className="w-full rounded-xl border border-slate-800"
                  />
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}
          </div>
          <aside className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-200">Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-200">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-200">Tags (comma separated)</span>
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </label>
            {progress > 0 && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Uploading</span>
                  <span className="text-slate-400">{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-brand"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Publishing...' : 'Publish video'}
            </button>
          </aside>
        </div>
      </form>
    </div>
  );
}
