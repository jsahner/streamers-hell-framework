export interface IExtensionJWT {
  channel_id: string;
  exp: number;
  is_unlinked?: boolean;
  opaque_user_id: string;
  pubsub_perms: { listen?: string[]; send?: string[] };
  role: "broadcaster" | "moderator" | "viewer";
  user_id?: string;
}

export interface IJWT {
  channel_id: string;
  exp: number;
  is_unlinked?: boolean;
  opaque_user_id?: string;
  pubsub_perms: { listen?: string[]; send?: string[] };
  role: "broadcaster" | "moderator" | "viewer" | "external";
  user_id?: string;
}

export interface ITwitchAuth {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string[];
  token_type: "bearer";
}

export interface ITwitchChannel {
  _id: string;
  broadcaster_language: string;
  broadcaster_type: string;
  created_at: string;
  description: string;
  display_name: string;
  email: string;
  followers: number;
  game: string;
  language: string;
  logo: string;
  mature: boolean;
  name: string;
  partner: boolean;
  profile_banner?: any;
  profile_banner_background_color?: any;
  status: string;
  stream_key: string;
  updated_at: string;
  url: string;
  video_banner: string;
  views: number;
}

export interface ITwitchUser {
  _id: number;
  bio: string;
  created_at: string;
  display_name: string;
  email: string;
  email_verified: boolean;
  logo: string;
  name: string;
  notifications: ITwitchUserNotifications;
  partnered: boolean;
  twitter_connected: boolean;
  type: string;
  updated_at: string;
}

export interface ITwitchUserNotifications {
  email: boolean;
  push: boolean;
}
