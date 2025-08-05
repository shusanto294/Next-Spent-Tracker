import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Category from '@/models/Category';

export async function POST(req: NextRequest) {
  try {
    console.log('🔄 Starting category order migration...');
    
    await connectDB();
    console.log('✅ Database connected');

    // Find all categories that don't have an order field (or have null/undefined order)
    const categoriesWithoutOrder = await Category.find({
      $or: [
        { order: { $exists: false } },
        { order: null },
        { order: undefined }
      ]
    });

    console.log(`📦 Found ${categoriesWithoutOrder.length} categories without order field`);

    if (categoriesWithoutOrder.length === 0) {
      return NextResponse.json({ 
        message: 'All categories already have order field',
        updated: 0
      });
    }

    // Group categories by userId to maintain separate ordering per user
    const categoriesByUser = categoriesWithoutOrder.reduce((acc, category) => {
      const userId = category.userId.toString();
      if (!acc[userId]) {
        acc[userId] = [];
      }
      acc[userId].push(category);
      return acc;
    }, {} as Record<string, any[]>);

    let totalUpdated = 0;

    // Update each user's categories with proper order
    for (const [userId, userCategories] of Object.entries(categoriesByUser)) {
      console.log(`🔄 Processing ${userCategories.length} categories for user ${userId}`);
      
      // Sort by creation date to maintain consistent ordering
      userCategories.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      // Update each category with its order
      const updatePromises = userCategories.map((category, index) => {
        console.log(`📝 Setting category "${category.name}" (${category._id}) to order ${index}`);
        return Category.findByIdAndUpdate(
          category._id,
          { order: index },
          { new: true }
        );
      });

      const results = await Promise.all(updatePromises);
      const successCount = results.filter(Boolean).length;
      totalUpdated += successCount;
      
      console.log(`✅ Updated ${successCount}/${userCategories.length} categories for user ${userId}`);
    }

    console.log(`🎉 Migration complete! Updated ${totalUpdated} categories total`);

    return NextResponse.json({ 
      message: 'Category order migration completed successfully',
      updated: totalUpdated,
      details: Object.keys(categoriesByUser).map(userId => ({
        userId,
        count: categoriesByUser[userId].length
      }))
    });

  } catch (error) {
    console.error('❌ Migration error:', error);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}