export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
  displayName: string;
}

export interface VideoRecord {
  id: string;
  title: string;
  description: string;
  tags: string[];
  videoUrl: string;
  posterUrl: string;
  duration: number;
  channelId: string;
  channelName: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  likes: number;
}

export interface CommentRecord {
  id: string;
  videoId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface LikeRecord {
  id: string;
  videoId: string;
  userId: string;
  createdAt: string;
}

export interface ViewRecord {
  id: string;
  videoId: string;
  ip: string;
  createdAt: string;
}

export interface CatalogIndex {
  videos: VideoRecord[];
}

export interface RateLimitBucket {
  ip: string;
  key: string;
  timestamps: number[];
}

export interface DatasetState {
  users: UserRecord[];
  videos: VideoRecord[];
  comments: CommentRecord[];
  likes: LikeRecord[];
  views: ViewRecord[];
  catalog: CatalogIndex;
  ratelimits: RateLimitBucket[];
}
