# Troubleshooting Production Issues

## 🔍 How to Debug

I've added detailed console logging to help diagnose issues. Follow these steps:

### Step 1: Open Browser Console
1. On your production site (https://expenses-6ac11.web.app)
2. Press **F12** (or right-click → Inspect)
3. Go to the **Console** tab
4. Keep it open while testing

### Step 2: Try to Register
1. Go to `/register`
2. Fill in all fields
3. Click "Sign up"
4. **Check console** - You should see:
   - `🔐 Registering user: your-email@example.com`
   - `✅ User created in Firebase Auth: [user-id]`
   - `💾 Creating user document in Firestore...`
   - `✅ User document created successfully`

### Step 3: Try to Login
1. Go to `/login`
2. Enter your email and password
3. Click "Sign in"
4. **Check console** - You should see:
   - `🔐 Logging in user: your-email@example.com`
   - `✅ User authenticated: [user-id]`
   - `📄 Fetching user document from Firestore...`
   - `✅ User data retrieved successfully`

---

## ❌ Common Errors and Solutions

### Error: "Firebase: Error (auth/invalid-credential)"

**Console shows:** `❌ Login error: auth/invalid-credential`

**Cause:** The user doesn't exist in Firebase Authentication

**Solutions:**
1. **Go to Firebase Console** → Authentication → Users
2. Check if your email is listed
3. If NOT listed, you need to register first
4. If listed, double-check your password (case-sensitive!)

---

### Error: "Email/Password provider is not enabled"

**Console shows:** `❌ Registration error: auth/operation-not-allowed`

**Cause:** Email/Password authentication is disabled

**Solution:**
1. Go to: https://console.firebase.google.com/project/expenses-6ac11/authentication/providers
2. Click on "Email/Password"
3. Toggle **Enable**
4. Click **Save**

---

### Error: "User data not found"

**Console shows:**
- `✅ User authenticated: [user-id]`
- `❌ User document not found in Firestore`

**Cause:** User exists in Auth but not in Firestore database

**Solution:**
1. This is a data corruption issue
2. Delete the user from Firebase Auth
3. Register again (this will create both Auth + Firestore records)

**To delete user:**
1. Go to: https://console.firebase.google.com/project/expenses-6ac11/authentication/users
2. Find the user
3. Click the **⋮** menu → Delete user

---

### Error: "Permission denied"

**Console shows:** `❌ Login error: permission-denied`

**Cause:** Firestore security rules are blocking access

**Solution:**
```bash
# Redeploy Firestore rules
firebase deploy --only firestore:rules
```

---

## 🔧 Quick Fixes

### Fix 1: Redeploy Everything
```bash
npm run build
firebase deploy
```

### Fix 2: Clear Browser Cache
1. Press **Ctrl+Shift+Delete** (or Cmd+Shift+Delete on Mac)
2. Select "Cached images and files"
3. Click "Clear data"
4. Refresh the page

### Fix 3: Test in Incognito/Private Mode
This rules out browser cache/cookie issues

---

## 📊 What to Check in Firebase Console

### 1. Authentication Status
**URL:** https://console.firebase.google.com/project/expenses-6ac11/authentication/providers

✅ **Email/Password** should be **Enabled** (green toggle)

### 2. Registered Users
**URL:** https://console.firebase.google.com/project/expenses-6ac11/authentication/users

✅ You should see your email in the list after registration

### 3. Firestore Data
**URL:** https://console.firebase.google.com/project/expenses-6ac11/firestore/data

✅ Check collections:
- `users` - Should have a document with your user ID
- `categories` - Should appear after you create categories
- `expenses` - Should appear after you add expenses

### 4. Security Rules
**URL:** https://console.firebase.google.com/project/expenses-6ac11/firestore/rules

✅ Rules should match `firestore.rules` file in your project

---

## 🆘 Still Not Working?

### Share These Details:

1. **Exact error message** from the browser console (copy the full red text)
2. **What you see** when you try to register/login
3. **Screenshot** of the browser console showing the logs
4. **Firebase Console** - Are users appearing after registration?

### Check These:

- [ ] Email/Password auth is enabled in Firebase Console
- [ ] You're using a fresh browser tab (not cached)
- [ ] Your `.env.local` file has the correct Firebase config
- [ ] The production build was deployed (`firebase deploy`)
- [ ] Firestore rules were deployed (`firebase deploy --only firestore:rules`)

---

## 🚀 After It's Working

Once you can login successfully:

1. Remove the console.log statements for production (optional)
2. Test all features:
   - Add categories
   - Add expenses
   - View dashboard
   - Change settings
3. Monitor Firebase Console for any errors
