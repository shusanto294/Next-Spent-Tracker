import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/middleware/auth';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    console.log('GET settings - User from token:', user);

    if (!user) {
      console.log('GET settings - No user found, unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('GET settings - Looking for user with ID:', user.userId);

    const userDoc = await adminDb.collection('users').doc(user.userId).get();
    console.log('GET settings - Found user doc:', userDoc.exists);

    if (!userDoc.exists) {
      console.log('GET settings - User document not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const response = {
      firstName: userData?.firstName,
      lastName: userData?.lastName,
      currency: userData?.currency,
      currencySymbol: userData?.currencySymbol,
      timezone: userData?.timezone,
      country: userData?.country,
    };

    console.log('GET settings - Returning response:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { firstName, lastName, currency, currencySymbol, timezone, country } = await req.json();

    console.log('Update request data:', { firstName, lastName, currency, currencySymbol, timezone, country });
    console.log('User ID:', user.userId);

    if (!firstName || !lastName || !currency || !currencySymbol || !timezone || !country) {
      return NextResponse.json({ error: 'First name, last name, currency, currency symbol, timezone, and country are required' }, { status: 400 });
    }

    // Check if user exists
    const userDoc = await adminDb.collection('users').doc(user.userId).get();
    if (!userDoc.exists) {
      console.log('User not found with ID:', user.userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const existingUserData = userDoc.data();
    console.log('Existing user before update:', {
      firstName: existingUserData?.firstName,
      lastName: existingUserData?.lastName,
      currency: existingUserData?.currency,
      currencySymbol: existingUserData?.currencySymbol,
      timezone: existingUserData?.timezone,
      country: existingUserData?.country,
    });

    // Update the user
    const updatedData = {
      firstName,
      lastName,
      currency,
      currencySymbol,
      timezone,
      country
    };

    await adminDb.collection('users').doc(user.userId).update(updatedData);

    console.log('User saved successfully:', updatedData);

    return NextResponse.json(updatedData);
  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json({ error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}