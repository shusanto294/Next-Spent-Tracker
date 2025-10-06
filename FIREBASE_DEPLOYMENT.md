# Firebase Deployment Guide

## Overview
Your Next.js Spent Tracker app has been successfully migrated from MongoDB to Firebase! The app now uses:
- **Firebase Authentication** for user management
- **Cloud Firestore** for database storage
- **Firebase Hosting** for deployment (with Cloud Functions for API routes)

## Important Note About Hosting

**Your app CANNOT be deployed to Firebase Hosting as a static site** because it has API routes that need server-side execution. You have **two deployment options**:

### Option 1: Deploy to Vercel (Recommended - Easiest)
Vercel is built for Next.js and supports all your API routes automatically.

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add environment variables (see below)
4. Deploy!

### Option 2: Firebase Hosting + Cloud Functions (More Complex)
Use Firebase Hosting with Next.js Cloud Functions integration.

**Requirements:**
- Install Firebase CLI: `npm install -g firebase-tools`
- Install Next.js Firebase adapter: `npm install --save-dev firebase-functions firebase-tools`

**Note:** This requires additional configuration and is more complex. Option 1 (Vercel) is recommended.

## Firebase Setup Steps

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Follow the wizard to create your project
4. Enable Google Analytics (optional)

### 2. Enable Firebase Authentication

1. In Firebase Console, go to **Authentication** → **Get Started**
2. Click on **Sign-in method** tab
3. Enable **Email/Password** provider
4. Save

### 3. Create Firestore Database

1. In Firebase Console, go to **Firestore Database** → **Create Database**
2. Choose **Production mode** (we have security rules)
3. Select a location close to your users
4. Click **Enable**

### 4. Deploy Firestore Security Rules

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 5. Get Firebase Configuration

#### Client SDK Config (Public):
1. Go to Project Settings (⚙️ icon) → **Your apps**
2. Click the web icon (</>) to add a web app
3. Copy the config object values

#### Admin SDK Config (Private - Server-side):
1. Go to Project Settings → **Service Accounts**
2. Click **Generate New Private Key**
3. Save the JSON file securely (DO NOT commit to git!)

### 6. Set Environment Variables

Create a `.env.local` file (copy from `.env.example`):

```bash
# Client SDK (from Firebase Web App Config)
NEXT_PUBLIC_FIREBASE_API_KEY=your-actual-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456:web:abcdef

# Admin SDK (from Service Account JSON)
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key\n-----END PRIVATE KEY-----\n"
```

**For Vercel Deployment:**
- Add all these variables in Vercel Dashboard → Settings → Environment Variables
- Make sure to replace `\n` with actual newlines for FIREBASE_PRIVATE_KEY

### 7. Test Locally

```bash
npm run dev
```

Visit `http://localhost:3000` and test:
1. User registration
2. Login
3. Creating categories
4. Adding expenses
5. Viewing stats

## Firestore Data Structure

### Collections:

#### `users/{userId}`
```javascript
{
  id: string,
  firstName: string,
  lastName: string,
  name: string,
  email: string,
  country: string,
  currency: string,
  currencySymbol: string,
  timezone: string,
  createdAt: Timestamp
}
```

#### `categories/{categoryId}`
```javascript
{
  userId: string,
  name: string,
  color: string,
  order: number,
  createdAt: Timestamp
}
```

#### `expenses/{expenseId}`
```javascript
{
  userId: string,
  amount: number,
  description: string,
  categoryId: string,
  date: Timestamp,
  createdAt: Timestamp
}
```

## Deployment to Vercel (Recommended)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Migrated to Firebase"
git push origin main
```

### Step 2: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click **Import Project**
4. Select your repository
5. Configure:
   - Framework Preset: **Next.js**
   - Build Command: `npm run build`
   - Output Directory: `.next`
6. Add Environment Variables (all from .env.local)
7. Click **Deploy**

### Step 3: Update Firebase Auth Domain
1. After deployment, copy your Vercel URL (e.g., `your-app.vercel.app`)
2. Go to Firebase Console → Authentication → Settings
3. Add your Vercel domain to **Authorized domains**

## Troubleshooting

### Issue: "Firebase: Error (auth/unauthorized-domain)"
**Solution:** Add your deployment domain to Firebase Console → Authentication → Settings → Authorized domains

### Issue: "Firestore permission denied"
**Solution:**
1. Ensure user is logged in
2. Check Firestore rules are deployed: `firebase deploy --only firestore:rules`
3. Verify userId matches in documents

### Issue: "Admin SDK error: Invalid service account"
**Solution:**
1. Check FIREBASE_PRIVATE_KEY has proper newlines (`\n`)
2. Verify FIREBASE_CLIENT_EMAIL is correct
3. Ensure service account has Firestore and Auth permissions

### Issue: API routes return 500 errors
**Solution:**
1. Check environment variables are set correctly
2. Look at Vercel function logs for detailed errors
3. Ensure Firebase Admin SDK is initialized properly

## Migration Notes

### What Changed:
- ✅ MongoDB → Cloud Firestore
- ✅ JWT Authentication → Firebase Authentication
- ✅ bcrypt password hashing → Firebase handles it
- ✅ All API routes updated to use Firestore
- ✅ Frontend code remains unchanged (compatible API responses)

### What's Removed:
- ❌ MongoDB connection (`src/lib/mongodb.ts`)
- ❌ Mongoose models (`src/models/`)
- ❌ MongoDB/JWT dependencies

### What's New:
- ✨ Firebase client SDK (`src/lib/firebase.ts`)
- ✨ Firebase Admin SDK (`src/lib/firebaseAdmin.ts`)
- ✨ Updated auth middleware (`src/middleware/auth.ts`)
- ✨ Firestore security rules (`firestore.rules`)
- ✨ Firestore indexes (`firestore.indexes.json`)

## Performance Optimization

### Firestore Composite Indexes
The app uses these composite indexes for optimal performance:
- `expenses`: (userId, date DESC)
- `expenses`: (userId, categoryId, date DESC)
- `categories`: (userId, order ASC)

These are automatically created from `firestore.indexes.json` when you run:
```bash
firebase deploy --only firestore:indexes
```

## Security

1. **Never commit `.env.local`** to git
2. **Use environment variables** for all sensitive data
3. **Firestore rules** ensure users can only access their own data
4. **Firebase Admin SDK** credentials should only be in server environment

## Support

For Firebase issues:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Support](https://firebase.google.com/support)

For Next.js deployment:
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
