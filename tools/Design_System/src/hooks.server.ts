import type { Handle } from "@sveltejs/kit";
import { ALLOWED_HOSTS } from "./lib/server/config.ts";
import { isRequestAllowed } from "./lib/server/origin.ts";

export const handle: Handle = async ({ event, resolve }) => {
  const allowed = isRequestAllowed(
    event.request.method,
    event.request.headers.get("host"),
    event.request.headers.get("origin"),
    ALLOWED_HOSTS
  );
  if (!allowed) return new Response("Forbidden", { status: 403 });
  return resolve(event);
};
