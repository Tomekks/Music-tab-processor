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
    client = libsql_client.create_client_sync(
        url=env["TURSO_DATABASE_URL"].replace("libsql://", "https://"),
        auth_token=env["TURSO_AUTH_TOKEN"],
    )
    try:
        client.execute(
            """
            INSERT INTO songs (id, title, artist, tempo_bpm, tuning, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title=excluded.title, artist=excluded.artist, tempo_bpm=excluded.tempo_bpm,
                tuning=excluded.tuning, notes=excluded.notes
            """,
            [
                run_id,
                tab_data["title"],
                None,  # artist -- not captured anywhere in the pipeline yet
                tab_data["tempoBpm"],
                json.dumps(tab_data["tuning"]),
                json.dumps(tab_data["notes"]),
                int(time.time()),
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
