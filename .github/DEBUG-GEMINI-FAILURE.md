# Gemini Still Not Working - Debug Steps

## Current Status
❌ `detectionSource: "Vision API"` - Still using fallback  
❌ `geminiDetails: null` - Gemini returning nothing

This means either:
1. IAM permissions haven't propagated yet (wait 2-5 minutes)
2. IAM role wasn't added correctly
3. Wrong service account was modified
4. There's a different error in the Gemini code

---

## STEP 1: Check Cloud Function Logs

### Option 1: Firebase Console (Easiest)
1. Open: https://console.firebase.google.com/project/pantryai-3d396/functions/logs
2. You should see recent entries with timestamps
3. Look for these specific messages:

**What you should see:**
```
Attempting Gemini AI analysis...
=== GEMINI ANALYSIS START ===
Image data length: [some number]
Gemini failed, falling back to Vision API:
Error message: [THE IMPORTANT PART]
```

**Common errors:**

**Error A: Permission Denied**
```
Error message: 7 PERMISSION_DENIED: Permission 'aiplatform.endpoints.predict' denied
```
→ IAM role not added or wrong service account

**Error B: Model Not Found**
```
Error message: 5 NOT_FOUND: Model not found
```
→ Model name is wrong

**Error C: Region Issue**
```
Error message: Location not found
```
→ Region issue

### Option 2: Google Cloud Console
1. Open: https://console.cloud.google.com/logs/query?project=pantryai-3d396
2. Paste this query:
   ```
   resource.type="cloud_run_revision"
   resource.labels.service_name="analyzeimage"
   severity>=DEFAULT
   ```
3. Click "Run Query"
4. Look for recent logs with "Gemini" in them

---

## STEP 2: Verify IAM Permissions

Go to: https://console.cloud.google.com/iam-admin/iam?project=pantryai-3d396

**What to check:**

1. Find the service account that's running the function (one of these):
   - `pantryai-3d396@appspot.gserviceaccount.com`
   - OR something like `[number]-compute@developer.gserviceaccount.com`

2. Click the account to expand roles

3. **YOU MUST SEE:**
   - "Vertex AI User" in the list of roles
   - OR "Vertex AI Administrator"
   - OR "Owner" (has all permissions)

4. If you DON'T see it:
   - Click the pencil icon
   - Click "+ ADD ANOTHER ROLE"
   - Search "Vertex AI User"
   - Add it and SAVE
   - Wait 5 minutes and test again

---

## STEP 3: Alternative - Try a Different Approach

If IAM is too complicated, I can modify the code to:

### Option A: Use a simpler Gemini API
Try using the REST API instead of the SDK

### Option B: Use a different AI service
Fall back to Claude or OpenAI (if you have API keys)

### Option C: Enhance the existing Vision API detection
Make the OCR text detection smarter to catch "Sheep Milk" from "Ovče mleko"

Which would you prefer?

---

## Quick Checklist

- [ ] Check logs in Firebase Console
- [ ] Find the exact error message
- [ ] Verify IAM has "Vertex AI User" role
- [ ] Wait 5 minutes after adding role
- [ ] Test again

---

## Tell Me:

1. What error message do you see in the logs?
2. Did you add "Vertex AI User" role to the service account?
3. Which service account did you add it to?
4. Do you want to try an alternative approach instead?
