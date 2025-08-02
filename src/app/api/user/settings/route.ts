import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getUserFromRequest } from '@/middleware/auth';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    console.log('GET settings - User from token:', user);
    
    if (!user) {
      console.log('GET settings - No user found, unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    console.log('GET settings - Looking for user with ID:', user.userId);
    
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(user.userId);
    } catch (error) {
      console.error('Error converting userId to ObjectId:', error);
    }
    
    const userDoc = await User.findOne({
      $or: [
        { _id: userObjectId },
        { _id: user.userId }
      ]
    }).select('firstName lastName currency currencySymbol timezone country');
    console.log('GET settings - Found user doc:', userDoc);
    
    if (!userDoc) {
      console.log('GET settings - User document not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const response = {
      firstName: userDoc.firstName,
      lastName: userDoc.lastName,
      currency: userDoc.currency,
      currencySymbol: userDoc.currencySymbol,
      timezone: userDoc.timezone,
      country: userDoc.country,
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
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { firstName, lastName, currency, currencySymbol, timezone, country } = await req.json();
    
    console.log('Update request data:', { firstName, lastName, currency, currencySymbol, timezone, country });
    console.log('User ID:', user.userId);
    
    if (!firstName || !lastName || !currency || !currencySymbol || !timezone || !country) {
      return NextResponse.json({ error: 'First name, last name, currency, currency symbol, timezone, and country are required' }, { status: 400 });
    }

    // First check if user exists
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(user.userId);
    } catch (error) {
      console.error('Error converting userId to ObjectId:', error);
    }
    
    const existingUser = await User.findOne({
      $or: [
        { _id: userObjectId },
        { _id: user.userId }
      ]
    });
    if (!existingUser) {
      console.log('User not found with ID:', user.userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('Existing user before update:', {
      firstName: existingUser.firstName,
      lastName: existingUser.lastName,
      currency: existingUser.currency,
      currencySymbol: existingUser.currencySymbol,
      timezone: existingUser.timezone,
      country: existingUser.country,
    });

    // Update the user
    existingUser.firstName = firstName;
    existingUser.lastName = lastName;
    existingUser.currency = currency;
    existingUser.currencySymbol = currencySymbol;
    existingUser.timezone = timezone;
    existingUser.country = country;
    
    const savedUser = await existingUser.save();

    console.log('User saved successfully:', {
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      currency: savedUser.currency,
      currencySymbol: savedUser.currencySymbol,
      timezone: savedUser.timezone,
      country: savedUser.country,
    });

    return NextResponse.json({
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      currency: savedUser.currency,
      currencySymbol: savedUser.currencySymbol,
      timezone: savedUser.timezone,
      country: savedUser.country,
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json({ error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}