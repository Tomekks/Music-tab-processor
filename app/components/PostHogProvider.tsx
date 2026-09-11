"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (posthogKey && !posthog.__loaded) {
  posthog.init(posthogKey, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    autocapture: false,
    capture_pageleave: false,
    capture_pageview: false,
    capture_exceptions: true, // unhandled JS errors only -- distinct from
    // autocapture (clicks) and session recording, both of which stay off
    disable_session_recording: true,
    person_profiles: "identified_only",
    persistence: "memory",
  });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!posthogKey || !pathname) return;

    posthog.capture("$pageview", {
      $current_url: `${window.location.origin}${pathname}`,
    });
  }, [pathname]);

  return children;
}
