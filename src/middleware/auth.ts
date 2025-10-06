import { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';

export function getTokenFromRequest(req: NextRequest) {
  const token = req.cookies.get('firebaseToken')?.value;
  return token;
}

export async function verifyToken(token: string) {
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return { userId: decodedToken.uid, email: decodedToken.email || '' };
  } catch (error) {
    return null;
  }
}

export async function getUserFromRequest(req: NextRequest) {
  const token = getTokenFromRequest(req);
  console.log('Token from request:', token ? 'Found' : 'Not found');
  if (!token) return null;

  const user = await verifyToken(token);
  console.log('User from token verification:', user ? { userId: user.userId, email: user.email } : 'Invalid token');
  return user;
}