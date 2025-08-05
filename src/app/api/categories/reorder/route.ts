import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Category from '@/models/Category';
import { getUserFromRequest } from '@/middleware/auth';
import mongoose from 'mongoose';

export async function PUT(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Handle user ID format like other endpoints
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(user.userId);
    } catch (error) {
      console.error('Error converting userId to ObjectId:', error);
    }

    const { categoryOrders } = await req.json();
    
    if (!Array.isArray(categoryOrders)) {
      return NextResponse.json({ error: 'Invalid category orders format' }, { status: 400 });
    }

    // Update the order for each category
    const updatePromises = categoryOrders.map(({ categoryId, order }) => 
      Category.findOneAndUpdate(
        { 
          _id: categoryId, 
          $or: [
            { userId: userObjectId },
            { userId: user.userId }
          ]
        },
        { order },
        { new: true }
      )
    );

    const results = await Promise.all(updatePromises);

    return NextResponse.json({ 
      message: 'Category order updated successfully',
      updatedCount: results.filter(Boolean).length 
    });

  } catch (error) {
    console.error('Error updating category order:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}