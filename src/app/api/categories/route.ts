import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Category from '@/models/Category';
import { getUserFromRequest } from '@/middleware/auth';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(user.userId);
    } catch (error) {
      console.error('Error converting userId to ObjectId:', error);
    }
    
    const categories = await Category.find({
      $or: [
        { userId: userObjectId },
        { userId: user.userId }
      ]
    });
    
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { name, color } = await req.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(user.userId);
    } catch (error) {
      console.error('Error converting userId to ObjectId:', error);
    }
    
    const existingCategory = await Category.findOne({ 
      name, 
      $or: [
        { userId: userObjectId },
        { userId: user.userId }
      ]
    });
    if (existingCategory) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 400 });
    }

    // Default colors for new categories
    const defaultColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#FFB347', '#87CEEB', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA', '#F1948A'
    ];
    
    // Get random color if none provided
    const randomColor = color || defaultColors[Math.floor(Math.random() * defaultColors.length)];

    const category = await Category.create({
      name,
      color: randomColor,
      userId: userObjectId || user.userId,
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}