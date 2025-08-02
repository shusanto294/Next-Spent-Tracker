import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { currencies } from '@/lib/countryDefaults';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const { firstName, lastName, email, password, country, currency, timezone } = await req.json();
    
    console.log('Registration request:', { firstName, lastName, email, country, currency, timezone });
    
    if (!firstName || !lastName || !email || !password || !country || !currency || !timezone) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const currencyObj = currencies.find(c => c.code === currency);
    const currencySymbol = currencyObj ? currencyObj.symbol : '$';
    
    const userData = {
      firstName,
      lastName,
      email,
      password: hashedPassword,
      country,
      currency,
      currencySymbol,
      timezone,
    };
    
    console.log('Creating user with data:', userData);
    
    const user = await User.create(userData);
    
    console.log('User created successfully:', {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      country: user.country,
      currency: user.currency,
      currencySymbol: user.currencySymbol,
      timezone: user.timezone,
    });
    
    return NextResponse.json({ message: 'User created successfully', userId: user._id }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}