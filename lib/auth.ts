import crypto from 'crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE = 'mural_admin';

export function adminToken() {
  return crypto.createHash('sha256').update('mural:' + (process.env.ADMIN_PASSWORD || '')).digest('hex');
}

export async function isAdmin() {
  if (!process.env.ADMIN_PASSWORD) return false;
  const c = await cookies();
  return c.get(ADMIN_COOKIE)?.value === adminToken();
}
