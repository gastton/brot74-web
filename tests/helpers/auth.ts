import { signToken } from "@/lib/auth";

export async function adminCookieHeader(): Promise<{ cookie: string }> {
  const token = await signToken({ admin: true });
  return { cookie: `admin_token=${token}` };
}
