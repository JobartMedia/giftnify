import { createFileRoute } from "@tanstack/react-router";

// Handled by the website's admin (see ./route.tsx).
export const Route = createFileRoute("/_authenticated/admin/gifts")({ component: () => null });
