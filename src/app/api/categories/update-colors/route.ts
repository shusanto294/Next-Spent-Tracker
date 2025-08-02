import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Category from '@/models/Category';
import { getUserFromRequest } from '@/middleware/auth';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const userObjectId = new mongoose.Types.ObjectId(user.userId);
    
    // Default colors for categories
    const defaultColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#FFB347', '#87CEEB', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA', '#F1948A'
    ];
    
    // Get all categories for this user
    const categories = await Category.find({ userId: userObjectId });
    
    // Update each category with a random color
    const updatePromises = categories.map((category, index) => {
      const randomColor = defaultColors[index % defaultColors.length];
      return Category.findByIdAndUpdate(
        category._id,
        { color: randomColor },
        { new: true }
      );
    });
    
    const updatedCategories = await Promise.all(updatePromises);
    
    return NextResponse.json({
      message: 'Categories updated successfully',
      updatedCount: updatedCategories.length,
      categories: updatedCategories
    });
    
  } catch (error) {
    console.error('Error updating category colors:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}