import { NextRequest } from 'next/server';
import { adminAuth } from './firebaseAdmin';

export async function verifyAuth(req: NextRequest): Promise<{ userId: string; email: string } | null> {
  try {
    // Get token from cookie
    const token = req.cookies.get('firebaseToken')?.value;

    if (!token) {
      return null;
    }

    // Verify the Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(token);

    return {
      userId: decodedToken.uid,
      email: decodedToken.email || '',
    };
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
}
