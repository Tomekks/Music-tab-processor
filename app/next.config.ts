import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@guitar-tabs/design-system"],
  // /archytechy -- an unlisted, secret-link-only static page
  // (app/public/archytechy/index.html, the single copy since 2026-09-20 --
  // the old docs/patch-bay/index.html duplicate was deleted). Next.js serves
  // public/ files at their exact path (public/archytechy/index.html works as
  // /archytechy/index.html on its own) but doesn't resolve a directory
  // request to its index.html the way a plain static host would -- these
  // rewrites make /archytechy and /archytechy/ (no filename) work too, since
  // that's the URL actually being shared. Single copy -- edit
  // app/public/archytechy/index.html directly, no sync step.
  async rewrites() {
    return [
      { source: "/archytechy", destination: "/archytechy/index.html" },
      { source: "/archytechy/", destination: "/archytechy/index.html" },
    ];
  },
};

export default nextConfig;
