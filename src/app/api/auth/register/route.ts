import { NextRequest, NextResponse } from 'next/server';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { currencies } from '@/lib/countryDefaults';

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, password, country, currency, timezone } = await req.json();

    console.log('Registration request:', { firstName, lastName, email, country, currency, timezone });

    if (!firstName || !lastName || !email || !password || !country || !currency || !timezone) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check if user already exists
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const currencyObj = currencies.find(c => c.code === currency);
      const currencySymbol = currencyObj ? currencyObj.symbol : '$';

      const userData = {
        id: user.uid,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email,
        country,
        currency,
        currencySymbol,
        timezone,
        createdAt: new Date(),
      };

      console.log('Creating user with data:', userData);

      await setDoc(doc(db, 'users', user.uid), userData);

      console.log('User created successfully:', {
        id: user.uid,
        firstName,
        lastName,
        country,
        currency,
        currencySymbol,
        timezone,
      });

      return NextResponse.json({ message: 'User created successfully', userId: user.uid }, { status: 201 });
    } catch (firebaseError: any) {
      if (firebaseError.code === 'auth/email-already-in-use') {
        return NextResponse.json({ error: 'User already exists' }, { status: 400 });
      }
      throw firebaseError;
    }
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}