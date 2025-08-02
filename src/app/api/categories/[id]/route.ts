import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Category from '@/models/Category';
import Expense from '@/models/Expense';
import { getUserFromRequest } from '@/middleware/auth';
import mongoose from 'mongoose';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(user.userId);
    } catch (error) {
      console.error('Error converting userId to ObjectId:', error);
    }
    
    // First, check if the category exists and belongs to the user
    const category = await Category.findOne({
      _id: id,
      $or: [
        { userId: userObjectId },
        { userId: user.userId }
      ]
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Delete all expenses in this category first
    await Expense.deleteMany({
      categoryId: id,
      $or: [
        { userId: userObjectId },
        { userId: user.userId }
      ]
    });

    // Then delete the category
    await Category.findOneAndDelete({
      _id: id,
      $or: [
        { userId: userObjectId },
        { userId: user.userId }
      ]
    });

    return NextResponse.json({ 
      message: 'Category and all associated expenses deleted successfully' 
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}