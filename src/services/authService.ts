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
    console.log('🔐 Registering user:', email);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('✅ User created in Firebase Auth:', user.uid);

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

    console.log('💾 Creating user document in Firestore...');
    await setDoc(doc(db, 'users', user.uid), userData);
    console.log('✅ User document created successfully');

    return { user: userData };
  } catch (error: any) {
    console.error('❌ Registration error:', error.code, error.message);
    throw new Error(error.message || 'Registration failed');
  }
}

export async function loginUser(email: string, password: string) {
  try {
    console.log('🔐 Logging in user:', email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log('✅ User authenticated:', user.uid);

    // Get user data from Firestore
    console.log('📄 Fetching user document from Firestore...');
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (!userDoc.exists()) {
      console.error('❌ User document not found in Firestore');
      throw new Error('User data not found');
    }

    console.log('✅ User data retrieved successfully');
    return { user: userDoc.data() as UserData };
  } catch (error: any) {
    console.error('❌ Login error:', error.code, error.message);

    // Provide more helpful error messages
    if (error.code === 'auth/invalid-credential') {
      throw new Error('Invalid email or password. Please check your credentials and try again.');
    } else if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email. Please register first.');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Incorrect password. Please try again.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed login attempts. Please try again later.');
    }

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
