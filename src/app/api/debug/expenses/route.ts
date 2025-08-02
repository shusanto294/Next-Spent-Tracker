import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Expense from '@/models/Expense';
import { getUserFromRequest } from '@/middleware/auth';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    console.log('=== DEBUG EXPENSES ENDPOINT ===');
    
    const user = getUserFromRequest(req);
    console.log('User from token:', user);
    
    if (!user) {
      console.log('No user found - unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    console.log('Connected to MongoDB');

    // Test direct query with string userId first
    console.log('Testing with string userId:', user.userId);
    const expensesString = await Expense.find({ userId: user.userId })
      .populate('categoryId', 'name color')
      .limit(5);
    console.log('Expenses found with string userId:', expensesString.length);

    // Test with ObjectId conversion
    let userObjectId;
    try {
      if (mongoose.Types.ObjectId.isValid(user.userId)) {
        userObjectId = new mongoose.Types.ObjectId(user.userId);
        console.log('Testing with ObjectId:', userObjectId);
        
        const expensesObjectId = await Expense.find({ userId: userObjectId })
          .populate('categoryId', 'name color')
          .limit(5);
        console.log('Expenses found with ObjectId:', expensesObjectId.length);
      } else {
        console.log('userId is not a valid ObjectId format');
      }
    } catch (error) {
      console.error('Error with ObjectId conversion:', error);
    }

    // Test $or query
    const expensesOr = await Expense.find({
      $or: [
        { userId: userObjectId },
        { userId: user.userId }
      ]
    })
    .populate('categoryId', 'name color')
    .limit(5);
    console.log('Expenses found with $or query:', expensesOr.length);

    // Get all expenses without any filter to see what's in the database
    const allExpenses = await Expense.find({}).limit(10);
    console.log('Total expenses in database:', allExpenses.length);
    console.log('Sample expense userIds:', allExpenses.map(e => ({ userId: e.userId, type: typeof e.userId })));

    return NextResponse.json({
      user: user,
      stringQuery: expensesString.length,
      objectIdQuery: userObjectId ? (await Expense.find({ userId: userObjectId }).limit(5)).length : 'N/A',
      orQuery: expensesOr.length,
      totalInDb: allExpenses.length,
      sampleUserIds: allExpenses.map(e => ({ userId: e.userId, type: typeof e.userId })),
      expenses: expensesOr.map(e => ({
        id: e._id,
        amount: e.amount,
        description: e.description,
        userId: e.userId,
        userIdType: typeof e.userId,
        date: e.date
      }))
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}