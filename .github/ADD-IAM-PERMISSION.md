# Add Vertex AI Permissions to Cloud Function

Since the Vertex AI API is enabled but Gemini still returns null, the Cloud Function service account needs permission to USE Vertex AI.

## Quick Fix - Add IAM Role

### Step 1: Go to IAM Page
**Click this link:**
https://console.cloud.google.com/iam-admin/iam?project=pantryai-3d396

### Step 2: Find the Service Account
Look for one of these service accounts:
- `pantryai-3d396@appspot.gserviceaccount.com` (Firebase Admin)
- OR `Default compute service account` with email ending in `@developer.gserviceaccount.com`

### Step 3: Add the Role
1. Click the **pencil icon (Edit)** next to the service account
2. Click **"+ ADD ANOTHER ROLE"**
3. In the search box, type: **Vertex AI User**
4. Select **"Vertex AI User"**
5. Click **"SAVE"**

### Step 4: Test Again
1. Wait 1-2 minutes for permissions to propagate
2. Scan your sheep milk bottle
3. Check if `detectionSource` now says "Gemini AI"

---

## Alternative: Use Default Service Account

If you can't find the right service account, we can configure the Cloud Function to use the default compute service account which usually has broad permissions.

Let me know if you need help with this!

---

## After Adding Permission

The response should change from:
```json
{
  "detectionSource": "Vision API",
  "geminiDetails": null
}
```

To:
```json
{
  "detectionSource": "Gemini AI",
  "geminiDetails": {
    "productName": "Sheep Milk",
    "category": "dairy",
    "confidence": 0.90
  }
}
```
