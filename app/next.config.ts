import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // /archytechy -- an unlisted, secret-link-only static page (docs/patch-bay/
  // index.html, copied verbatim into public/archytechy/). Next.js serves
  // public/ files at their exact path (public/archytechy/index.html works as
  // /archytechy/index.html on its own) but doesn't resolve a directory
  // request to its index.html the way a plain static host would -- these
  // rewrites make /archytechy and /archytechy/ (no filename) work too, since
  // that's the URL actually being shared. Manually synced with
  // docs/patch-bay/index.html -- update both if either changes, same
  // convention as docs/backlog-board/index.html <-> docs/BACKLOG.md.
  async rewrites() {
    return [
      { source: "/archytechy", destination: "/archytechy/index.html" },
      { source: "/archytechy/", destination: "/archytechy/index.html" },
    ];
  },
};

export default nextConfig;
