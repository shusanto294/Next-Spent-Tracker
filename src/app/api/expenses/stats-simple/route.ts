import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Expense from '@/models/Expense';
import Category from '@/models/Category';
import User from '@/models/User';
import { getUserFromRequest } from '@/middleware/auth';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get user's timezone from database
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(user.userId);
    } catch (error) {
      console.error('Error converting userId to ObjectId:', error);
    }
    
    const userDoc = await User.findOne({
      $or: [
        { _id: userObjectId },
        { _id: user.userId }
      ]
    }).select('timezone');
    
    const userTimezone = userDoc?.timezone || 'America/New_York';

    // Get URL parameters
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'daily';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const dateParam = searchParams.get('date');
    const categoryIdParam = searchParams.get('categoryId');
    const skip = (page - 1) * limit;

    // Only log essential fetch information
    console.log('📊 API FETCH:', { 
      period, 
      page, 
      categoryFilter: categoryIdParam ? 'YES' : 'NO',
      date: dateParam 
    });

    // Helper function to get date in user's timezone
    const getDateInTimezone = (date: Date, timezone: string) => {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const dateString = formatter.format(date);
      return new Date(dateString);
    };

    // Helper function to get start of day in user's timezone  
    const getStartOfDayInTimezone = (date: Date, timezone: string) => {
      const localDate = getDateInTimezone(date, timezone);
      return new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate());
    };

    // Helper function to get end of day in user's timezone
    const getEndOfDayInTimezone = (date: Date, timezone: string) => {
      const startOfDay = getStartOfDayInTimezone(date, timezone);
      return new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    };

    // Parse the selected date or use today in user's timezone
    const selectedDate = dateParam ? new Date(dateParam) : new Date();
    const todayInUserTZ = getDateInTimezone(new Date(), userTimezone);
    
    // Calculate date ranges based on selected date and period in user's timezone
    const startOfSelectedDay = getStartOfDayInTimezone(selectedDate, userTimezone);
    const endOfSelectedDay = getEndOfDayInTimezone(selectedDate, userTimezone);
    
    // For today's totals (always use current date in user's timezone)
    const startOfToday = getStartOfDayInTimezone(todayInUserTZ, userTimezone);
    const startOfThisMonth = new Date(todayInUserTZ.getFullYear(), todayInUserTZ.getMonth(), 1);

    // For weekly calculation - get start of week containing selected date (Sunday) in user's timezone
    const selectedDateInUserTZ = getDateInTimezone(selectedDate, userTimezone);
    const startOfSelectedWeek = new Date(selectedDateInUserTZ);
    startOfSelectedWeek.setDate(selectedDateInUserTZ.getDate() - selectedDateInUserTZ.getDay());
    startOfSelectedWeek.setHours(0, 0, 0, 0);
    const endOfSelectedWeek = new Date(startOfSelectedWeek.getTime() + 7 * 24 * 60 * 60 * 1000);

    // For monthly calculation - get start of month containing selected date in user's timezone
    const startOfSelectedMonth = new Date(selectedDateInUserTZ.getFullYear(), selectedDateInUserTZ.getMonth(), 1);
    const endOfSelectedMonth = new Date(selectedDateInUserTZ.getFullYear(), selectedDateInUserTZ.getMonth() + 1, 1);

    // Remove detailed date range logging

    // Remove individual database entry logging
    
    // Build query filter
    const expenseFilter: any = { userId: user.userId };
    if (categoryIdParam) {
      expenseFilter.categoryId = categoryIdParam;
    }
    
    // Get recent expenses with pagination (latest first)
    const recentExpenses = await Expense.find(expenseFilter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const totalExpenses = await Expense.countDocuments(expenseFilter);
    const totalPages = Math.ceil(totalExpenses / limit);

    // Get all expenses for calculations
    const allExpenses = await Expense.find({ userId: user.userId });

    // Calculate totals for today and this month (always current date)
    const todayExpenses = allExpenses.filter(e => e.date >= startOfToday);
    const thisMonthExpenses = allExpenses.filter(e => e.date >= startOfThisMonth);

    const dailyTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);  
    const monthlyTotal = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Calculate expenses for the selected period (for category stats)
    let periodExpenses;
    let periodStart: Date, periodEnd: Date;

    if (period === 'daily') {
      periodStart = startOfSelectedDay;
      periodEnd = endOfSelectedDay;
      periodExpenses = allExpenses.filter(e => e.date >= periodStart && e.date < periodEnd);
    } else if (period === 'weekly') {
      periodStart = startOfSelectedWeek;
      periodEnd = endOfSelectedWeek;
      periodExpenses = allExpenses.filter(e => e.date >= periodStart && e.date < periodEnd);
    } else { // monthly
      periodStart = startOfSelectedMonth;
      periodEnd = endOfSelectedMonth;
      periodExpenses = allExpenses.filter(e => e.date >= periodStart && e.date < periodEnd);
    }

    // Remove detailed expense logging

    // Get categories manually for stats based on selected period
    const categoryIds = [...new Set(periodExpenses.map(e => e.categoryId).filter(Boolean))];
    let categories: any[] = [];
    try {
      categories = await Category.find({ _id: { $in: categoryIds } });
    } catch (catError) {
      console.error('Error fetching categories:', catError instanceof Error ? catError.message : 'Unknown error');
    }
    const categoryLookup = new Map(categories.map(c => [c._id.toString(), c]));
    
    // Simple category stats - no aggregation, based on selected period
    const categoryMap = new Map();
    periodExpenses.forEach(expense => {
      const catId = expense.categoryId?.toString() || 'uncategorized';
      const category = categoryLookup.get(catId);
      const catName = category?.name || 'Uncategorized';
      const catColor = category?.color || '#3B82F6';
      
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, {
          categoryId: catId,
          categoryName: catName,
          categoryColor: catColor,
          totalAmount: 0,
          count: 0
        });
      }
      
      const cat = categoryMap.get(catId);
      cat.totalAmount += expense.amount;
      cat.count += 1;
    });

    // Calculate period total for percentage calculation
    const periodTotal = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

    const categoryStats = Array.from(categoryMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .map(stat => ({
        ...stat,
        percentage: periodTotal > 0 ? ((stat.totalAmount / periodTotal) * 100).toFixed(1) : '0'
      }));

    // Remove detailed category stats logging

    const response = {
      daily: {
        total: dailyTotal,
        expenses: todayExpenses
      },
      monthly: {
        total: monthlyTotal,
        expenses: thisMonthExpenses
      },
      recent: {
        expenses: recentExpenses,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: totalExpenses,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      },
      categoryStats,
      period: period
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Simple stats error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}