'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ExpenseForm from './ExpenseForm';
import { LogOut, Calendar, TrendingUp, Settings, ChevronLeft, ChevronRight, CalendarDays, Trash2, X } from 'lucide-react';

interface CategoryStat {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  totalAmount: number;
  count: number;
  percentage: string;
}

interface RecentExpenses {
  expenses: any[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface DashboardData {
  daily: {
    total: number;
    expenses: any[];
  };
  monthly: {
    total: number;
    expenses: any[];
  };
  recent: RecentExpenses;
  categoryStats: CategoryStat[];
  period: string;
}

interface UserSettings {
  currency: string;
  currencySymbol: string;
  timezone: string;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryPeriod, setCategoryPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: 'expense' | 'category' | null;
    id: string | null;
    name: string;
  }>({
    isOpen: false,
    type: null,
    id: null,
    name: '',
  });
  const router = useRouter();

  // Helper function to get current date in user's timezone
  const getCurrentDateInUserTimezone = () => {
    if (!userSettings?.timezone) return new Date();
    
    const now = new Date();
    // Get the current time in user's timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: userSettings.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const userDateString = formatter.format(now);
    return new Date(userDateString);
  };

  // Fetch user settings only once on component mount and when page regains focus
  useEffect(() => {
    fetchUserSettings();
    
    // Refresh settings when page becomes visible (returning from settings page)
    const handleFocus = () => {
      fetchUserSettings();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);


  // Fetch dashboard data when date changes (only after user settings are loaded)
  useEffect(() => {
    if (userSettings?.timezone) {
      fetchDashboardData(1, categoryPeriod, selectedDate, selectedCategoryId);
    }
  }, [selectedDate]);

  const handlePageChange = (newPage: number) => {
    fetchDashboardData(newPage, categoryPeriod, selectedDate, selectedCategoryId);
  };

  const handlePeriodChange = (newPeriod: 'daily' | 'weekly' | 'monthly') => {
    setCategoryPeriod(newPeriod);
    fetchDashboardData(1, newPeriod, selectedDate, selectedCategoryId);
  };

  const handleDateChange = (newDate: Date) => {
    setSelectedDate(newDate);
    // The useEffect will handle the refetch when selectedDate changes
  };

  const handleWeekView = () => {
    const newPeriod = 'weekly';
    setCategoryPeriod(newPeriod);
    fetchDashboardData(1, newPeriod, selectedDate, selectedCategoryId);
  };

  const handleMonthView = () => {
    const newPeriod = 'monthly';
    setCategoryPeriod(newPeriod);
    fetchDashboardData(1, newPeriod, selectedDate, selectedCategoryId);
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };



  const fetchDashboardData = async (page = 1, period = categoryPeriod, date = selectedDate, categoryId = selectedCategoryId) => {
    try {
      console.log('Fetching dashboard data with:', { page, period, date: date.toISOString().split('T')[0], categoryId });
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        period,
        date: date.toISOString().split('T')[0] // Send date as YYYY-MM-DD
      });
      
      // Add category filter if selected
      if (categoryId) {
        params.append('categoryId', categoryId);
      }
      
      const url = `/api/expenses/stats-simple?${params}`;
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url);
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      
      const responseData = await response.json();
      console.log('Raw API response:', responseData);
      
      if (response.ok) {
        console.log('Dashboard data details:', {
          categoryStats: {
            length: responseData.categoryStats?.length || 0,
            sample: responseData.categoryStats?.[0],
            hasData: Boolean(responseData.categoryStats?.length),
          },
          daily: {
            total: responseData.daily?.total,
            expensesCount: responseData.daily?.expenses?.length,
          },
          monthly: {
            total: responseData.monthly?.total,
            expensesCount: responseData.monthly?.expenses?.length,
          },
          period: responseData.period,
        });
        
        setData(responseData);
        setCurrentPage(page);
        setCategoryPeriod(period);
        
        // Check if the currently selected category still exists in the new data
        if (selectedCategoryId && responseData.categoryStats) {
          const categoryStillExists = responseData.categoryStats.some(
            (cat: CategoryStat) => cat.categoryId === selectedCategoryId
          );
          // Only reset if the category no longer exists in the new period
          if (!categoryStillExists) {
            setSelectedCategoryId(null);
          }
        }
      } else {
        console.error('API response not ok:', response.status, response.statusText);
        console.error('Error details:', responseData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserSettings = async () => {
    try {
      console.log('Fetching user settings...');
      const response = await fetch('/api/user/settings');
      console.log('Settings response status:', response.status);
      
      if (response.ok) {
        const settings = await response.json();
        console.log('Fetched user settings:', settings);
        setUserSettings(settings);
        
        // Initialize with correct date in user's timezone
        if (settings.timezone) {
          const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: settings.timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
          const userDateString = formatter.format(new Date());
          const currentDateInUserTZ = new Date(userDateString);
          setSelectedDate(currentDateInUserTZ);
          
          // Fetch initial data with correct date
          fetchDashboardData(1, categoryPeriod, currentDateInUserTZ, selectedCategoryId);
        }
      } else {
        console.error('Failed to fetch user settings, status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching user settings:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    console.log('formatCurrency called with amount:', amount, 'userSettings:', userSettings);
    if (!userSettings) {
      console.log('No user settings, using default $');
      return `$${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    const formatted = `${userSettings.currencySymbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    console.log('Formatted currency:', formatted);
    return formatted;
  };

  const handleDeleteExpense = async (expenseId: string, description: string) => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'expense',
      id: expenseId,
      name: description,
    });
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'category',
      id: categoryId,
      name: categoryName,
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation.id || !deleteConfirmation.type) return;

    try {
      const endpoint = deleteConfirmation.type === 'expense' 
        ? `/api/expenses/${deleteConfirmation.id}`
        : `/api/categories/${deleteConfirmation.id}`;
      
      const response = await fetch(endpoint, { method: 'DELETE' });
      
      if (response.ok) {
        setDeleteConfirmation({ isOpen: false, type: null, id: null, name: '' });
        fetchDashboardData(currentPage, categoryPeriod, selectedDate, selectedCategoryId);
      } else {
        console.error('Delete failed:', response.statusText);
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmation({ isOpen: false, type: null, id: null, name: '' });
  };

  const handleCategoryFilter = (categoryId: string) => {
    const newCategoryId = selectedCategoryId === categoryId ? null : categoryId;
    setSelectedCategoryId(newCategoryId);
    // Refetch data with the new category filter
    fetchDashboardData(1, categoryPeriod, selectedDate, newCategoryId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Spent Tracker</h1>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={() => router.push('/settings')}
                className="flex items-center space-x-1 sm:space-x-2 text-gray-600 hover:text-gray-900 p-2 sm:p-0"
              >
                <Settings size={18} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Settings</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 sm:space-x-2 text-gray-600 hover:text-gray-900 p-2 sm:p-0"
              >
                <LogOut size={18} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="text-blue-600 sm:w-5 sm:h-5" size={18}/>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Today&apos;s Spent</h2>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600">
              {formatCurrency(data?.daily.total || 0)}
            </p>
            <p className="text-gray-500 text-sm">
              {data?.daily.expenses.length || 0} transactions
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="text-green-600 sm:w-5 sm:h-5" size={18}/>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">This Month</h2>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-green-600">
              {formatCurrency(data?.monthly.total || 0)}
            </p>
            <p className="text-gray-500 text-sm">
              {data?.monthly.expenses.length || 0} transactions
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">

            <div className="flex flex-col sm:flex-row justify-between gap-5">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handlePeriodChange('daily')}
                    className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm ${
                      categoryPeriod === 'daily'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={handleWeekView}
                    className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm ${
                      categoryPeriod === 'weekly'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    This Week
                  </button>
                  <button
                    onClick={handleMonthView}
                    className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm ${
                      categoryPeriod === 'monthly'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    This Month
                  </button>
                </div>
              </div>
              
              {/* Date Navigation */}
              <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="flex items-center space-x-2">
                  <CalendarDays size={16} className="text-gray-600" />
                  <label className="text-sm font-medium text-gray-700">Select Date:</label>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const prevDay = new Date(selectedDate);
                      prevDay.setDate(prevDay.getDate() - 1);
                      handleDateChange(prevDay);
                    }}
                    className="p-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                    title="Previous Day"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <input
                    type="date"
                    value={formatDateForInput(selectedDate)}
                    onChange={(e) => handleDateChange(new Date(e.target.value))}
                    className="px-2 sm:px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => {
                      const nextDay = new Date(selectedDate);
                      nextDay.setDate(nextDay.getDate() + 1);
                      handleDateChange(nextDay);
                    }}
                    className="p-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                    title="Next Day"
                    disabled={selectedDate >= getCurrentDateInUserTimezone()}
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => handleDateChange(getCurrentDateInUserTimezone())}
                    className="px-2 sm:px-3 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm"
                  >
                    Today
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {data?.categoryStats && data.categoryStats.length > 0 ? (
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-md font-medium text-gray-800">Category Details</h3>
                  <span className="text-md font-semibold text-gray-700">
                    Total: {formatCurrency(data.categoryStats.reduce((sum, category) => sum + category.totalAmount, 0))}
                  </span>
                </div>
                <div className="overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {data.categoryStats.map((category) => {
                    const percentage = parseFloat(category.percentage || '0');
                    return (
                      <div
                        key={category.categoryId}
                        className="relative overflow-hidden flex items-center justify-between p-3 sm:p-4 rounded-lg border border-gray-200"
                      >
                        {/* Background bar with percentage fill */}
                        <div 
                          className="absolute inset-0 opacity-20 rounded-lg"
                          style={{ 
                            background: `linear-gradient(to right, ${category.categoryColor} ${percentage}%, transparent ${percentage}%)` 
                          }}
                        ></div>
                        
                        <div className="relative flex items-center space-x-3 z-10">
                          <div
                            className="w-3 h-3 sm:w-4 sm:h-4 rounded-full"
                            style={{ backgroundColor: category.categoryColor }}
                          ></div>
                          <div>
                            <h3 
                              className={`font-medium text-sm sm:text-base cursor-pointer hover:underline ${
                                selectedCategoryId === category.categoryId 
                                  ? 'text-blue-600' 
                                  : 'text-gray-900'
                              }`}
                              onClick={() => handleCategoryFilter(category.categoryId)}
                            >
                              {category.categoryName}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-500">
                              {category.count} transaction{category.count !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="relative flex items-center space-x-2 z-10">
                          <div className="text-right">
                            <p className="font-semibold text-gray-900 text-sm sm:text-base">
                              {formatCurrency(category.totalAmount)}
                            </p>
                            <p className="text-xs sm:text-sm font-medium" style={{ color: category.categoryColor }}>
                              {category.percentage || '0'}%
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteCategory(category.categoryId, category.categoryName)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title={`Delete ${category.categoryName} category`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  {data?.categoryStats ? 
                    `No category data available for this ${categoryPeriod === 'daily' ? 'day' : categoryPeriod === 'weekly' ? 'week' : 'month'}.` : 
                    'No expenses found for this period.'
                  }
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Start by adding your first expense!
                </p>
                {data && (
                  <div className="mt-4 text-xs text-gray-400">
                    <p>Debug info: categoryStats length = {data.categoryStats?.length || 0}</p>
                    <p>Period: {categoryPeriod}</p>
                    <p>Selected date: {selectedDate.toDateString()}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {data?.recent && data.recent.expenses && data.recent.expenses.length > 0 && (() => {
          // Backend now handles filtering, so just use all returned expenses
          const filteredExpenses = data.recent.expenses;
          
          const selectedCategoryName = selectedCategoryId 
            ? data.categoryStats?.find(cat => cat.categoryId === selectedCategoryId)?.categoryName 
            : null;

          return (
            <div className="mt-6 sm:mt-8 bg-white rounded-lg shadow">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                    Recent Spent
                    {selectedCategoryName && (
                      <span className="text-blue-600"> - {selectedCategoryName}</span>
                    )}
                  </h2>
                  {selectedCategoryId && (
                    <button
                      onClick={() => setSelectedCategoryId(null)}
                      className="text-sm text-blue-600 hover:text-blue-800 underline mt-1"
                    >
                      Show all transactions
                    </button>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  Showing {filteredExpenses.length} of {data.recent.pagination.totalItems} expenses
                </div>
              </div>
              <div className="p-4 sm:p-6">
                {filteredExpenses.length > 0 ? (
                  <div className="space-y-3">
                    {filteredExpenses.map((expense: any) => (
                  <div
                    key={expense._id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: expense.categoryId?.color || '#3B82F6' }}
                      ></div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                          {expense.description}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500 truncate">
                          {expense.categoryId?.name || new Date(expense.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {' '}
                          {new Date(expense.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                      <p className="font-semibold text-gray-900 text-sm sm:text-base">
                        {formatCurrency(expense.amount)}
                      </p>
                      <button
                        onClick={() => handleDeleteExpense(expense._id, expense.description)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title={`Delete ${expense.description}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      No transactions found for {selectedCategoryName}
                    </p>
                    <button
                      onClick={() => setSelectedCategoryId(null)}
                      className="text-sm text-blue-600 hover:text-blue-800 underline mt-2"
                    >
                      Show all transactions
                    </button>
                  </div>
                )}
                
                {/* Pagination - only show if not filtering and has multiple pages */}
                {!selectedCategoryId && data.recent.pagination.totalPages > 1 && (
                  <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between border-t pt-4 space-y-4 sm:space-y-0">
                    <div className="text-sm text-gray-500 text-center sm:text-left">
                      Page {data.recent.pagination.currentPage} of {data.recent.pagination.totalPages}
                    </div>
                    <div className="flex justify-center sm:justify-end space-x-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={!data.recent.pagination.hasPrevPage}
                        className="flex items-center px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={16} className="mr-1" />
                        <span className="hidden sm:inline">Previous</span>
                      </button>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={!data.recent.pagination.hasNextPage}
                        className="flex items-center px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight size={16} className="ml-1" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </main>

      <ExpenseForm onExpenseAdded={() => fetchDashboardData(currentPage, categoryPeriod, selectedDate, selectedCategoryId)} />
      
      {/* Delete Confirmation Popup */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Confirm Delete</h2>
              <button
                onClick={cancelDelete}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600">
                Are you sure you want to delete{' '}
                <span className="font-medium">
                  {deleteConfirmation.type === 'expense' ? 'expense' : 'category'} "{deleteConfirmation.name}"
                </span>
                ?
              </p>
              {deleteConfirmation.type === 'category' && (
                <p className="text-sm text-amber-600 mt-2">
                  Warning: This will also delete all expenses in this category.
                </p>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}