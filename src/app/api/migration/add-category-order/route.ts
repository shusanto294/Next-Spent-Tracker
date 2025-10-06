import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    console.log('🔄 Starting category order migration...');

    // Get all categories
    const categoriesSnapshot = await adminDb.collection('categories').get();
    console.log(`✅ Found ${categoriesSnapshot.size} total categories`);

    // Filter categories without order field
    const categoriesWithoutOrder = categoriesSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.order === undefined || data.order === null;
    });

    console.log(`📦 Found ${categoriesWithoutOrder.length} categories without order field`);

    if (categoriesWithoutOrder.length === 0) {
      return NextResponse.json({
        message: 'All categories already have order field',
        updated: 0
      });
    }

    // Group categories by userId to maintain separate ordering per user
    const categoriesByUser: Record<string, any[]> = {};
    categoriesWithoutOrder.forEach(doc => {
      const data = doc.data();
      const userId = data.userId;
      if (!categoriesByUser[userId]) {
        categoriesByUser[userId] = [];
      }
      categoriesByUser[userId].push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt
      });
    });

    let totalUpdated = 0;

    // Update each user's categories with proper order
    for (const [userId, userCategories] of Object.entries(categoriesByUser)) {
      console.log(`🔄 Processing ${userCategories.length} categories for user ${userId}`);

      // Sort by creation date to maintain consistent ordering
      userCategories.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateA.getTime() - dateB.getTime();
      });

      // Update each category with its order using batch
      const batch = adminDb.batch();
      userCategories.forEach((category, index) => {
        console.log(`📝 Setting category "${category.name}" (${category.id}) to order ${index}`);
        const categoryRef = adminDb.collection('categories').doc(category.id);
        batch.update(categoryRef, { order: index });
      });

      await batch.commit();
      totalUpdated += userCategories.length;

      console.log(`✅ Updated ${userCategories.length} categories for user ${userId}`);
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