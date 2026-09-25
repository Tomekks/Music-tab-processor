declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, string>) => void;
    };
  }
}

// For client-side-routed <Link>s (song switching, home nav): Umami's own
// data-umami-event attribute intercepts <a> clicks with preventDefault and
// sets location.href itself once the beacon sends, which fights Next.js's
// router and forces a full reload instead of a soft navigation. Calling
// track() directly from onClick (no preventDefault of our own) sidesteps
// that -- Next's handler still owns the navigation. Buttons that don't
// navigate are unaffected and use data-umami-event directly.
export function trackEvent(name: string, data?: Record<string, string>) {
  window.umami?.track(name, data);
}
