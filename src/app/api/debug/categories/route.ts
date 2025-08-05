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

    // Handle user ID format like other endpoints
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(user.userId);
    } catch (error) {
      console.error('Error converting userId to ObjectId:', error);
    }

    console.log('🔍 Debug: Fetching categories for user:', user.userId);

    const categories = await Category.find({
      $or: [
        { userId: userObjectId },
        { userId: user.userId }
      ]
    }).sort({ order: 1, createdAt: 1 });

    console.log('🔍 Debug: Found categories:');
    categories.forEach(cat => {
      console.log(`  - ${cat.name}: order=${cat.order}, hasOrder=${cat.order !== undefined}, createdAt=${cat.createdAt}`);
    });

    return NextResponse.json({
      categories: categories.map(cat => ({
        _id: cat._id,
        name: cat.name,
        color: cat.color,
        order: cat.order,
        userId: cat.userId,
        createdAt: cat.createdAt,
        hasOrderField: cat.order !== undefined
      })),
      totalCount: categories.length
    });

  } catch (error) {
    console.error('Debug categories error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { name } = await req.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    // Handle user ID format like other endpoints
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(user.userId);
    } catch (error) {
      console.error('Error converting userId to ObjectId:', error);
    }

    console.log('🔍 Debug: Creating test category for user:', user.userId);

    // Get the highest order number for this user
    const lastCategory = await Category.findOne({
      $or: [
        { userId: userObjectId },
        { userId: user.userId }
      ]
    }).sort({ order: -1 });

    const nextOrder = lastCategory ? lastCategory.order + 1 : 0;
    console.log('🔍 Debug: Next order will be:', nextOrder, 'Last category order was:', lastCategory?.order);

    const categoryData = {
      name: `DEBUG_${name}`,
      color: '#FF0000',
      userId: userObjectId || user.userId,
      order: nextOrder,
    };

    console.log('🔍 Debug: Creating category with data:', categoryData);

    const category = await Category.create(categoryData);

    console.log('🔍 Debug: Created category result:', {
      _id: category._id,
      name: category.name,
      order: category.order,
      orderType: typeof category.order,
      hasOrder: category.order !== undefined
    });

    // Fetch it back to verify it was saved correctly
    const savedCategory = await Category.findById(category._id);
    console.log('🔍 Debug: Fetched back from DB:', {
      _id: savedCategory?._id,
      name: savedCategory?.name,
      order: savedCategory?.order,
      orderType: typeof savedCategory?.order,
      hasOrder: savedCategory?.order !== undefined
    });

    return NextResponse.json({
      created: category,
      fetched: savedCategory,
      success: true
    }, { status: 201 });

  } catch (error) {
    console.error('Debug create category error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}