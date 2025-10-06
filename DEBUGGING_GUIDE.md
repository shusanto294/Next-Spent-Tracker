# Debugging Guide for Categories Not Showing

## Current Status
✅ Firebase is configured correctly
✅ Code has been updated with logging
✅ Dev server is running on http://localhost:3001

## The Problem
Categories are not loading or displaying in the ExpenseForm.

## Root Cause
Most likely **Firestore Security Rules** haven't been deployed yet.

## Solution Steps

### 1. Deploy Firestore Rules (MOST IMPORTANT)
```bash
# Login to Firebase
firebase login

# Deploy rules and indexes
firebase deploy --only firestore
```

### 2. Test the App
1. Open http://localhost:3001 in your browser
2. **Open Browser Console** (F12 or Right-click > Inspect > Console tab)
3. Login with your credentials
4. Go to Dashboard
5. Click the "+" button to open Add Expense form
6. Check the console for these log messages:
   - `🔄 ExpenseForm: Fetching categories for user: [user-id]`
   - `🔍 firestoreService: Getting categories for userId: [user-id]`
   - `📊 firestoreService: Found X categories`

### 3. If You See Permission Errors
If console shows errors like:
- `FirebaseError: Missing or insufficient permissions`
- `PERMISSION_DENIED`

**This confirms the rules need to be deployed:**
```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 4. Create a Test Category
1. In the Add Expense form, click "+ New Category"
2. Type a name (e.g., "Food")
3. Click "Add"
4. Watch the console for:
   - `➕ ExpenseForm: Creating new category: Food`
   - `➕ firestoreService: Creating category: {...}`
   - `✅ firestoreService: Category created with ID: [id]`
   - `🔄 ExpenseForm: Fetching categories...`
   - `📊 firestoreService: Found 1 categories`

### 5. If Categories Still Don't Show
Check the console for JavaScript errors. Common issues:
- **Index not created**: Console will show a link to create the index in Firebase Console
- **Network error**: Check your internet connection
- **Auth issue**: Make sure you're logged in

## Quick Test Commands

```bash
# 1. Make sure dev server is running
npm run dev

# 2. Deploy Firebase (in another terminal)
firebase deploy --only firestore

# 3. Build for production (when everything works)
npm run build

# 4. Deploy to Firebase Hosting
firebase deploy --only hosting
```

## Firestore Console Check
1. Go to https://console.firebase.google.com
2. Select project: **expenses-6ac11**
3. Go to **Firestore Database**
4. Check if `categories` collection exists
5. Check if documents have proper fields: `userId`, `name`, `color`, `order`, `createdAt`

## Expected Firestore Document Structure

### Category Document
```json
{
  "userId": "firebase-auth-user-id",
  "name": "Food",
  "color": "#3B82F6",
  "order": 0,
  "createdAt": "Timestamp"
}
```

## Still Having Issues?
1. Clear browser cache and cookies
2. Try incognito/private browsing mode
3. Check browser console for any red error messages
4. Share the console logs for further debugging
