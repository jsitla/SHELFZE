# Gemini Integration Troubleshooting Guide

## Current Status
✅ Gemini SDK installed (`@google-cloud/vertexai`)  
✅ Cloud Function deployed with Gemini integration  
✅ Enhanced error logging added  
⚠️ **Vertex AI API needs to be enabled**

---

## Issue: Still Showing "Dairy" Instead of "Sheep Milk"

### Most Likely Cause
**Vertex AI API is not enabled in your Google Cloud project.**

When the API isn't enabled, Gemini calls fail silently and the system falls back to Vision API, which shows generic categories like "Dairy product".

---

## Solution Steps

### Step 1: Enable Vertex AI API (REQUIRED)
1. **Open this link**: https://console.cloud.google.com/apis/library/aiplatform.googleapis.com?project=pantryai-3d396
2. Click the blue **"ENABLE"** button
3. Wait 1-2 minutes for activation

### Step 2: Test Your App Again
1. Scan your sheep milk bottle
2. Check what detection you get

### Step 3: Check Cloud Function Logs
After scanning, check the logs to see what happened:

```powershell
cd C:\Users\denis\Pantryai
firebase functions:log --limit 20
```

#### What to Look For:

**✅ SUCCESS - Gemini is working:**
```
=== GEMINI ANALYSIS START ===
Image data length: 123456
Gemini raw response: {"productName": "Sheep Milk", ...}
Gemini parsed result: { productName: 'Sheep Milk', category: 'dairy', ... }
Using Gemini detection: Sheep Milk
```

**❌ FAILURE - API not enabled:**
```
Attempting Gemini AI analysis...
Gemini failed, falling back to Vision API:
Error message: 7 PERMISSION_DENIED: Vertex AI API has not been used in project...
Using Vision API detection: Dairy product
```

**❌ FAILURE - Authentication issue:**
```
Error message: Could not load the default credentials
```

---

## Alternative: Check Logs in Firebase Console

1. Go to: https://console.firebase.google.com/project/pantryai-3d396/functions/logs
2. Filter by `analyzeImage` function
3. Look for the log messages mentioned above

---

## Code Changes Made

### Fixed Issues:
1. ✅ Changed `vertexAI.preview.getGenerativeModel` → `vertexAI.getGenerativeModel`
2. ✅ Added comprehensive logging to track Gemini calls
3. ✅ Added error stack traces for better debugging
4. ✅ Enhanced error messages

### Current Detection Priority:
1. **Gemini AI** (most specific) - "Sheep Milk"
2. **OCR Text** (multilingual) - "Ovče mleko" → "Sheep Milk"  
3. **Vision API Labels** (generic) - "Dairy product"

---

## Testing Checklist

After enabling Vertex AI API:

- [ ] Wait 2 minutes for API activation
- [ ] Restart your app if needed
- [ ] Scan the sheep milk bottle
- [ ] Check the item name shown
- [ ] Check Cloud Function logs
- [ ] Verify "Using Gemini detection:" appears in logs

---

## If Still Not Working

### Option 1: Check Service Account Permissions
The Cloud Function might need explicit Vertex AI permissions:

1. Go to: https://console.cloud.google.com/iam-admin/iam?project=pantryai-3d396
2. Find the service account: `pantryai-3d396@appspot.gserviceaccount.com`
3. Click "Edit"
4. Add role: **"Vertex AI User"**
5. Save

### Option 2: Check Region Availability
Gemini might not be available in all regions. If you get region errors:
- The function uses `us-central1` (should work)
- You can try changing to `us-east1` or `europe-west1` if needed

### Option 3: Verify Model Name
Current model: `gemini-1.5-flash`  
Alternative: `gemini-1.5-pro` (more accurate but slower/expensive)

---

## Expected Behavior After Fix

### Before (Vision API only):
```
Item: Dairy product
Category: dairy
Confidence: 0.95
Source: Vision API
```

### After (Gemini AI):
```
Item: Sheep Milk
Category: dairy
Confidence: 0.90
Source: Gemini AI
Details: Ovče mleko, bottled dairy product
```

---

## Quick Debug Command

Run this after scanning to see immediate feedback:

```powershell
firebase functions:log --limit 5
```

Look for:
- "Attempting Gemini AI analysis..."
- "Gemini raw response:"
- "Using Gemini detection:" or "Using Vision API detection:"

---

## Contact

If issues persist after enabling Vertex AI API and checking logs, please share:
1. The error message from Cloud Function logs
2. Screenshot of what the app shows
3. Confirmation that Vertex AI API is enabled
