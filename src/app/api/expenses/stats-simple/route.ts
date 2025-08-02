import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Expense from '@/models/Expense';
import Category from '@/models/Category';
import { getUserFromRequest } from '@/middleware/auth';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    console.log('=== SIMPLE STATS API START ===');
    
    const user = getUserFromRequest(req);
    console.log('User:', user ? { userId: user.userId, email: user.email } : 'No user');
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    console.log('DB connected');

    // Get URL parameters
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'daily';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const dateParam = searchParams.get('date');
    const skip = (page - 1) * limit;

    console.log('Parameters:', { period, page, limit, dateParam });

    // Parse the selected date or use today
    const selectedDate = dateParam ? new Date(dateParam) : new Date();
    const today = new Date();
    
    // Calculate date ranges based on selected date and period
    const startOfSelectedDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const endOfSelectedDay = new Date(startOfSelectedDay.getTime() + 24 * 60 * 60 * 1000);
    
    // For today's totals (always use current date)
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // For weekly calculation - get start of week containing selected date (Sunday)
    const startOfSelectedWeek = new Date(selectedDate);
    startOfSelectedWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
    startOfSelectedWeek.setHours(0, 0, 0, 0);
    const endOfSelectedWeek = new Date(startOfSelectedWeek.getTime() + 7 * 24 * 60 * 60 * 1000);

    // For monthly calculation - get start of month containing selected date
    const startOfSelectedMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const endOfSelectedMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);

    console.log('Date ranges:', {
      selectedDate: selectedDate.toISOString(),
      startOfSelectedDay: startOfSelectedDay.toISOString(),
      startOfSelectedWeek: startOfSelectedWeek.toISOString(),
      startOfSelectedMonth: startOfSelectedMonth.toISOString()
    });

    // Simple approach - just get expenses with string userId first
    console.log('Fetching expenses with userId:', user.userId);
    
    // Get recent expenses with pagination (latest first)
    const recentExpenses = await Expense.find({ userId: user.userId })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const totalExpenses = await Expense.countDocuments({ userId: user.userId });
    const totalPages = Math.ceil(totalExpenses / limit);
    
    console.log('Found recent expenses:', recentExpenses.length);

    // Get all expenses for calculations
    const allExpenses = await Expense.find({ userId: user.userId });

    // Calculate totals for today and this month (always current date)
    const todayExpenses = allExpenses.filter(e => e.date >= startOfToday);
    const thisMonthExpenses = allExpenses.filter(e => e.date >= startOfThisMonth);

    const dailyTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);  
    const monthlyTotal = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Calculate expenses for the selected period (for category stats)
    let periodExpenses;
    let periodStart, periodEnd;

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

    console.log('Period expenses:', periodExpenses.length, 'for', period, 'period');
    console.log('Daily total:', dailyTotal, 'Monthly total:', monthlyTotal);

    // Get categories manually for stats based on selected period
    const categoryIds = [...new Set(periodExpenses.map(e => e.categoryId).filter(Boolean))];
    let categories = [];
    try {
      categories = await Category.find({ _id: { $in: categoryIds } });
      console.log('Found categories:', categories.length);
    } catch (catError) {
      console.log('Error fetching categories:', catError.message);
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

    console.log('Category stats details:', {
      length: categoryStats.length,
      sample: categoryStats[0],
      periodTotal,
      periodExpensesCount: periodExpenses.length,
      categoryMapSize: categoryMap.size,
      rawCategories: categories.length,
    });

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

    console.log('=== SIMPLE STATS API SUCCESS ===');
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