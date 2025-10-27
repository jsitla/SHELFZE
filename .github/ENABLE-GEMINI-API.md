# Enable Vertex AI API for Gemini

## The Issue
Gemini is returning "Unknown Item" because the **Vertex AI API** is not enabled in your Google Cloud project.

## Solution - Enable Vertex AI API

### Option 1: Via Google Cloud Console (Easiest)
1. Go to: https://console.cloud.google.com/apis/library/aiplatform.googleapis.com?project=pantryai-3d396
2. Click **"ENABLE"** button
3. Wait 1-2 minutes for activation
4. Test your app again

### Option 2: Via Firebase Console
1. Go to: https://console.firebase.google.com/project/pantryai-3d396
2. Click **Build** → **Functions**
3. Open the function logs
4. Look for errors about "Vertex AI API not enabled"
5. Click the link in the error to enable it

### Option 3: Install Google Cloud SDK (for future use)
1. Download: https://cloud.google.com/sdk/docs/install
2. Install Google Cloud SDK
3. Run in PowerShell:
   ```powershell
   gcloud auth login
   gcloud config set project pantryai-3d396
   gcloud services enable aiplatform.googleapis.com
   ```

## After Enabling
1. Wait 1-2 minutes for the API to activate
2. Scan a food item in your app
3. Check Firebase logs: `firebase functions:log --only analyzeImage`
4. You should see:
   - "Gemini raw response: {...}"
   - "Gemini parsed result: {productName: 'Sheep Milk', ...}"
   - "Using Gemini detection: Sheep Milk"

## Test It
Try scanning your sheep milk bottle again. It should now show **"Sheep Milk"** instead of "Unknown Item"! 🎯
