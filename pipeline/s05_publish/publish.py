"""
pipeline/s05_publish -- the "Mac writes a row" mechanism from DECISIONS.md.
Takes a finished run's tab.json + metadata.json and upserts it into the
Turso database's songs table (schema owned by app/src/db/schema.ts).

Only tab data goes here -- never audio, stems, or MIDI (same copyright
reasoning as everywhere else in this project).
"""
import argparse
import json
import time
from pathlib import Path

import libsql_client
import requests

REPO_ROOT = Path(__file__).resolve().parents[2]


def _load_env():
    """Minimal .env.local parser -- avoids a new dependency for two lines."""
    env = {}
    env_path = REPO_ROOT / ".env.local"
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        env[key.strip()] = value.strip()
    return env


def _get_spotify_track_metadata(title, artist, env):
    """Client Credentials lookup, same logic as app/lib/spotify.ts's
    getTrackMetadata -- ported to Python since this now runs at publish
    time instead of live on every page request. Returns
    (cover_art_url, spotify_artist, spotify_url), all None if no
    credentials are configured, nothing matched, or any request fails --
    never raises, same degrade-gracefully rule as the TS version had."""
    client_id = env.get("SPOTIFY_CLIENT_ID")
    client_secret = env.get("SPOTIFY_CLIENT_SECRET")
    if not client_id or not client_secret:
        return None, None, None

    try:
        token_res = requests.post(
            "https://accounts.spotify.com/api/token",
            auth=(client_id, client_secret),
            data={"grant_type": "client_credentials"},
            timeout=10,
        )
        if not token_res.ok:
            return None, None, None
        token = token_res.json()["access_token"]

        query = f"track:{title} artist:{artist}" if artist else title
        search_res = requests.get(
            "https://api.spotify.com/v1/search",
            params={"type": "track", "limit": 1, "q": query},
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        if not search_res.ok:
            return None, None, None
        items = search_res.json().get("tracks", {}).get("items", [])
        if not items:
            return None, None, None
        track = items[0]

        images = track.get("album", {}).get("images", [])
        cover_art_url = images[0]["url"] if images else None
        spotify_artist = track.get("artists", [{}])[0].get("name") or artist
        spotify_url = track.get("external_urls", {}).get("spotify")
        return cover_art_url, spotify_artist, spotify_url
    except requests.RequestException:
        return None, None, None


def publish(run_dir):
    """Upserts a run's tab.json into the songs table.

    Args:
        run_dir (str or Path): a run directory with tab.json and metadata.json.

    Returns:
        str: the run-id (used as the songs.id primary key).

    Raises:
        FileNotFoundError: no tab.json in run_dir.
    """
    run_dir = Path(run_dir)
    tab_path = run_dir / "tab.json"
    if not tab_path.is_file():
        raise FileNotFoundError(f"No tab.json in {run_dir} -- run s04_tab first.")

    tab_data = json.load(open(tab_path))
    metadata = json.load(open(run_dir / "metadata.json")) if (run_dir / "metadata.json").is_file() else {}
    run_id = metadata.get("runId", run_dir.name)

    env = _load_env()
    cover_art_url, spotify_artist, spotify_url = _get_spotify_track_metadata(
        tab_data["title"], tab_data.get("artist"), env  # artist from Task 0's ingest/tab capture, may still be None for older runs
    )

    client = libsql_client.create_client_sync(
        url=env["TURSO_DATABASE_URL"].replace("libsql://", "https://"),
        auth_token=env["TURSO_AUTH_TOKEN"],
    )
    try:
        client.execute(
            """
            INSERT INTO songs (id, title, artist, tempo_bpm, tuning, notes, created_at, cover_art_url, spotify_artist, spotify_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title=excluded.title, artist=excluded.artist, tempo_bpm=excluded.tempo_bpm,
                tuning=excluded.tuning, notes=excluded.notes, cover_art_url=excluded.cover_art_url,
                spotify_artist=excluded.spotify_artist, spotify_url=excluded.spotify_url
            """,
            [
                run_id,
                tab_data["title"],
                tab_data.get("artist"),  # from Task 0's ingest/tab capture, may still be None for older runs
                tab_data["tempoBpm"],
                json.dumps(tab_data["tuning"]),
                json.dumps(tab_data["notes"]),
                int(time.time()),
                cover_art_url,
                spotify_artist,
                spotify_url,
            ],
        )
    finally:
        client.close()

    return run_id


def main():
    parser = argparse.ArgumentParser(description="Publish a run's tab.json to the Turso database.")
    parser.add_argument("run_dir", help="Path to a run directory set up by s01-s04")
    args = parser.parse_args()

    run_id = publish(args.run_dir)
    print(f"Published: {run_id}")


if __name__ == "__main__":
    main()
