import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/middleware/auth';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    console.log('User from token:', user);
    console.log('User.userId:', user.userId, 'Type:', typeof user.userId);

    // Get all expenses for the user
    const expensesSnapshot = await adminDb
      .collection('expenses')
      .where('userId', '==', user.userId)
      .get();

    const allExpenses = expensesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        _id: doc.id,
        ...data,
        date: data.date?.toDate?.() || data.date,
        amount: data.amount || 0,
        categoryId: data.categoryId
      };
    });

    // Sort by date descending
    const sortedExpenses = [...allExpenses].sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });

    // Paginate recent expenses
    const recentExpensesRaw = sortedExpenses.slice(skip, skip + limit);

    // Populate category data for recent expenses
    const recentExpenses = await Promise.all(
      recentExpensesRaw.map(async (expense) => {
        if (expense.categoryId) {
          const categoryDoc = await adminDb.collection('categories').doc(expense.categoryId).get();
          if (categoryDoc.exists) {
            const cat = categoryDoc.data();
            return {
              ...expense,
              categoryId: {
                _id: categoryDoc.id,
                name: cat?.name,
                color: cat?.color
              }
            };
          }
        }
        return expense;
      })
    );

    const totalExpenses = allExpenses.length;
    console.log('Total expenses found:', totalExpenses);
    const totalPages = Math.ceil(totalExpenses / limit);

    console.log('Recent expenses query result:', recentExpenses.length, 'expenses found');

    // Filter expenses for daily and monthly
    const dailyExpensesRaw = allExpenses.filter(e => {
      const expenseDate = e.date instanceof Date ? e.date : new Date(e.date);
      return expenseDate >= startOfDay;
    });

    const monthlyExpensesRaw = allExpenses.filter(e => {
      const expenseDate = e.date instanceof Date ? e.date : new Date(e.date);
      return expenseDate >= startOfMonth;
    });

    // Populate category data for daily and monthly expenses
    const dailyExpenses = await Promise.all(
      dailyExpensesRaw.map(async (expense) => {
        if (expense.categoryId) {
          const categoryDoc = await adminDb.collection('categories').doc(expense.categoryId).get();
          if (categoryDoc.exists) {
            const cat = categoryDoc.data();
            return {
              ...expense,
              categoryId: {
                _id: categoryDoc.id,
                name: cat?.name,
                color: cat?.color
              }
            };
          }
        }
        return expense;
      })
    );

    const monthlyExpenses = await Promise.all(
      monthlyExpensesRaw.map(async (expense) => {
        if (expense.categoryId) {
          const categoryDoc = await adminDb.collection('categories').doc(expense.categoryId).get();
          if (categoryDoc.exists) {
            const cat = categoryDoc.data();
            return {
              ...expense,
              categoryId: {
                _id: categoryDoc.id,
                name: cat?.name,
                color: cat?.color
              }
            };
          }
        }
        return expense;
      })
    );

    // Manual aggregation for category stats
    const periodExpenses = allExpenses.filter(e => {
      const expenseDate = e.date instanceof Date ? e.date : new Date(e.date);
      return expenseDate >= periodStart;
    });

    const categoryStatsMap = new Map();
    periodExpenses.forEach(expense => {
      const catId = expense.categoryId || 'uncategorized';
      if (!categoryStatsMap.has(catId)) {
        categoryStatsMap.set(catId, {
          _id: catId,
          totalAmount: 0,
          count: 0
        });
      }
      const stat = categoryStatsMap.get(catId);
      stat.totalAmount += expense.amount;
      stat.count += 1;
    });

    // Fetch category details and build final stats
    const categoryStatsArray = await Promise.all(
      Array.from(categoryStatsMap.entries()).map(async ([catId, stat]) => {
        if (catId === 'uncategorized') {
          return {
            categoryId: catId,
            categoryName: 'Uncategorized',
            categoryColor: '#3B82F6',
            totalAmount: stat.totalAmount,
            count: stat.count
          };
        }
        const categoryDoc = await adminDb.collection('categories').doc(catId).get();
        if (categoryDoc.exists) {
          const cat = categoryDoc.data();
          return {
            categoryId: catId,
            categoryName: cat?.name || 'Unknown',
            categoryColor: cat?.color || '#3B82F6',
            totalAmount: stat.totalAmount,
            count: stat.count
          };
        }
        return {
          categoryId: catId,
          categoryName: 'Unknown',
          categoryColor: '#3B82F6',
          totalAmount: stat.totalAmount,
          count: stat.count
        };
      })
    );

    const categoryStats = categoryStatsArray.sort((a, b) => b.totalAmount - a.totalAmount);

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