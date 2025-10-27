# How to Check Cloud Function Logs - Step by Step

## Method 1: Firebase Console (Easiest)

### Step 1: Open Firebase Console Logs
Click this link:
👉 https://console.firebase.google.com/project/pantryai-3d396/functions/logs

### Step 2: What You'll See
You should see a list of log entries with timestamps.

### Step 3: Find Recent Entries
- Look at the timestamps on the left
- Find the most recent entries (just now when you scanned)
- They should be within the last minute

### Step 4: Look for These Specific Messages
Expand the log entries and look for:

```
Attempting Gemini AI analysis...
=== GEMINI ANALYSIS START ===
Image data length: [some number]
```

Then look for the ERROR:
```
Gemini failed, falling back to Vision API:
Error message: [THE ERROR IS HERE]
Error stack: [MORE DETAILS HERE]
```

### Step 5: Copy the Error
Copy everything after "Error message:" and paste it here.

---

## Method 2: Google Cloud Logs (More Detailed)

### Step 1: Open Cloud Logs
Click this link:
👉 https://console.cloud.google.com/logs/query?project=pantryai-3d396

### Step 2: Run This Query
Paste this in the query box at the top:
```
resource.type="cloud_run_revision"
resource.labels.service_name="analyzeimage"
severity>=DEFAULT
```

### Step 3: Click "RUN QUERY" Button

### Step 4: Find the Logs
Look through the results for entries with "Gemini" or "Error"

### Step 5: Expand the Error Entry
Click on the entry that shows an error
Look for:
- `textPayload` or `jsonPayload`
- Find the error message

---

## What Errors Mean

### Error 1: Permission Denied
```
Error: 7 PERMISSION_DENIED: Permission 'aiplatform.endpoints.predict' denied
```
**Meaning**: IAM permissions haven't propagated yet
**Solution**: Wait 5 more minutes and try again

### Error 2: Model Not Found
```
Error: 5 NOT_FOUND: Model gemini-1.5-flash not found
```
**Meaning**: Wrong model name or region
**Solution**: I'll fix the code

### Error 3: Invalid Argument
```
Error: 3 INVALID_ARGUMENT
```
**Meaning**: The image format or request is wrong
**Solution**: I'll fix the code

### Error 4: Quota Exceeded
```
Error: 8 RESOURCE_EXHAUSTED: Quota exceeded
```
**Meaning**: Need to request quota increase
**Solution**: Use a different approach

---

## Quick Screenshots Guide

1. Open the Firebase logs link above
2. Take a screenshot of the error entries
3. Share the screenshot OR copy/paste the error text

**Tell me what error message you see!**
