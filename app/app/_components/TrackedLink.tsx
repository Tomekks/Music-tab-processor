"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { trackEvent } from "@/lib/analytics";

// Thin client wrapper so server components (SongListRow, AppHeader) can keep
// a Link with a click-tracking side effect without becoming client
// components themselves. Calls track() directly rather than the
// data-umami-event attribute -- see lib/analytics.ts for why that attribute
// fights Next's own client-side routing on these Links.
export function TrackedLink({
  event,
  eventData,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { event: string; eventData?: Record<string, string> }) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        onClick?.(e);
        trackEvent(event, eventData);
      }}
    />
  );
}
