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

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'monthly';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Determine period for category stats
    const periodStart = period === 'daily' ? startOfDay : startOfMonth;

    // Convert userId to ObjectId for proper MongoDB querying
    console.log('User from token:', user);
    console.log('User.userId:', user.userId, 'Type:', typeof user.userId);
    
    let userObjectId = null;
    try {
      if (mongoose.Types.ObjectId.isValid(user.userId)) {
        userObjectId = new mongoose.Types.ObjectId(user.userId);
        console.log('Successfully converted to ObjectId:', userObjectId);
      } else {
        console.log('userId is not a valid ObjectId, will use as string:', user.userId);
      }
    } catch (error) {
      console.error('Error converting userId to ObjectId:', error);
      // Continue with string userId instead of failing
    }
    
    // Get recent expenses with pagination (latest first)
    // Build query based on available userId formats
    const userQuery = userObjectId ? 
      { $or: [{ userId: userObjectId }, { userId: user.userId }] } : 
      { userId: user.userId };
    
    const recentExpenses = await Expense.find(userQuery)
    .populate('categoryId', 'name color')
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit);

    // Get total count for pagination
    const totalExpenses = await Expense.countDocuments(userQuery);
    console.log('Total expenses found:', totalExpenses);
    const totalPages = Math.ceil(totalExpenses / limit);
    
    console.log('Recent expenses query result:', recentExpenses.length, 'expenses found');

    const [dailyExpenses, monthlyExpenses, categoryStats] = await Promise.all([
      Expense.find(userObjectId ? 
        { $or: [{ userId: userObjectId, date: { $gte: startOfDay } }, { userId: user.userId, date: { $gte: startOfDay } }] } :
        { userId: user.userId, date: { $gte: startOfDay } }
      ).populate('categoryId', 'name color'),

      Expense.find(userObjectId ? 
        { $or: [{ userId: userObjectId, date: { $gte: startOfMonth } }, { userId: user.userId, date: { $gte: startOfMonth } }] } :
        { userId: user.userId, date: { $gte: startOfMonth } }
      ).populate('categoryId', 'name color'),

      Expense.aggregate([
        {
          $match: userObjectId ? {
            $or: [
              { userId: userObjectId, date: { $gte: periodStart } },
              { userId: user.userId, date: { $gte: periodStart } }
            ]
          } : {
            userId: user.userId,
            date: { $gte: periodStart }
          }
        },
        {
          $group: {
            _id: '$categoryId',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'category'
          }
        },
        {
          $unwind: '$category'
        },
        {
          $project: {
            categoryId: '$_id',
            categoryName: '$category.name',
            categoryColor: '$category.color',
            totalAmount: 1,
            count: 1
          }
        },
        {
          $sort: { totalAmount: -1 }
        }
      ])
    ]);

    const dailyTotal = dailyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const monthlyTotal = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Calculate period total from category stats for accurate percentage
    const categoryTotal = categoryStats.reduce((sum, stat) => sum + stat.totalAmount, 0);
    
    // Default colors for categories that don't have colors
    const defaultColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#FFB347', '#87CEEB', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA', '#F1948A'
    ];

    // Calculate percentages for category stats and ensure colors
    const categoryStatsWithPercentages = categoryStats.map((stat, index) => ({
      ...stat,
      categoryColor: stat.categoryColor || defaultColors[index % defaultColors.length],
      percentage: categoryTotal > 0 ? ((stat.totalAmount / categoryTotal) * 100).toFixed(1) : '0'
    }));
    
    console.log('Category stats debug:', {
      categoryTotal,
      periodTotal: period === 'daily' ? dailyTotal : monthlyTotal,
      categoryCount: categoryStats.length,
      period
    });

    return NextResponse.json({
      daily: {
        total: dailyTotal,
        expenses: dailyExpenses
      },
      monthly: {
        total: monthlyTotal,
        expenses: monthlyExpenses
      },
      recent: {
        expenses: recentExpenses,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalExpenses,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      },
      categoryStats: categoryStatsWithPercentages,
      period
    });
  } catch (error) {
    console.error('Error fetching expense stats:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}