import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Expense from '@/models/Expense';
import Category from '@/models/Category';

export async function GET() {
  try {
    console.log('Testing database connection...');
    await connectDB();
    
    const userCount = await User.countDocuments();
    console.log('User count:', userCount);
    
    const expenseCount = await Expense.countDocuments();
    console.log('Expense count:', expenseCount);
    
    const categoryCount = await Category.countDocuments();
    console.log('Category count:', categoryCount);
    
    const users = await User.find({}).select('email country currency currencySymbol timezone').limit(5);
    console.log('Sample users:', users);
    
    const expenses = await Expense.find({}).populate('categoryId', 'name color').limit(5);
    console.log('Sample expenses:', expenses);
    
    const categories = await Category.find({}).limit(5);
    console.log('Sample categories:', categories);
    
    return NextResponse.json({
      status: 'success',
      userCount,
      expenseCount,
      categoryCount,
      sampleUsers: users,
      sampleExpenses: expenses,
      sampleCategories: categories,
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}