import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
  writeBatch,
  startAfter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Expense interface
export interface Expense {
  id?: string;
  userId: string;
  amount: number;
  description: string;
  categoryId: string;
  date: Date;
  createdAt: Date;
}

// Category interface
export interface Category {
  id?: string;
  userId: string;
  name: string;
  color: string;
  order: number;
  createdAt: Date;
}

// User Settings interface
export interface UserSettings {
  currency: string;
  currencySymbol: string;
  timezone: string;
}

// ============= EXPENSES =============

export async function createExpense(expense: Omit<Expense, 'id' | 'createdAt'>) {
  const expenseData = {
    ...expense,
    date: Timestamp.fromDate(expense.date),
    createdAt: Timestamp.fromDate(new Date()),
  };

  const docRef = await addDoc(collection(db, 'expenses'), expenseData);
  return { id: docRef.id, ...expense, createdAt: new Date() };
}

export async function getExpenses(userId: string, options: {
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  lastDoc?: QueryDocumentSnapshot;
} = {}) {
  let q = query(
    collection(db, 'expenses'),
    where('userId', '==', userId),
    orderBy('date', 'desc')
  );

  if (options.categoryId) {
    q = query(q, where('categoryId', '==', options.categoryId));
  }

  if (options.startDate) {
    q = query(q, where('date', '>=', Timestamp.fromDate(options.startDate)));
  }

  if (options.endDate) {
    q = query(q, where('date', '<=', Timestamp.fromDate(options.endDate)));
  }

  if (options.limit) {
    q = query(q, firestoreLimit(options.limit));
  }

  if (options.lastDoc) {
    q = query(q, startAfter(options.lastDoc));
  }

  const snapshot = await getDocs(q);
  const expenses = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date.toDate(),
    createdAt: doc.data().createdAt.toDate(),
  })) as Expense[];

  return { expenses, lastDoc: snapshot.docs[snapshot.docs.length - 1] };
}

export async function getExpenseById(expenseId: string) {
  const docRef = doc(db, 'expenses', expenseId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
    date: docSnap.data().date.toDate(),
    createdAt: docSnap.data().createdAt.toDate(),
  } as Expense;
}

export async function updateExpense(expenseId: string, updates: Partial<Expense>) {
  const docRef = doc(db, 'expenses', expenseId);
  const updateData: any = { ...updates };

  if (updates.date) {
    updateData.date = Timestamp.fromDate(updates.date);
  }

  await updateDoc(docRef, updateData);
}

export async function deleteExpense(expenseId: string) {
  const docRef = doc(db, 'expenses', expenseId);
  await deleteDoc(docRef);
}

export async function deleteExpensesByCategory(categoryId: string, userId: string) {
  const q = query(
    collection(db, 'expenses'),
    where('userId', '==', userId),
    where('categoryId', '==', categoryId)
  );

  const snapshot = await getDocs(q);
  const batch = writeBatch(db);

  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}

// ============= CATEGORIES =============

export async function createCategory(category: Omit<Category, 'id' | 'createdAt'>) {
  const categoryData = {
    ...category,
    createdAt: Timestamp.fromDate(new Date()),
  };

  const docRef = await addDoc(collection(db, 'categories'), categoryData);
  return { id: docRef.id, ...category, createdAt: new Date() };
}

export async function getCategories(userId: string) {
  const q = query(
    collection(db, 'categories'),
    where('userId', '==', userId),
    orderBy('order', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt.toDate(),
  })) as Category[];
}

export async function getCategoryById(categoryId: string) {
  const docRef = doc(db, 'categories', categoryId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt.toDate(),
  } as Category;
}

export async function updateCategory(categoryId: string, updates: Partial<Category>) {
  const docRef = doc(db, 'categories', categoryId);
  await updateDoc(docRef, updates);
}

export async function deleteCategory(categoryId: string) {
  const docRef = doc(db, 'categories', categoryId);
  await deleteDoc(docRef);
}

export async function updateCategoryColors(updates: { categoryId: string; color: string }[]) {
  const batch = writeBatch(db);

  updates.forEach(update => {
    const docRef = doc(db, 'categories', update.categoryId);
    batch.update(docRef, { color: update.color });
  });

  await batch.commit();
}

export async function reorderCategories(categoryOrders: { categoryId: string; order: number }[]) {
  const batch = writeBatch(db);

  categoryOrders.forEach(item => {
    const docRef = doc(db, 'categories', item.categoryId);
    batch.update(docRef, { order: item.order });
  });

  await batch.commit();
}

// ============= USER SETTINGS =============

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  return {
    currency: data.currency || 'USD',
    currencySymbol: data.currencySymbol || '$',
    timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export async function updateUserSettings(userId: string, settings: Partial<UserSettings>) {
  const docRef = doc(db, 'users', userId);
  await updateDoc(docRef, settings);
}
