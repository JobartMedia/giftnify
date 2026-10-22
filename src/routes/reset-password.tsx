import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell, Logo } from "@/components/giftnify/ui";
import { websiteUrl } from "@/lib/api";

/** Password reset links are handled by the website (one account for both). */
export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Choose a new password — Giftnify" }, { name: "robots", content: "noindex" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const target = websiteUrl("/forgot-password");
  useEffect(() => { window.location.replace(target); }, [target]);
  return (
    <AppShell nav={false}>
      <div className="pt-6"><Logo /></div>
      <h1 className="mt-10 text-[32px] font-extrabold leading-tight">Choose a new password.</h1>
      <p className="mt-4 text-muted-foreground">Taking you to the reset page… <a className="font-bold text-primary" href={target}>Continue</a></p>
    </AppShell>
  );
}
