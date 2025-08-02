import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Expense from '@/models/Expense';
import Category from '@/models/Category';
import { getUserFromRequest } from '@/middleware/auth';

export async function GET(req: NextRequest) {
  try {
    console.log('=== TEST DATA API ===');
    
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User ID:', user.userId, 'Type:', typeof user.userId);

    await connectDB();
    
    // Test 1: Get expenses with string userId
    const expensesString = await Expense.find({ userId: user.userId }).limit(3);
    console.log('Expenses with string query:', expensesString.length);
    
    // Test 2: Get all expenses to see what's in the database
    const allExpenses = await Expense.find({}).limit(5);
    console.log('Sample expenses in DB:', allExpenses.map(e => ({
      id: e._id.toString(),
      userId: e.userId,
      userIdType: typeof e.userId,
      amount: e.amount
    })));

    return NextResponse.json({
      message: 'Test successful',
      userIdFromToken: user.userId,
      userIdType: typeof user.userId,
      expensesFoundWithString: expensesString.length,
      sampleExpensesInDb: allExpenses.map(e => ({
        id: e._id.toString(),
        userId: e.userId,
        userIdType: typeof e.userId,
        amount: e.amount
      }))
    });

  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack'
    }, { status: 500 });
  }
}