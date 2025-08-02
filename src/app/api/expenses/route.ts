import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Expense from '@/models/Expense';
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
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(user.userId);
    } catch (error) {
      console.error('Error converting userId to ObjectId:', error);
    }
    
    const expenses = await Expense.find({
      $or: [
        { userId: userObjectId },
        { userId: user.userId }
      ]
    })
      .populate('categoryId', 'name color')
      .sort({ date: -1 });
    
    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { amount, categoryId, date } = await req.json();
    
    if (!amount || !categoryId) {
      return NextResponse.json({ error: 'Amount and category are required' }, { status: 400 });
    }

    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(user.userId);
    } catch (error) {
      console.error('Error converting userId to ObjectId:', error);
    }
    
    const category = await Category.findOne({ 
      _id: categoryId, 
      $or: [
        { userId: userObjectId },
        { userId: user.userId }
      ]
    });
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const expense = await Expense.create({
      amount: parseFloat(amount),
      description: `${category.name} expense`,
      categoryId,
      userId: userObjectId || user.userId,
      date: date ? new Date(date) : new Date(),
    });

    const populatedExpense = await Expense.findById(expense._id).populate('categoryId', 'name color');
    
    return NextResponse.json(populatedExpense, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}