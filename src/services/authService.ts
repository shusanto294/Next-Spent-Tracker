import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface UserData {
  id: string;
  name: string;
  email: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  createdAt: Date;
}

export async function registerUser(name: string, email: string, password: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user document in Firestore
    const userData: UserData = {
      id: user.uid,
      name,
      email,
      currency: 'USD',
      currencySymbol: '$',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      createdAt: new Date(),
    };

    await setDoc(doc(db, 'users', user.uid), userData);

    return { user: userData };
  } catch (error: any) {
    throw new Error(error.message || 'Registration failed');
  }
}

export async function loginUser(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (!userDoc.exists()) {
      throw new Error('User data not found');
    }

    return { user: userDoc.data() as UserData };
  } catch (error: any) {
    throw new Error(error.message || 'Login failed');
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error: any) {
    throw new Error(error.message || 'Logout failed');
  }
}

export async function getCurrentUser(): Promise<UserData | null> {
  const user = auth.currentUser;

  if (!user) {
    return null;
  }

  const userDoc = await getDoc(doc(db, 'users', user.uid));

  if (!userDoc.exists()) {
    return null;
  }

  return userDoc.data() as UserData;
}
