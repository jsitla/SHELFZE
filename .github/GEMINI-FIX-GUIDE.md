# DIAGNOSIS: Gemini Not Working

## Current Status
✅ Cloud Function deployed with Gemini integration  
✅ Response shows `detectionSource: "Vision API"`  
✅ Response shows `geminiDetails: null`  
❌ **Gemini is failing - falling back to Vision API**

---

## Root Cause

Gemini is attempting to run but failing. This is evidenced by:
- `geminiDetails: null` (Gemini returned nothing)
- `detectionSource: "Vision API"` (fell back to Vision API)

The most likely reasons:

### 1. Vertex AI API Not Enabled (90% probability)
The API hasn't been activated in your Google Cloud project.

### 2. Permissions Issue (8% probability)
The Cloud Function service account doesn't have permission to use Vertex AI.

### 3. Authentication Issue (2% probability)
Credentials aren't being passed correctly.

---

## SOLUTION - Step by Step

### Step 1: Check Cloud Function Logs

**Option A: Firebase Console (Recommended)**
1. Go to: https://console.firebase.google.com/project/pantryai-3d396/functions/logs
2. Filter by `analyzeImage`
3. Look for recent entries

**Option B: Google Cloud Console**
1. Go to: https://console.cloud.google.com/logs/query?project=pantryai-3d396
2. Run this query:
   ```
   resource.type="cloud_run_revision"
   resource.labels.service_name="analyzeimage"
   ```

**What to Look For:**

✅ **If you see this:**
```
Attempting Gemini AI analysis...
=== GEMINI ANALYSIS START ===
Image data length: 123456
```
Then:
```
Error: 7 PERMISSION_DENIED: Vertex AI API has not been used in project pantryai-3d396 before or it is disabled
```
→ **Solution**: Enable Vertex AI API (see Step 2)

✅ **If you see this:**
```
Error: 7 PERMISSION_DENIED: IAM permission 'aiplatform.endpoints.predict' denied
```
→ **Solution**: Add IAM permissions (see Step 3)

❌ **If you DON'T see "Attempting Gemini AI analysis..."**
→ The deployed function is old. Re-deploy (see Step 4)

---

### Step 2: Enable Vertex AI API

**Quick Link:**
https://console.cloud.google.com/apis/library/aiplatform.googleapis.com?project=pantryai-3d396

1. Click the blue **"ENABLE"** button
2. Wait 1-2 minutes
3. You should see "API enabled" with a green checkmark

**Verify it's enabled:**
https://console.cloud.google.com/apis/api/aiplatform.googleapis.com/metrics?project=pantryai-3d396

If you see metrics or "API is enabled", you're good!

---

### Step 3: Add IAM Permissions (if Step 2 didn't fix it)

The Cloud Function service account needs Vertex AI permissions.

**Quick Link:**
https://console.cloud.google.com/iam-admin/iam?project=pantryai-3d396

**Steps:**
1. Find this service account:
   ```
   pantryai-3d396@appspot.gserviceaccount.com
   ```
   (It should already exist and have "Firebase Admin SDK")

2. Click the pencil icon (Edit)

3. Click **"ADD ANOTHER ROLE"**

4. Search for and add: **"Vertex AI User"**

5. Click **"SAVE"**

---

### Step 4: Verify Deployment (if logs don't show Gemini attempt)

Check if the latest function is deployed:

```powershell
cd C:\Users\denis\Pantryai\functions
firebase functions:config:get
```

Or re-deploy to be sure:

```powershell
cd C:\Users\denis\Pantryai\functions
firebase deploy --only functions
```

Wait for: `Successful update operation`

---

### Step 5: Test Again

After enabling the API and/or adding permissions:

1. Wait 2 minutes for changes to propagate
2. Scan your sheep milk bottle again
3. Check the response

**Success looks like:**
```json
{
  "detectionSource": "Gemini AI",
  "geminiDetails": {
    "productName": "Sheep Milk",
    "category": "dairy",
    "confidence": 0.90
  },
  "foodItem": {
    "name": "Sheep Milk"
  }
}
```

---

## Checklist

Complete these in order:

- [ ] Step 1: Check Cloud Function logs to see exact error
- [ ] Step 2: Enable Vertex AI API (click the link above)
- [ ] Step 2a: Wait 2 minutes
- [ ] Step 3: Add "Vertex AI User" role to service account (if needed)
- [ ] Step 4: Verify latest function is deployed
- [ ] Step 5: Scan again and check response

---

## Expected Timeline

- **If it's just API enablement**: 2-3 minutes total
- **If it needs IAM permissions too**: 5 minutes total
- **If function needs re-deploy**: 3 minutes for deploy + 2 minutes for API

---

## Debug Command

After each change, check logs immediately:

```powershell
# In Firebase Console
https://console.firebase.google.com/project/pantryai-3d396/functions/logs

# Or run this and look at the output
firebase functions:log --limit 10
```

---

## Still Not Working?

If after ALL steps you still see `geminiDetails: null`, please share:

1. **Screenshot of Vertex AI API page** showing it's enabled
2. **Screenshot of IAM page** showing service account has "Vertex AI User" role
3. **Last 20 lines of Cloud Function logs** after a scan
4. **Complete scan response JSON**

I'll help diagnose from there!
