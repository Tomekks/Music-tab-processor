import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

// One row per processed song. Notes are stored as a JSON blob (matching
// contracts/tab.schema.json's "notes" array shape) rather than normalized
// into a separate table -- a tab is always read/written as one unit, never
// queried at the individual-note level, so normalizing would add complexity
// with no real benefit at this project's size.
//
// Only tab data lives here -- never audio, stems, or MIDI (same copyright
// reasoning as the rest of the project: this is a derivative-work text
// representation, not a reproduction of the recording).
export const songs = sqliteTable("songs", {
  id: text("id").primaryKey(), // the pipeline run-id (e.g. "mister-sandman-20260907-161918")
  title: text("title").notNull(),
  artist: text("artist"),
  tempoBpm: real("tempo_bpm").notNull(),
  tuning: text("tuning", { mode: "json" }).$type<number[]>().notNull(),
  notes: text("notes", { mode: "json" })
    .$type<{ string: number; fret: number; startTimeSec: number; durationSec: number }[]>()
    .notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
