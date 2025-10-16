interface FlagConfig {
  spotifyEnabled: boolean;
  authReady: boolean;
  apiReady: boolean;
}

const normalize = (value: string | undefined, fallback: boolean): boolean => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

const flags: FlagConfig = {
  spotifyEnabled: normalize(import.meta.env.PUBLIC_FLAG_SPOTIFY_ENABLED, false),
  authReady: normalize(import.meta.env.PUBLIC_FLAG_AUTH_READY, false),
  apiReady: normalize(import.meta.env.PUBLIC_FLAG_API_READY, false)
};

export const isSpotifyEnabled = (): boolean => flags.spotifyEnabled;
export const isAuthReady = (): boolean => flags.authReady;
export const isApiReady = (): boolean => flags.apiReady;

export default flags;
