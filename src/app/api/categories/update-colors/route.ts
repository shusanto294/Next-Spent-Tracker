import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/middleware/auth';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Default colors for categories
    const defaultColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#FFB347', '#87CEEB', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA', '#F1948A'
    ];

    // Get all categories for this user
    const categoriesSnapshot = await adminDb
      .collection('categories')
      .where('userId', '==', user.userId)
      .get();

    // Update each category with a random color
    const batch = adminDb.batch();
    const updatedCategories: any[] = [];

    categoriesSnapshot.docs.forEach((doc, index) => {
      const randomColor = defaultColors[index % defaultColors.length];
      batch.update(doc.ref, { color: randomColor });
      updatedCategories.push({
        _id: doc.id,
        ...doc.data(),
        color: randomColor
      });
    });

    await batch.commit();

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