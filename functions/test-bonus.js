const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function run() {
  let userId = process.argv[2];
  const daysAgoInput = process.argv[3];
  const daysAgo = daysAgoInput ? parseInt(daysAgoInput) : 35;

  if (!userId) {
    console.log('🔍 No userId provided. Listing recent users with usage data...');
    const snapshot = await db.collection('users').limit(10).get();
    
    if (snapshot.empty) {
      console.log('No users found in Firestore.');
      return;
    }

    console.log('\nFound Users:');
    for (const doc of snapshot.docs) {
      const usageSnap = await db.collection('users').doc(doc.id).collection('usage').doc('current').get();
      const email = doc.data().email || 'No Email';
      const tier = usageSnap.exists ? usageSnap.data().tier : 'No Usage Data';
      console.log(`- ID: ${doc.id} | Email: ${email} | Tier: ${tier}`);
    }
    console.log('\nUsage: node test-bonus.js <USER_ID_OR_EMAIL> [DAYS_AGO]');
    return;
  }

  // Check if input is an email
  if (userId.includes('@')) {
    console.log(`📧 Input looks like an email. Resolving UID for ${userId}...`);
    try {
      const userRecord = await admin.auth().getUserByEmail(userId);
      userId = userRecord.uid;
      console.log(`✅ Found UID: ${userId}`);
    } catch (error) {
      console.error(`❌ Could not find user by email: ${error.message}`);
      return;
    }
  }

  console.log(`\n⚙️  Setting up test for user: ${userId}...`);
  const usageRef = db.collection('users').doc(userId).collection('usage').doc('current');
  
  try {
    const doc = await usageRef.get();
    if (!doc.exists) {
      console.log('❌ Usage document not found. Creating default free tier...');
      await usageRef.set({
        tier: 'free',
        scansRemaining: 30,
        recipesRemaining: 30,
        totalScansUsed: 0,
        totalRecipesUsed: 0,
        lastMonthlyBonusDate: admin.firestore.Timestamp.now(),
        createdAt: admin.firestore.Timestamp.now()
      });
    }

    const currentData = (await usageRef.get()).data();
    const lastBonusDate = currentData.lastMonthlyBonusDate ? currentData.lastMonthlyBonusDate.toDate().toISOString() : 'None';
    console.log('📊 Current State:', {
      tier: currentData.tier,
      scans: currentData.scansRemaining,
      recipes: currentData.recipesRemaining,
      lastBonus: lastBonusDate
    });

    // Set date to daysAgo
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - daysAgo);

    await usageRef.update({
      tier: 'free',
      lastMonthlyBonusDate: admin.firestore.Timestamp.fromDate(pastDate)
    });

    console.log('\n✅ SUCCESS! Test environment ready.');
    console.log(`- Tier forced to: FREE`);
    console.log(`- Last bonus date set to: ${pastDate.toISOString()} (${daysAgo} days ago)`);
    console.log(`- Current Scans: ${currentData.scansRemaining}`);
    console.log(`- Current Recipes: ${currentData.recipesRemaining}`);
    console.log('\n👉 ACTION REQUIRED:');
    console.log('1. Open the Shelfze app');
    console.log('2. Go to Profile screen (or reload app)');
    console.log('3. You should see a "Monthly Bonus" alert');
    console.log(`4. Scans should increase to: ${(currentData.scansRemaining || 0) + 5}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

run();
