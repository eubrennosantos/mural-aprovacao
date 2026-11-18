import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminToken } from '@/lib/auth';

export async function POST(req: Request) {
  const form = await req.formData();
  const pw = String(form.get('password') || '');
  if (process.env.ADMIN_PASSWORD && pw === process.env.ADMIN_PASSWORD) {
    const res = NextResponse.redirect(new URL('/admin', req.url), 303);
    res.cookies.set(ADMIN_COOKIE, adminToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  }
  return NextResponse.redirect(new URL('/admin/login?e=1', req.url), 303);
}
