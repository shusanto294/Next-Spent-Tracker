import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/middleware/auth';
import { adminDb } from '@/lib/firebaseAdmin';

export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { categoryOrders } = await req.json();

    if (!Array.isArray(categoryOrders)) {
      return NextResponse.json({ error: 'Invalid category orders format' }, { status: 400 });
    }

    // Update the order for each category using batch
    const batch = adminDb.batch();
    let updatedCount = 0;

    for (const { categoryId, order } of categoryOrders) {
      // Verify category belongs to user
      const categoryDoc = await adminDb.collection('categories').doc(categoryId).get();
      if (categoryDoc.exists && categoryDoc.data()?.userId === user.userId) {
        batch.update(categoryDoc.ref, { order });
        updatedCount++;
      }
    }

    await batch.commit();

    return NextResponse.json({
      message: 'Category order updated successfully',
      updatedCount
    });

  } catch (error) {
    console.error('Error updating category order:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}