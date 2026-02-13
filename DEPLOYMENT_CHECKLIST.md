# JeffBoard Deployment Checklist

Use this checklist to ensure your JeffBoard deployment is complete and correct.

## Pre-Deployment Checklist

### 1. Firebase Project Setup

- [ ] Firebase project created at https://console.firebase.google.com
- [ ] Project ID noted: `_________________`
- [ ] Firestore enabled in production mode
- [ ] Firebase Authentication enabled
- [ ] Google sign-in provider enabled in Authentication
- [ ] Firebase Hosting enabled

### 2. Local Configuration

- [ ] Firebase CLI installed: `npm install -g firebase-tools`
- [ ] Logged in to Firebase: `firebase login`
- [ ] Project linked: `firebase use --add`
- [ ] `.firebaserc` file exists with correct project ID
- [ ] `.env` file exists with Firebase config values
- [ ] All dependencies installed: `npm install`
- [ ] CLI dependencies installed: `cd cli && npm install`

### 3. Firebase Configuration Files

- [ ] `firebase.json` exists with hosting and firestore config
- [ ] `firestore.rules` exists with security rules
- [ ] `firestore.indexes.json` exists with composite indexes

### 4. Service Account Setup (for CLI)

- [ ] Service account key generated from Firebase Console
- [ ] Service account JSON file saved securely **outside repo**
- [ ] `JEFFBOARD_SERVICE_ACCOUNT` environment variable set
- [ ] Environment variable points to correct file path

### 5. Build Verification

- [ ] PWA builds successfully: `npm run build`
- [ ] CLI builds successfully: `cd cli && npm run build`
- [ ] No TypeScript errors
- [ ] No build warnings (chunk size warning is OK)

## Deployment Checklist

### Step 1: Deploy Firestore Configuration

```bash
npm run deploy:firestore
```

- [ ] Rules deployed successfully
- [ ] Indexes deployed successfully
- [ ] Indexes building (check status with `firebase firestore:indexes`)
- [ ] Indexes finished building (may take 1-5 minutes)

### Step 2: Get Your Firebase Auth UID

```bash
npm run dev
# Open http://localhost:5173, sign in, get UID from console
```

- [ ] Development server started
- [ ] Signed in with Google
- [ ] UID obtained from browser console
- [ ] UID copied: `_________________`

### Step 3: Seed Initial Data

```bash
cd cli
npm run build
npm start seed -- --uid YOUR_UID_HERE
```

- [ ] CLI built successfully
- [ ] Seed command completed
- [ ] 6 agents created
- [ ] Sample project created
- [ ] 10 sample stories created
- [ ] UID added to allowed users list

### Step 4: Verify Local Build

```bash
npm run build
npm run preview
# Open http://localhost:4173
```

- [ ] Build completed successfully
- [ ] Preview server started
- [ ] Can sign in with Google
- [ ] Sample project visible in selector
- [ ] Stories visible on board
- [ ] Board columns swipeable on mobile/responsive view
- [ ] Can view story details

### Step 5: Deploy to Firebase Hosting

```bash
npm run deploy:hosting
```

- [ ] Build completed
- [ ] Deployment successful
- [ ] Hosting URL displayed
- [ ] Hosting URL noted: `https://_________________.web.app`

### Step 6: Verify Production Deployment

- [ ] Open hosting URL in desktop browser
- [ ] Sign in with Google
- [ ] Sample project visible
- [ ] Stories load correctly
- [ ] Can navigate between columns
- [ ] Can view story details
- [ ] Dark mode works (if system is in dark mode)

### Step 7: Verify on iPhone

- [ ] Open hosting URL in Safari on iPhone
- [ ] Sign in with Google
- [ ] Board loads and is responsive
- [ ] Columns swipe smoothly
- [ ] Tap "Share" → "Add to Home Screen"
- [ ] Icon added to Home Screen
- [ ] Open from Home Screen (runs in standalone mode)
- [ ] No Safari UI visible
- [ ] App loads correctly

