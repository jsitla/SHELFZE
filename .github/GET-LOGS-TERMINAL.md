# Get Cloud Function Logs via Terminal

Since the console isn't showing logs, let's try terminal commands:

## Option 1: Try Firebase CLI Again

```powershell
cd C:\Users\denis\Pantryai
firebase functions:log
```

## Option 2: Check if gcloud is installed

```powershell
gcloud --version
```

If not installed, we'll use the console instead.

## Option 3: Direct Link to Cloud Run Logs

Open this URL:
https://console.cloud.google.com/run/detail/us-central1/analyzeimage/logs?project=pantryai-3d396

This should show the Cloud Run logs for the function.

Look for:
- "Attempting Gemini AI analysis..."
- "Gemini failed"
- "Error message:"
