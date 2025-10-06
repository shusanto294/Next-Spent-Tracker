import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/middleware/auth';
import { adminDb, admin } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get expenses for the user
    const expensesSnapshot = await adminDb
      .collection('expenses')
      .where('userId', '==', user.userId)
      .orderBy('date', 'desc')
      .get();

    const expenses = await Promise.all(
      expensesSnapshot.docs.map(async (doc) => {
        const data = doc.data();

        // Fetch category data if categoryId exists
        let categoryData = null;
        if (data.categoryId) {
          const categoryDoc = await adminDb.collection('categories').doc(data.categoryId).get();
          if (categoryDoc.exists) {
            const cat = categoryDoc.data();
            categoryData = {
              _id: categoryDoc.id,
              name: cat?.name,
              color: cat?.color
            };
          }
        }

        return {
          _id: doc.id,
          ...data,
          date: data.date?.toDate?.() || data.date,
          categoryId: categoryData
        };
      })
    );

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, description, categoryId, date } = await req.json();

    if (!amount || !categoryId) {
      return NextResponse.json({ error: 'Amount and category are required' }, { status: 400 });
    }

    // Verify category exists and belongs to user
    const categoryDoc = await adminDb.collection('categories').doc(categoryId).get();
    if (!categoryDoc.exists) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const categoryData = categoryDoc.data();
    if (categoryData?.userId !== user.userId) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Create expense
    const expenseData = {
      amount: parseFloat(amount),
      description: description || `${categoryData.name} expense`,
      categoryId,
      userId: user.userId,
      date: admin.firestore.Timestamp.fromDate(date ? new Date(date) : new Date()),
      createdAt: admin.firestore.Timestamp.now()
    };

    const docRef = await adminDb.collection('expenses').add(expenseData);

    // Return populated expense
    const populatedExpense = {
      _id: docRef.id,
      ...expenseData,
      date: expenseData.date.toDate(),
      categoryId: {
        _id: categoryDoc.id,
        name: categoryData.name,
        color: categoryData.color
      }
    };

    return NextResponse.json(populatedExpense, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}