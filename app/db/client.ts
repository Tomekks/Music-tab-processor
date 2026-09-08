import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// Server-side only. TURSO_DATABASE_URL / TURSO_AUTH_TOKEN must never be
// prefixed NEXT_PUBLIC_ -- that would bundle them into client-side JS.
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const db = drizzle(client, { schema });
