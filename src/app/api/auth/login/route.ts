import { NextRequest, NextResponse } from 'next/server';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (!userDoc.exists()) {
        return NextResponse.json({ error: 'User data not found' }, { status: 404 });
      }

      const userData = userDoc.data();

      // Get Firebase ID token to use as session token
      const idToken = await user.getIdToken();

      const response = NextResponse.json(
        {
          message: 'Login successful',
          user: {
            id: user.uid,
            name: userData.name || `${userData.firstName} ${userData.lastName}`,
            email: user.email,
          },
        },
        { status: 200 }
      );

      // Store Firebase ID token in cookie for session management
      response.cookies.set('firebaseToken', idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return response;
    } catch (firebaseError: any) {
      console.error('Firebase login error:', firebaseError);
      if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      throw firebaseError;
    }
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}