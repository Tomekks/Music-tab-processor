// Spotify Web API integration -- read-only public catalog lookups (track
// search, album art, canonical artist name) via the Client Credentials flow
// (https://developer.spotify.com/documentation/web-api; no per-user login
// needed, this app never touches a listener's own Spotify account).
//
// Deliberately safe to call with no credentials configured: SPOTIFY_CLIENT_ID/
// SPOTIFY_CLIENT_SECRET are unset today (see app/.env.example) -- every export
// here short-circuits to null before making any network call in that case.
// Once a token exists, nothing else needs to change; this file activates
// itself. Callers must always treat a null return as "fall back to today's
// placeholder," never as an error to surface.

let cachedToken: { value: string; expiresAt: number } | null = null;

function hasCredentials(): boolean {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

async function getAccessToken(): Promise<string | null> {
  if (!hasCredentials()) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  let res: Response;
  try {
    const basic = Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
    res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    });
  } catch {
    return null; // network failure -- degrade silently, never block page render
  }
  if (!res.ok) return null;

  const data = (await res.json()) as { access_token: string; expires_in: number };
  // Refresh a minute early so a request never races an about-to-expire token.
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.value;
}

export type SpotifyTrackMetadata = {
  coverArtUrl: string;
  durationMs: number;
  artist: string;
};

/**
 * Looks up a track by title (+ optional artist, which sharpens the search)
 * and returns its cover art, duration, and canonical artist name -- or null
 * if no token is configured, the search finds nothing, or the request fails
 * for any reason. Never throws.
 */
export async function getTrackMetadata(title: string, artist: string | null): Promise<SpotifyTrackMetadata | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const q = artist ? `track:${title} artist:${artist}` : title;
  let res: Response;
  try {
    res = await fetch(`https://api.spotify.com/v1/search?type=track&limit=1&q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const data = await res.json();
  const track = data?.tracks?.items?.[0];
  if (!track) return null;

  return {
    coverArtUrl: track.album?.images?.[0]?.url ?? "",
    durationMs: track.duration_ms ?? 0,
    artist: track.artists?.[0]?.name ?? artist ?? "",
  };
}
