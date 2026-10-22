import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { websiteUrl } from "@/lib/api";

/**
 * One staff console for website and app: the website's /admin.
 * Every /admin/... page in the app forwards there.
 */
export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Giftnify" }, { name: "robots", content: "noindex" }] }),
  component: AdminRedirect,
});

function AdminRedirect() {
  useEffect(() => {
    const sub = window.location.pathname.replace(/^\/admin\/?/, "");
    window.location.replace(websiteUrl(`/admin${sub ? `/${sub}` : ""}`));
  }, []);
  return <p className="p-8 text-center text-sm text-muted-foreground">Opening the Giftnify admin…</p>;
}
