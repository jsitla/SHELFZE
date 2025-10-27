# Fix: Add Vertex AI Role to Firebase Admin SDK Service Account

## The Problem

You added "Vertex AI administrator" to the **App Engine** service account:
✅ `pantryai-3d396@appspot.gserviceaccount.com`

But the Cloud Function is running as the **Firebase Admin SDK** service account:
❌ `firebase-adminsdk-fbsvc@pantryai-3d396.iam.gserviceaccount.com`

---

## The Solution

Add "Vertex AI administrator" (or "Vertex AI User") to the **Firebase Admin SDK** service account.

### Steps:

1. Go to IAM page (you're already there):
   https://console.cloud.google.com/iam-admin/iam?project=pantryai-3d396

2. Find this service account:
   ```
   firebase-adminsdk-fbsvc@pantryai-3d396.iam.gserviceaccount.com
   ```

3. Click the **pencil icon ✏️** on the right to edit

4. Click **"+ ADD ANOTHER ROLE"**

5. Search for: **Vertex AI User**

6. Select it and click **"SAVE"**

7. Wait 2 minutes

8. Test again by scanning

---

## After Adding the Role

The service account should have:
- Firebase Admin SDK Administrator Service Agent (already has)
- Service Account Token Creator (already has)
- **Vertex AI User** (NEW - you need to add this)

---

## Then Test

After waiting 2 minutes, scan the sheep milk bottle again.

You should see:
```json
{
  "detectionSource": "Gemini AI",
  "geminiDetails": { "productName": "Sheep Milk", ... },
  "foodItem": { "name": "Sheep Milk" }
}
```

Instead of:
```json
{
  "detectionSource": "Vision API",
  "geminiDetails": null,
  "foodItem": { "name": "Dairy product" }
}
```
