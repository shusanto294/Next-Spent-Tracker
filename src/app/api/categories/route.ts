import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/middleware/auth';
import { adminDb, admin } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categoriesSnapshot = await adminDb
      .collection('categories')
      .where('userId', '==', user.userId)
      .get();

    const categories = categoriesSnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          _id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt
        };
      })
      .sort((a: any, b: any) => {
        // Sort by order first, then by createdAt
        if (a.order !== b.order) {
          return (a.order || 0) - (b.order || 0);
        }
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateA.getTime() - dateB.getTime();
      });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, color } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    // Check if category already exists
    const existingCategorySnapshot = await adminDb
      .collection('categories')
      .where('userId', '==', user.userId)
      .where('name', '==', name)
      .get();

    if (!existingCategorySnapshot.empty) {
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

    // Get the highest order number for this user
    const categoriesSnapshot = await adminDb
      .collection('categories')
      .where('userId', '==', user.userId)
      .get();

    let maxOrder = -1;
    categoriesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (typeof data.order === 'number' && data.order > maxOrder) {
        maxOrder = data.order;
      }
    });

    const nextOrder = maxOrder + 1;
    console.log('🔍 Creating category with order:', nextOrder, 'Max order found:', maxOrder);

    const categoryData = {
      name,
      color: randomColor,
      userId: user.userId,
      order: nextOrder,
      createdAt: admin.firestore.Timestamp.now()
    };

    console.log('🔍 Category data to create:', categoryData);

    const docRef = await adminDb.collection('categories').add(categoryData);

    const category = {
      _id: docRef.id,
      ...categoryData,
      createdAt: categoryData.createdAt.toDate()
    };

    console.log('🔍 Created category result:', {
      _id: category._id,
      name: category.name,
      order: category.order,
      orderExists: category.order !== undefined,
      orderType: typeof category.order
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}