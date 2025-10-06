import { NextResponse } from 'next/server';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export async function POST() {
  try {
    // Sign out from Firebase
    await signOut(auth);

    const response = NextResponse.json({ message: 'Logout successful' }, { status: 200 });

    // Clear the Firebase token cookie
    response.cookies.set('firebaseToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
    });

    return response;
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: error.message || 'Logout failed' }, { status: 500 });
  }
}