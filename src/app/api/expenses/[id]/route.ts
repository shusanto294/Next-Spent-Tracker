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
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    // Get the expense to verify it belongs to the user
    const expenseDoc = await adminDb.collection('expenses').doc(id).get();

    if (!expenseDoc.exists) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const expenseData = expenseDoc.data();
    if (expenseData?.userId !== user.userId) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Delete the expense
    await adminDb.collection('expenses').doc(id).delete();

    return NextResponse.json({ message: 'Expense deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}