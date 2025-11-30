# Data Export Tool

This tool allows you to export all data associated with a specific user email from Firestore, complying with GDPR "Right to Data Portability".

## Prerequisites

1.  **Node.js** installed.
2.  **Firebase Admin SDK** (already in `functions/node_modules`).
3.  **Service Account Key**: You need a service account key to access the database with admin privileges.

## Setup

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Open your project (**Shelfze** / `pantryai-3d396`).
3.  Go to **Project settings** (gear icon) -> **Service accounts**.
4.  Click **Generate new private key**.
5.  Save the downloaded JSON file as `service-account.json` inside the `functions/` folder.
    *   `c:\Users\denis\Pantryai\functions\service-account.json`

## Usage

1.  Open a terminal in the `functions` directory:
    ```powershell
    cd functions
    ```

2.  Run the export script with the user's email:
    ```powershell
    node export_user_data.js jsitla@gmail.com
    ```

3.  The data will be saved to a JSON file in the `user_exports` folder (created in the project root).
    *   Example: `c:\Users\denis\Pantryai\user_exports\export_jsitla@gmail.com_2025-11-30T12-00-00.json`

## What is Exported?

*   User Profile
*   Pantry Items
*   Shopping Lists
*   Saved Recipes
*   Recipe Collections
*   Recipe Ratings
*   Recipe Requests (History)
*   Usage Data (Scans/Recipe counts)
