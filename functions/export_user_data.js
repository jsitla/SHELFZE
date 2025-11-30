const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const SERVICE_ACCOUNT_PATH = './service-account.json'; // Path to your downloaded key
const OUTPUT_DIR = '../user_exports'; // Output directory relative to this script

// Initialize Firebase Admin
// Try to load service account if it exists
if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('Initialized with service account.');
} else {
  // Fallback to default credentials (works if GOOGLE_APPLICATION_CREDENTIALS is set)
  console.log('Service account file not found. Attempting to use default credentials...');
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

async function exportUserData(email) {
  try {
    console.log(`Looking up user: ${email}...`);
    const userRecord = await auth.getUserByEmail(email);
    const uid = userRecord.uid;
    console.log(`Found user UID: ${uid}`);

    const exportData = {
      userProfile: {},
      pantry: [],
      shoppingList: [],
      savedRecipes: [],
      recipeCollections: [],
      recipeRatings: [],
      recipeRequests: [],
      usage: []
    };

    // 1. User Profile
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
      exportData.userProfile = userDoc.data();
      console.log('Fetched user profile.');
    } else {
      console.log('User profile document not found.');
    }

    // 2. Subcollections
    const collections = [
      { name: 'pantry', key: 'pantry' },
      { name: 'shoppingList', key: 'shoppingList' },
      { name: 'savedRecipes', key: 'savedRecipes' },
      { name: 'recipeCollections', key: 'recipeCollections' },
      { name: 'recipeRatings', key: 'recipeRatings' },
      { name: 'recipe_requests', key: 'recipeRequests' },
      { name: 'usage', key: 'usage' } // usage is a subcollection in some contexts or a doc?
    ];

    // Check usage specifically (it might be a document in a subcollection or just a subcollection)
    // In index.js: db.collection("users").doc(uid).collection("usage").doc("current")
    // So 'usage' is a collection.

    for (const col of collections) {
      console.log(`Fetching ${col.name}...`);
      const snapshot = await db.collection('users').doc(uid).collection(col.name).get();
      
      if (!snapshot.empty) {
        snapshot.forEach(doc => {
          exportData[col.key].push({
            id: doc.id,
            ...doc.data()
          });
        });
        console.log(`  -> Found ${snapshot.size} documents in ${col.name}`);
      } else {
        console.log(`  -> No documents in ${col.name}`);
      }
    }

    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(OUTPUT_DIR, `export_${email}_${timestamp}.json`);
    
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
    console.log(`\n✅ Export successful! Data saved to: ${filename}`);

  } catch (error) {
    console.error('❌ Error exporting data:', error);
    if (error.code === 'auth/user-not-found') {
      console.error('   User not found in Firebase Auth.');
    }
    if (error.code === 'app/no-app') {
        console.error('   Firebase App not initialized. Did you provide the service account key?');
    }
  }
}

// Get email from command line args
const emailArg = process.argv[2];

if (!emailArg) {
  console.error('Please provide an email address.');
  console.error('Usage: node export_user_data.js <email>');
  process.exit(1);
}

exportUserData(emailArg);
