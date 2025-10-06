# Production Setup Guide

## Issue: Can't Login on Production Site

Your app is working correctly! Here's what's happening:

### Why Your Local Credentials Don't Work in Production:
- **Local dev** connects to Firebase Emulator or test data
- **Production** connects to live Firebase
- Users in local dev ≠ Users in production Firebase

## ✅ Fix: Enable Firebase Authentication

### Step 1: Enable Email/Password Authentication
1. Go to: https://console.firebase.google.com/project/expenses-6ac11/authentication/providers
2. Click **Email/Password** (should be in the list)
3. Make sure it's **Enabled** (toggle should be green)
4. Click **Save**

### Step 2: Register a New Account
1. Go to your live site: `https://expenses-6ac11.web.app/register`
2. Fill in all the fields:
   - First Name
   - Last Name
   - Country (this auto-fills currency and timezone)
   - Currency
   - Timezone
   - Email
   - Password
3. Click **Sign up**
4. You'll be redirected to `/login` (this is correct behavior)
5. Now login with your new credentials

### Step 3: Verify in Firebase Console
1. Go to: https://console.firebase.google.com/project/expenses-6ac11/authentication/users
2. You should see your newly registered user
3. The user's email should be verified automatically

## 🔒 Security Note

Your Firestore rules are properly configured to:
- ✅ Require authentication for all operations
- ✅ Users can only access their own data
- ✅ No one can access other users' expenses or categories

## 🐛 Common Issues

### "Firebase: Error (auth/invalid-credential)"
**Cause:** User doesn't exist in production Firebase
**Fix:** Register a new account using the `/register` page

### "Register page redirects to login"
**This is correct!** After successful registration, you need to login with your new credentials.

### "Can't see my data from local dev"
**This is expected!** Local and production use different Firebase databases. You need to:
1. Register in production
2. Login in production
3. Add new categories and expenses in production

## 🚀 Next Steps

1. Enable Email/Password auth in Firebase Console
2. Register a new account on your live site
3. Login and start using the app
4. Your data will be saved in production Firebase

## 📞 Still Having Issues?

Check the browser console (F12) for specific error messages.
