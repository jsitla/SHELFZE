# Next Steps - Vertex AI API is Enabled ✅

Good news: The Vertex AI API is enabled!

Bad news: Gemini is still failing, which means it's a **permissions issue**.

---

## What's Happening

The Cloud Function is trying to call Gemini, but the service account running the function doesn't have permission to use Vertex AI.

**Error you'd see in logs:**
```
Error: 7 PERMISSION_DENIED: Permission 'aiplatform.endpoints.predict' denied on resource...
```

---

## SOLUTION: Add IAM Role

### Quick Link to IAM Page:
👉 https://console.cloud.google.com/iam-admin/iam?project=pantryai-3d396

### What to Do:
1. Find the service account (probably `pantryai-3d396@appspot.gserviceaccount.com`)
2. Click the pencil icon to edit
3. Add role: **"Vertex AI User"**
4. Save

### Detailed Screenshots Guide:
See: `.github/ADD-IAM-PERMISSION.md`

---

## Can't Find It? Try This Alternative

If you're having trouble with IAM, I can modify the Cloud Function to explicitly specify service account credentials. Let me know!

---

## Check Logs (Optional)

Want to see the exact error? 

**Firebase Console Logs:**
https://console.firebase.google.com/project/pantryai-3d396/functions/logs

Look for "Gemini failed" and the error message after it.

---

## After You Add the Permission

1. Wait 2 minutes
2. Scan the sheep milk bottle again
3. You should see:
   - `"detectionSource": "Gemini AI"`
   - `"foodItem.name": "Sheep Milk"` (not "Dairy product"!)
   - `"geminiDetails"` will have data (not null)

Let me know what happens! 🚀