### Step 8: Verify CLI Integration

```bash
cd cli

# Test update command
npm start update -- --story STORY_ID --status in-progress --agent lead-engineer

# Test note command
npm start note -- --story STORY_ID --text "Test note" --author lead-engineer

# Test list command
npm start list
```

- [ ] Update command works
- [ ] Story status changed in PWA (within 1-2 seconds)
- [ ] Toast notification appeared in PWA
- [ ] Note command works
- [ ] Note visible in story detail view
- [ ] List command shows all stories

### Step 9: Verify Real-Time Updates

1. Open PWA on iPhone
2. Run CLI command to update a story
3. Verify story updates in real-time on iPhone

- [ ] Story status change reflected within 1-2 seconds
- [ ] Toast notification appeared
- [ ] Card moved to correct column
- [ ] Activity log updated with new entry

## Post-Deployment

### Security Verification

- [ ] Only authenticated users can access the app
- [ ] Only your UID can read data (verify with different Google account)
- [ ] PWA cannot write data (read-only mode)
- [ ] CLI can write data (Admin SDK bypasses rules)

### Performance Verification

- [ ] Initial load time < 3 seconds on fast connection
- [ ] Board renders smoothly (60fps)
- [ ] Column swipe is smooth
- [ ] Story detail sheet opens/closes smoothly
- [ ] Real-time updates arrive within 2 seconds

### Mobile Verification

- [ ] Responsive layout on iPhone
- [ ] Touch targets are large enough (48px minimum)
- [ ] No horizontal scrolling (except column swipe)
- [ ] Text is readable without zooming
- [ ] Dark mode respects system preference
- [ ] PWA icon looks correct on Home Screen

## Troubleshooting

If any step fails, see the [Troubleshooting section](./README.md#troubleshooting) in README.md.

### Common Issues

**"Permission denied" in CLI:**
- Verify `JEFFBOARD_SERVICE_ACCOUNT` is set correctly
- Verify service account file exists and is valid JSON
- Verify service account has "Firebase Admin SDK Administrator" role

**"Index not found" errors:**
- Wait for indexes to finish building (1-5 minutes)
- Check status: `firebase firestore:indexes`
- Re-deploy if needed: `npm run deploy:indexes`

**Stories not appearing:**
- Verify seed command completed successfully
- Verify correct project selected in PWA
- Check filters (agent filter, priority filter, search)

**PWA not updating after deployment:**
- Close app completely on iPhone
- Remove from Home Screen and re-add
- Clear Safari cache

**"Not authenticated" errors:**
- Verify your UID is in `config/allowedUsers` collection
- Re-run seed command with correct UID
- Check Firestore in Firebase Console

## Maintenance

### Regular Tasks

**Deploy code changes:**
```bash
npm run deploy:hosting
```

**Update security rules:**
```bash
npm run deploy:rules
```

**Add new indexes (after query changes):**
```bash
npm run deploy:indexes
```

**Monitor Firebase usage:**
- Firebase Console → Usage and Billing
- Verify staying within free tier limits

### Backup Strategy

- **Code**: Versioned in Git
- **Data**: Firestore automatically backed up by Firebase
- **Manual export**: `firebase firestore:export gs://your-bucket/backup`

## Success Criteria

✅ All checklist items complete
✅ PWA accessible on iPhone from Home Screen
✅ Real-time updates working (CLI → PWA within 2 seconds)
✅ Authentication working (only allowed users can access)
✅ No console errors in browser DevTools
✅ CLI commands working from terminal
✅ Smooth, responsive UI on iPhone

---

**Deployment Complete!** 🚀

Your JeffBoard is now live and ready for AI agent integration.

Next steps:
- Integrate CLI with your AI agents
- Create real projects and stories
- Monitor Firebase usage in Console
- Iterate on features as needed
