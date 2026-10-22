import { getMe, websiteUrl } from "./api";

export type StaffRole = "admin" | "support" | "finance" | "user";

/** Staff tools live on the website's console (one admin for website and app). */
export const ADMIN_URL = websiteUrl("/admin");

export async function getMyRoles(): Promise<StaffRole[]> {
  const me = await getMe().catch(() => null);
  return me ? [me.role as StaffRole] : [];
}
