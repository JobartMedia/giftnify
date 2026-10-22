import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getMe } from "@/lib/api";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const user = await getMe().catch(() => null);
    if (!user) throw redirect({ to: "/auth", search: { redirect: location.href } });
    return { user };
  },
  component: () => <Outlet />,
});
