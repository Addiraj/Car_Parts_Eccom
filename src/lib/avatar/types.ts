export type AvatarProviderId = "simli";

export type AvatarProviderRow = {
  id: string;
  provider: AvatarProviderId;
  face_id: string | null;
  voice_id: string | null;
  model: "trinity" | "legacy" | null;
  avatar_image_url: string | null;
  avatar_image_path: string | null;
  is_default: boolean;
  is_enabled: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ActiveAvatarConfig = {
  provider: AvatarProviderId;
  faceId: string | null;
  voiceId: string | null;
  model: "trinity" | "legacy" | null;
  imageUrl: string | null;
};
