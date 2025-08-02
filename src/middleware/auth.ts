import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

export function getTokenFromRequest(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  return token;
}

export function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!);
    return decoded as { userId: string; email: string };
  } catch (error) {
    return null;
  }
}

export function getUserFromRequest(req: NextRequest) {
  const token = getTokenFromRequest(req);
  console.log('Token from request:', token ? 'Found' : 'Not found');
  if (!token) return null;
  
  const user = verifyToken(token);
  console.log('User from token verification:', user ? { userId: user.userId, email: user.email } : 'Invalid token');
  return user;
}