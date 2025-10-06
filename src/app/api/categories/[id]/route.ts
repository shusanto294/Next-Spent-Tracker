import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/middleware/auth';
import { adminDb } from '@/lib/firebaseAdmin';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    // Check if the category exists and belongs to the user
    const categoryDoc = await adminDb.collection('categories').doc(id).get();

    if (!categoryDoc.exists) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const categoryData = categoryDoc.data();
    if (categoryData?.userId !== user.userId) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Delete all expenses in this category first
    const expensesSnapshot = await adminDb
      .collection('expenses')
      .where('userId', '==', user.userId)
      .where('categoryId', '==', id)
      .get();

    const batch = adminDb.batch();
    expensesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Then delete the category
    batch.delete(adminDb.collection('categories').doc(id));

    await batch.commit();

    return NextResponse.json({
      message: 'Category and all associated expenses deleted successfully'
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}