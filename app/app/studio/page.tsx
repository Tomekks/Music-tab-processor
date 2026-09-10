import { redirect } from "next/navigation";

// /studio was this app's real address during the redesign (see
// app/status/home-page.md) -- it's been promoted to "/" itself, so this now just
// forwards anyone with the old link/bookmark instead of 404ing.
export default function StudioRedirect() {
  redirect("/");
}
