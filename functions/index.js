const {onRequest} = require("firebase-functions/v2/https");
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const vision = require("@google-cloud/vision");
const {VertexAI} = require("@google-cloud/vertexai");

admin.initializeApp();

const client = new vision.ImageAnnotatorClient();

const vertexAI = new VertexAI({
  project: "pantryai-3d396",
  location: "us-central1",
});

// Model for Camera/Image Analysis (Upgraded to Gemini 3 Flash - Jan 2026)
const cameraModel = vertexAI.getGenerativeModel({
  model: "gemini-3-flash",
});

// Model for Recipe Generation (Upgraded to Gemini 3 Flash - Jan 2026)
const recipeModel = vertexAI.getGenerativeModel({
  model: "gemini-3-flash",
});

// Model for Fast Filtering (Retrieval) - Upgraded to Gemini 3 Flash Jan 2026
const filterModel = vertexAI.getGenerativeModel({
  model: "gemini-3-flash",
});

// Model specifically for Pantry Check - Upgraded to Gemini 3 Flash Jan 2026
const pantryCheckModel = vertexAI.getGenerativeModel({
  model: "gemini-3-flash",
});

/**
 * Helper function to verify Firebase ID token
 * @param {Object} req - The request object
 * @return {Promise<string|null>} The UID or null
 */
async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error) {
    console.error("Error verifying auth token:", error);
    return null;
  }
}

exports.analyzeImage = onRequest({
  cors: true,
  memory: "1GiB",
  timeoutSeconds: 300,
}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed. Use POST."});
    return;
  }

  try {
    const uid = await verifyAuth(req);
    if (!uid) {
      res.status(401).json({error: "Unauthorized. Invalid or missing token."});
      return;
    }

    const db = admin.firestore();

    // Check if user is in a household
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const householdId = userData?.householdId || null;

    // Determine usage reference (household or personal)
    let usageRef;
    let pantryPath;
    if (householdId) {
      usageRef = db.collection("households").doc(householdId)
          .collection("usage").doc("current");
      pantryPath = `households/${householdId}/pantry`;
    } else {
      usageRef = db.collection("users").doc(uid)
          .collection("usage").doc("current");
      pantryPath = `users/${uid}/pantry`;
    }

    const usageDoc = await usageRef.get();

    let usageData = usageDoc.exists ? usageDoc.data() : null;

    if (!usageData) {
      usageData = {
        tier: "anonymous",
        scansRemaining: 10,
        recipesRemaining: 10,
        totalScansUsed: 0,
        totalRecipesUsed: 0,
        lastMonthlyBonusDate: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        resetDate: null,
      };
      await usageRef.set(usageData);
    }

    if (usageData.scansRemaining <= 0) {
      res.status(403).json({error: "No scans remaining."});
      return;
    }

    const imageData = req.body.image;
    const targetLanguage = req.body.language || "en";
    const mimeType = req.body.mimeType || "image/jpeg";
    const userId = uid;

    if (!imageData) {
      res.status(400).json({error: "No image data provided"});
      return;
    }

    let fullText = "";
    let detectedLabels = [];
    let detectedObjects = [];
    let geminiResult = null;
    let allDetections = [];

    // If video, skip Vision API and go straight to Gemini
    if (mimeType.startsWith("video/")) {
      console.log("Processing video with Gemini...");
      try {
        geminiResult = await analyzeWithGemini(
            imageData, targetLanguage, mimeType,
        );
        console.log("Gemini video analysis result:", geminiResult);
      } catch (error) {
        console.error("Gemini video analysis failed:", error);
        throw error; // No fallback for video
      }
    } else {
      // Existing Image Logic with Vision API
      const request = {
        image: {content: imageData},
        features: [
          {type: "TEXT_DETECTION"},
          {type: "LABEL_DETECTION", maxResults: 30},
          {type: "OBJECT_LOCALIZATION"},
          {type: "WEB_DETECTION"},
          {type: "CROP_HINTS", maxResults: 1},
        ],
      };

      const [result] = await client.annotateImage(request);

      const textAnnotations = result.textAnnotations || [];
      const labelAnnotations = result.labelAnnotations || [];
      const objects = result.localizedObjectAnnotations || [];

      fullText = textAnnotations.length > 0 ?
          textAnnotations[0].description : "";

      detectedLabels = labelAnnotations.map((label) => ({
        name: label.description,
        confidence: label.score,
        source: "label",
      }));

      detectedObjects = objects.map((obj) => ({
        name: obj.name,
        confidence: obj.score,
        source: "object",
      }));

      allDetections = [...detectedLabels, ...detectedObjects];

      try {
        console.log("Attempting Gemini AI analysis...");
        geminiResult = await analyzeWithGemini(
            imageData, targetLanguage, mimeType,
        );
        console.log("Gemini analysis result:", geminiResult);
      } catch (error) {
        console.error("Gemini failed, falling back to Vision API:");
        console.error("Error message:", error.message);
      }
    }

    const normalizeCategory = (category) => {
      const categoryMap = {
        "dairy": "Dairy",
        "meat": "Meat & Poultry",
        "fruit": "Fruits",
        "fruits": "Fruits",
        "vegetable": "Vegetables",
        "vegetables": "Vegetables",
        "beverage": "Beverages",
        "beverages": "Beverages",
        "packaged": "Packaged Food",
        "packagedfood": "Packaged Food",
        "packaged food": "Packaged Food",
        "spices": "Spices",
        "condiments": "Condiments",
        "bakery": "Bakery",
        "other": "Other",
      };
      return categoryMap[category.toLowerCase()] || category;
    };

    let foodItems = [];
    if (geminiResult && geminiResult.items && geminiResult.items.length > 0) {
      foodItems = geminiResult.items.map((item) => ({
        name: item.productName,
        category: normalizeCategory(item.category || "Other"),
        confidence: item.confidence || 0.70,
        source: "Gemini AI",
        details: item.details || "",
        expiryDate: item.expiryDate || null,
      }));
      console.log("Using Gemini detection for", foodItems.length, "items");
    } else if (geminiResult && geminiResult.productName) {
      foodItems = [{
        name: geminiResult.productName,
        category: normalizeCategory(geminiResult.category || "Other"),
        confidence: geminiResult.confidence || 0.70,
        source: "Gemini AI",
        details: geminiResult.details || "",
        expiryDate: geminiResult.expiryDate || null,
      }];
      console.log("Using Gemini detection (single item):", foodItems[0].name);
    } else {
      const singleItem = categorizeFoodItem(allDetections, fullText);
      foodItems = [singleItem];
      console.log("Using Vision API detection:", singleItem.name);
    }

    // Filter out generic spice names
    const genericTerms = ["spices", "spice", "seasoning", "seasonings", "herbs", "herb", "condiment", "condiments"];
    foodItems = foodItems.filter((item) => {
      const nameLower = item.name.toLowerCase();
      return !genericTerms.includes(nameLower);
    });

    const expiryDate = findExpiryDate(fullText);
    const formattedDate = expiryDate ? formatDate(expiryDate) : null;

    const savedItems = [];
    for (const foodItem of foodItems) {
      const finalExpiryDate = foodItem.expiryDate || formattedDate || null;

      if (foodItem.name && foodItem.name !== "Unknown Item") {
        // Build item data with addedBy fields for household items
        const itemData = {
          name: foodItem.name,
          itemName: foodItem.name,
          category: foodItem.category,
          confidence: foodItem.confidence,
          detectionSource: foodItem.source || "Vision API",
          geminiDetails: foodItem.details || null,
          detectedLabels: detectedLabels.slice(0, 5),
          detectedObjects: detectedObjects.slice(0, 5),
          expiryDate: finalExpiryDate,
          quantity: 1,
          unit: "pcs",
          fullText: fullText.substring(0, 500),
          addedAt: admin.firestore.FieldValue.serverTimestamp(),
          addedDate: new Date().toISOString(),
        };

        // Add addedBy fields for household items
        if (householdId) {
          itemData.addedBy = uid;
          // Use nickname from user doc
          const nickname = await getUserNickname(uid);
          itemData.addedByName = nickname;
        }

        // Use dynamic path for pantry (household or personal)
        const pathParts = pantryPath.split("/");
        const docRef = await admin.firestore()
            .collection(pathParts[0])
            .doc(pathParts[1])
            .collection(pathParts[2])
            .add(itemData);
        savedItems.push({
          id: docRef.id,
          name: foodItem.name,
          category: foodItem.category,
          confidence: foodItem.confidence,
          quantity: 1,
          unit: "pcs",
          expiryDate: finalExpiryDate,
        });
      }
    }

    if (savedItems.length > 0) {
      await usageRef.update({
        scansRemaining: admin.firestore.FieldValue.increment(-1),
        totalScansUsed: admin.firestore.FieldValue.increment(1),
      });
    }

    const responseExpiryDate = savedItems.length > 0 ?
        savedItems[0].expiryDate : (formattedDate || null);

    res.status(200).json({
      fullText: fullText,
      foodItems: foodItems,
      totalItems: foodItems.length,
      savedItems: savedItems,
      detectionSource: foodItems.length > 0 ?
          foodItems[0].source : "Vision API",
      geminiDetails: geminiResult || null,
      detectedLabels: detectedLabels.slice(0, 5),
      detectedObjects: detectedObjects,
      expiryDate: responseExpiryDate,
      saved: savedItems.length > 0,
    });
  } catch (error) {
    console.error("Error processing image:", error);
    res.status(500).json({
      error: "Failed to process image",
      details: error.message,
    });
  }
});

/**
 * Analyzes image using Google Gemini AI for intelligent food recognition
 * @param {string} base64Image - Base64 encoded image
 * @param {string} targetLang - Target language code
 * @param {string} mimeType - Mime type of the media (image/jpeg, video/mp4)
 * @return {Object} Intelligent analysis with specific product details
 */
async function analyzeWithGemini(
    base64Image, targetLang = "en", mimeType = "image/jpeg",
) {
  try {
    console.log("=== GEMINI ANALYSIS START ===");
    console.log("Model: Gemini 2.5 Flash");
    console.log("Image data length:", base64Image ? base64Image.length : 0);
    console.log("Target language:", targetLang);
    console.log("Mime Type:", mimeType);

    const langNames = {
      en: "English", es: "Spanish", fr: "French", de: "German",
      it: "Italian", pt: "Portuguese", ru: "Russian", zh: "Chinese",
      ja: "Japanese", ko: "Korean", ar: "Arabic", hi: "Hindi",
      tr: "Turkish", pl: "Polish", nl: "Dutch",
      sl: "Slovenian", hr: "Croatian", sr: "Serbian",
    };

    const targetLanguageName = langNames[targetLang] || "English";

    const prompt = `You are a food recognition expert specializing in
precise ingredient identification. Analyze this media carefully.

CRITICAL GUIDELINES - FOOD AND INGREDIENTS:
1. **DETECT FOOD ITEMS AND FOOD INGREDIENTS** - Focus on edible products
2. INCLUDE packaged/bottled food (e.g., "Orange Juice in Bottle")
3. If UNSURE but possibly food, include it with lower confidence
4. Only return empty if CLEARLY no food items visible
5. Be PERMISSIVE - when in doubt, include the item

6. Detect MULTIPLE food items if present in the image/video
7. Be EXTREMELY SPECIFIC about the FORM of each ingredient:
   - Distinguish between WHOLE vs PROCESSED forms
   - Examples:
     * "Fresh Garlic Cloves" vs "Garlic Powder" vs "Minced Garlic"
     * "Fresh Ginger Root" vs "Ground Ginger"
     * "Whole Black Peppercorns" vs "Ground Black Pepper"
     * "Fresh Basil Leaves" vs "Dried Basil"
     * "Sea Salt (Coarse)" vs "Table Salt (Fine)"
     * "Whole Cinnamon Sticks" vs "Ground Cinnamon"
7. For SPICES and SEASONINGS:
   - **STRICTLY FORBIDDEN**: Do NOT return "Spices", "Seasoning", "Herbs", "Condiment" as the product name.
   - If you cannot identify the specific spice (e.g., "Cumin", "Paprika", "Oregano"), **DO NOT INCLUDE THE ITEM**.
   - Better to return NOTHING than a generic "Spices" label.
   - **MUST identify the specific type** (e.g., "Ground Cumin",
     "Dried Oregano", "Paprika", "Curry Powder", "Chili Flakes").
   - Check if it's POWDER/GROUND, WHOLE, or FRESH
   - Look at packaging text for clues (e.g., "powder", "ground", "whole")
   - Note the texture and appearance
   - If the specific spice is unrecognizable, describe it (e.g.,
     "Red Spice Powder", "Green Dried Herbs").
8. Include the BRAND NAME if visible and relevant
9. **TRANSLATE all product names to ${targetLanguageName}**
10. Be specific about packaging type: jar, bottle, bag, fresh, etc.
11. **DETECT EXPIRY DATES** - Look for text like "EXP", "BEST BEFORE", "BB", "USE BY" followed by a date.
    - Format the date as YYYY-MM-DD.
    - If only Month/Year is found, use the last day of the month.
    - If no date is found, return null.

VALID FOOD CATEGORIES ONLY:
- dairy (milk, cheese, yogurt, butter, etc.)
- meat (beef, chicken, pork, fish, etc.)
- fruit (apples, bananas, berries, etc.)
- vegetable (carrots, lettuce, tomatoes, etc.)
- beverage (juice, milk, coffee, tea - consumables only)
- packaged (pasta, rice, cereal, snacks)
- spices (salt, pepper, herbs, seasonings)
- condiments (sauces, dressings, oils)
- bakery (bread, pastries, cakes)

JSON response:
{
  "items": [
    {
      "productName": "Specific name with form in ${targetLanguageName}",
      "category": "dairy|meat|fruit|vegetable|beverage|packaged|" +
        "spices|condiments|bakery",
      "form": "fresh|dried|ground|powder|whole|minced|frozen|canned|bottled",
      "expiryDate": "YYYY-MM-DD",
      "confidence": 0.9
    }
  ],
  "totalItems": 1
}

Remember: If the media contains NO food items, return {"items": [], ` +
`"totalItems": 0}`;

    const result = await cameraModel.generateContent({
      contents: [{
        role: "user",
        parts: [
          {text: prompt},
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
        ],
      }],
    });

    console.log("Gemini generateContent completed");
    const response = await result.response;
    console.log("Gemini response object:", JSON.stringify(response, null, 2));

    let responseText = "";
    if (response.candidates && response.candidates[0] &&
        response.candidates[0].content &&
        response.candidates[0].content.parts &&
        response.candidates[0].content.parts[0]) {
      responseText = response.candidates[0].content.parts[0].text || "";
    }
    console.log("Gemini raw response text:", responseText);

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log("Gemini parsed result:", parsed);
      return parsed;
    }
    console.log("No JSON found in Gemini response, full text was:",
        responseText);
    return null;
  } catch (error) {
    console.error("Gemini analysis error (catch block):", error.message);
    console.error("Error name:", error.name);
    console.error("Error stack:", error.stack);
    if (error.response) {
      console.error("Error response:", JSON.stringify(error.response, null, 2));
    }
    return null;
  }
}

/**
 * Categorizes detected items into food items
 * Priority: AI labels > Text > Physical objects
 * @param {Array} allDetections - Combined labels and objects from Vision API
 * @param {string} fullText - Extracted text from image
 * @return {Object} Food item with name, category, and confidence
 */
function categorizeFoodItem(allDetections, fullText) {
  const foodCategories = {
    "Dairy": ["milk", "cheese", "yogurt", "yoghurt", "butter", "cream",
      "dairy", "mozzarella", "cheddar", "parmesan", "cottage cheese",
      "sour cream", "whipped cream", "ice cream"],
    "Meat & Poultry": ["meat", "chicken", "beef", "pork", "turkey",
      "sausage", "bacon", "ham", "lamb", "duck", "steak", "ground beef",
      "chicken breast", "wings", "drumstick"],
    "Fruits": ["apple", "banana", "orange", "grape", "berry", "fruit",
      "strawberry", "blueberry", "raspberry", "mango", "pineapple",
      "watermelon", "peach", "pear", "kiwi", "lemon", "lime"],
    "Vegetables": ["vegetable", "carrot", "tomato", "lettuce", "broccoli",
      "potato", "onion", "garlic", "pepper", "cucumber", "spinach",
      "cabbage", "celery", "mushroom", "corn", "peas"],
    "Beverages": ["drink", "juice", "soda", "water", "beverage",
      "cola", "sprite", "fanta", "beer", "wine", "coffee", "tea",
      "energy drink", "smoothie", "lemonade", "milk"],
    "Packaged Food": ["food", "snack", "pasta", "rice", "cereal",
      "chips", "crackers", "cookies", "candy", "chocolate", "granola",
      "nuts", "trail mix"],
    "Bakery": ["bread", "cake", "pastry", "baked goods", "bagel", "muffin",
      "croissant", "donut", "roll", "bun", "pie", "tart"],
    "Condiments": ["sauce", "ketchup", "mayo", "mustard", "condiment",
      "salsa", "dressing", "relish", "pickle", "jam", "jelly", "honey",
      "syrup", "oil", "vinegar"],
  };

  const nonFoodItems = ["bottle", "jar", "package", "packaged goods",
    "container", "box", "can", "carton", "plastic", "glass", "metal",
    "paper", "cardboard", "bag", "wrapper", "label", "cap", "lid",
    "utensil", "dish", "plate", "bowl", "cup", "furniture", "table",
    "counter", "shelf", "hand", "person", "clothing", "phone", "camera"];

  let itemName = "Unknown Item";
  let category = "Other";
  let confidence = 0;

  if (fullText) {
    const lines = fullText.split("\n").map((line) => line.trim());
    const fullTextLower = fullText.toLowerCase();

    const milkKeywords = ["milk", "mleko", "mleczny", "lait", "leche",
      "latte", "milch"];

    if (milkKeywords.some((keyword) => fullTextLower.includes(keyword))) {
      if (fullTextLower.includes("sheep") || fullTextLower.includes("ovce") ||
          fullTextLower.includes("овче")) {
        itemName = "Sheep Milk";
        category = "Dairy";
        confidence = 0.9;
      } else if (fullTextLower.includes("goat")) {
        itemName = "Goat Milk";
        category = "Dairy";
        confidence = 0.9;
      } else if (fullTextLower.includes("cow") ||
                 fullTextLower.includes("whole") ||
                 fullTextLower.includes("skim")) {
        itemName = "Milk";
        category = "Dairy";
        confidence = 0.85;
      } else {
        itemName = "Milk";
        category = "Dairy";
        confidence = 0.8;
      }
    }

    if (category === "Other") {
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];
        const lineLower = line.toLowerCase();

        for (const [cat, keywords] of Object.entries(foodCategories)) {
          if (keywords.some((keyword) => lineLower.includes(keyword))) {
            if (line.length > 2 && line.length < 50) {
              itemName = line;
              category = cat;
              confidence = 0.7;
              break;
            }
          }
        }

        if (category !== "Other") break;
      }
    }
  }

  if (category === "Other" && allDetections && allDetections.length > 0) {
    const labels = allDetections.filter((d) => d.source === "label");
    const objects = allDetections.filter((d) => d.source === "object");

    for (const label of labels) {
      const labelLower = label.name.toLowerCase();

      if (nonFoodItems.some((word) => labelLower.includes(word))) {
        continue;
      }

      for (const [cat, keywords] of Object.entries(foodCategories)) {
        if (keywords.some((keyword) => labelLower.includes(keyword))) {
          itemName = label.name;
          category = cat;
          confidence = label.confidence;
          break;
        }
      }

      if (category !== "Other") break;
    }

    if (category === "Other") {
      for (const obj of objects) {
        const objLower = obj.name.toLowerCase();

        if (nonFoodItems.some((word) => objLower.includes(word))) {
          continue;
        }

        for (const [cat, keywords] of Object.entries(foodCategories)) {
          if (keywords.some((keyword) => objLower.includes(keyword))) {
            itemName = obj.name;
            category = cat;
            confidence = obj.confidence;
            break;
          }
        }

        if (category !== "Other") break;
      }
    }
  }

  return {
    name: itemName,
    category: category,
    confidence: confidence,
  };
}

/**
 * Helper function to find expiry date in text
 * @param {string} text - The text to search
 * @return {string|null} The found date string or null
 */
function findExpiryDate(text) {
  if (!text) return null;

  const patterns = [
    /(?:EXP|BEST BEFORE|BBE|USE BY|EXPIRES?)[\s:]*(\d{1,2})[/-](\d{1,2})[/-](\d{4})/i, // eslint-disable-line max-len
    /(?:EXP|BEST BEFORE|BBE|USE BY|EXPIRES?)[\s:]*(\d{1,2})[/-](\d{1,2})[/-](\d{2})/i, // eslint-disable-line max-len
    /(?:EXP|BEST BEFORE|BBE|USE BY|EXPIRES?)[\s:]*(\d{1,2})[/-](\d{4})/i,
    /(?:EXP|BEST BEFORE|BBE|USE BY|EXPIRES?)[\s:]*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*[\s,]*(\d{4})/i, // eslint-disable-line max-len
    /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/,
    /(\d{1,2})[/-](\d{1,2})[/-](\d{2})/,
    /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*[\s,]*(\d{1,2})[\s,]*(\d{4})/i, // eslint-disable-line max-len
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return null;
}

/**
 * Helper function to format dates to YYYY-MM-DD
 * @param {string} dateString - The date string to format
 * @return {string|null} The formatted date or original string
 */
function formatDate(dateString) {
  if (!dateString) return null;

  const monthMap = {
    "JAN": "01", "FEB": "02", "MAR": "03", "APR": "04",
    "MAY": "05", "JUN": "06", "JUL": "07", "AUG": "08",
    "SEP": "09", "OCT": "10", "NOV": "11", "DEC": "12",
  };

  try {
    const monthYearMatch = dateString.match(
        /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*[\s,]*(\d{4})/i,
    );
    if (monthYearMatch) {
      const month = monthMap[monthYearMatch[1].toUpperCase().substring(0, 3)];
      const year = monthYearMatch[2];
      return `${year}-${month}-01`;
    }

    const fullDateMatch = dateString.match(
        /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/,
    );
    if (fullDateMatch) {
      const day = fullDateMatch[1].padStart(2, "0");
      const month = fullDateMatch[2].padStart(2, "0");
      const year = fullDateMatch[3];
      return `${year}-${month}-${day}`;
    }

    const shortDateMatch = dateString.match(
        /(\d{1,2})[/-](\d{1,2})[/-](\d{2})/,
    );
    if (shortDateMatch) {
      const day = shortDateMatch[1].padStart(2, "0");
      const month = shortDateMatch[2].padStart(2, "0");
      const year = `20${shortDateMatch[3]}`;
      return `${year}-${month}-${day}`;
    }

    const monthYearSlashMatch = dateString.match(/(\d{1,2})[/-](\d{4})/);
    if (monthYearSlashMatch) {
      const month = monthYearSlashMatch[1].padStart(2, "0");
      const year = monthYearSlashMatch[2];
      return `${year}-${month}-01`;
    }

    return dateString;
  } catch (error) {
    console.error("Date formatting error:", error);
    return dateString;
  }
}

/**
 * Helper to normalize text for search tags
 * @param {string} text - Text to normalize
 * @return {Array<string>} Array of normalized keywords
 */
function normalizeForSearch(text) {
  if (!text) return [];
  // Exclude staples to prevent search pollution
  const staples = [
    "salt", "pepper", "oil", "water", "sugar", "flour", "butter",
  ];
  return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 &&
      !["fresh", "canned", "frozen", "dried", "ground", "whole"].includes(w) &&
      !staples.includes(w));
}

exports.generateRecipes = onRequest({
  cors: true,
  timeoutSeconds: 300,
}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed. Use POST."});
    return;
  }

  try {
    const uid = await verifyAuth(req);
    if (!uid) {
      res.status(401).json({error: "Unauthorized. Invalid or missing token."});
      return;
    }

    const db = admin.firestore();

    // Check if user is in a household
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const householdId = userData?.householdId || null;

    // Determine usage reference (household or personal)
    let usageRef;
    if (householdId) {
      usageRef = db.collection("households").doc(householdId)
          .collection("usage").doc("current");
    } else {
      usageRef = db.collection("users").doc(uid)
          .collection("usage").doc("current");
    }

    const usageDoc = await usageRef.get();

    let usageData = usageDoc.exists ? usageDoc.data() : null;

    if (!usageData) {
      usageData = {
        tier: "anonymous",
        scansRemaining: 10,
        recipesRemaining: 10,
        totalScansUsed: 0,
        totalRecipesUsed: 0,
        lastMonthlyBonusDate: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        resetDate: null,
      };
      await usageRef.set(usageData);
    }

    if (usageData.recipesRemaining <= 0) {
      res.status(403).json({error: "No recipes remaining."});
      return;
    }

    const {
      ingredients,
      language,
      dishCategory,
      maxRecipes,
      userGuidance,
    } = req.body;

    if (!ingredients) {
      res.status(400).json({error: "No ingredients provided"});
      return;
    }

    const targetLanguage = language || "en";
    const selectedDishType = dishCategory || "mainCourse";

    console.log("Generating recipes for ingredients:", ingredients);
    console.log("Target language:", targetLanguage);
    console.log("Dish category:", selectedDishType);
    console.log("Max recipes requested:", maxRecipes);

    const langNames = {
      en: "English", es: "Spanish", fr: "French", de: "German",
      it: "Italian", pt: "Portuguese", ru: "Russian", zh: "Chinese",
      ja: "Japanese", ko: "Korean", ar: "Arabic", hi: "Hindi",
      tr: "Turkish", pl: "Polish", nl: "Dutch",
      sl: "Slovenian", hr: "Croatian", sr: "Serbian",
    };
    const targetLanguageName = langNames[targetLanguage] || "English";

    const dishCategoryMap = {
      mainCourse: "Main Course / Dinner Entrée",
      salad: "Salad",
      dessert: "Dessert / Sweet Dish",
      breakfast: "Breakfast / Brunch",
      soup: "Soup or Stew",
      snack: "Snack / Light Bite",
    };
    const dishTypeDescription = dishCategoryMap[selectedDishType] ||
        "Main Course";

    const ingredientsArray = Array.isArray(ingredients) ? ingredients :
        (typeof ingredients === "string" ?
            ingredients.split(",").map((i) => i.trim()) : []);

    const filteredIngredients = ingredientsArray.filter((item) => {
      if (!item || typeof item !== "string") return false;

      const name = item.toLowerCase();
      const isBeverage = name.includes("water") || name.includes("juice") ||
                        name.includes("soda") || name.includes("cola") ||
                        name.includes("beer") || name.includes("wine") ||
                        name.includes("coffee") || name.includes("tea");
      const isCookingIngredient = name.includes("milk") ||
                                  name.includes("cream") ||
                                  name.includes("broth") ||
                                  name.includes("stock");
      return !isBeverage || isCookingIngredient;
    });

    console.log("Filtered ingredients (beverages removed):",
        filteredIngredients);

    const ingredientCount = filteredIngredients.length;
    let maxRecipeCount = 7;
    if (typeof maxRecipes === "number" && maxRecipes > 0) {
      maxRecipeCount = maxRecipes;
    } else {
      if (ingredientCount <= 2) {
        maxRecipeCount = 0;
      } else if (ingredientCount === 3) {
        maxRecipeCount = 3;
      } else if (ingredientCount <= 5) {
        maxRecipeCount = 4;
      }
    }

    if (maxRecipeCount === 0) {
      res.status(200).json({
        recipes: [],
        note:
          "Not enough ingredients available to confidently suggest recipes. " +
          "Add more pantry items and try again.",
        noteCode: "limited_pantry_none",
      });
      return;
    }

    // --- HYBRID RECIPE ENGINE START ---

    // 1. Prepare Search Tags
    const userSearchTags = [...new Set(
        filteredIngredients.flatMap((i) => normalizeForSearch(i)),
    )].slice(0, 10); // Limit to 10 for Firestore query

    // 2. Define Parallel Tasks
    const generateNewTask = async () => {
      // Reduce max count for generation if we are also retrieving
      const genCount = Math.min(maxRecipeCount, 3); // Generate max 3 new ones
      const prompt = `
You are an experienced professional chef. Create ${genCount} recipes ` +
`based on these ingredients: ${filteredIngredients.join(", ")}.

TARGET LANGUAGE: ${targetLanguageName} (ALL output must be in this language).
DISH TYPE: ${dishTypeDescription}

STRICT GUIDELINES:
1. USE PROVIDED INGREDIENTS that are appropriate for the requested ` +
`DISH TYPE. You may assume basic staples ` +
`(Salt, Pepper, Oil, Water, Sugar).
2. If a recipe requires other ingredients not listed, DO NOT suggest it, ` +
`or adapt it to use what is available.
3. **NEVER** include meat, fish, or poultry unless it is explicitly ` +
`listed in the provided ingredients.
4. **NEVER** include savory ingredients (meat, fish, poultry, garlic, ` +
`onion) if the requested DISH TYPE is Dessert/Sweet.
5. If the requested DISH TYPE is Soup, **DO NOT** generate salads or solid ` +
`main courses.
6. If the requested DISH TYPE is Salad, **DO NOT** generate soups or ` +
`cooked main courses (unless warm salad).
7. Recipes must be delicious, tested, and achievable.
8. Provide accurate nutrition estimates per serving.

RESPONSE FORMAT:
Return a raw JSON object with a "recipes" array. Each recipe object must ` +
`match this schema:
{
  "name": "Recipe Name",
  "emoji": "🍲",
  "description": "Appetizing summary",
  "prepTime": "15 minutes",
  "cookTime": "30 minutes",
  "servings": "4",
  "difficulty": "Easy/Medium/Hard",
  "cuisine": "Cuisine Type",
  "skillLevel": "Beginner/Intermediate/Advanced",
  "nutrition": {
    "calories": 450,
    "protein": "25g",
    "carbs": "35g",
    "fat": "18g"
  },
  "ingredients": ["List of ingredients with quantities"],
  "instructions": ["Step 1", "Step 2"],
  "tips": ["Chef tip 1"]
}

${userGuidance && userGuidance.trim() ?
    `USER REQUEST: ${userGuidance.trim()}` : ""}
`;

      const result = await recipeModel.generateContent({
        contents: [{role: "user", parts: [{text: prompt}]}],
        generationConfig: {responseMimeType: "application/json"},
      });

      const response = await result.response;
      let text = "";
      if (response.candidates && response.candidates[0] &&
          response.candidates[0].content &&
          response.candidates[0].content.parts &&
          response.candidates[0].content.parts[0]) {
        text = response.candidates[0].content.parts[0].text || "";
      }

      try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed.recipes) ? parsed.recipes : [];
      } catch (e) {
        console.error("Failed to parse generated recipes:", e);
        return [];
      }
    };

    const retrieveExistingTask = async () => {
      if (userSearchTags.length === 0) return [];

      try {
        // Broad search in global repository
        const snapshot = await db.collection("global_recipes")
            .where("language", "==", targetLanguage) // Filter by language
            .where("searchTags", "array-contains-any", userSearchTags)
            .orderBy("rating", "desc") // Prioritize high rated
            .limit(20)
            .get();

        if (snapshot.empty) return [];

        const candidates = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Use Gemini Flash to filter candidates
        const filterPrompt = `
You are a strict recipe filter.
User Ingredients: ${filteredIngredients.join(", ")}
Requested Dish Type: ${dishTypeDescription}
${userGuidance ? `User Guidance: ${userGuidance}` : ""}
Candidate Recipes:
${JSON.stringify(candidates.map((c, i) => ({
    id: i,
    name: c.name,
    description: c.description,
    ingredients: c.ingredients,
  })))}

Task: Analyze each candidate to check if it can be made using ` +
`**ONLY** the User Ingredients and allowed staples.

STRICT FILTERING RULES:
1. **ALLOWED STAPLES**: Salt, Black Pepper, Oil, Water, Sugar.
2. **MISSING INGREDIENTS**: If a recipe requires **ANY** ingredient ` +
`(including spices, herbs, sauces, dairy, grains, or garnishes) that is ` +
`NOT in the User Ingredients and NOT an Allowed Staple, you **MUST REJECT** it.
3. **NO SUBSTITUTIONS**: Do not assume the user can substitute or omit ` +
`main ingredients.
4. **DISH TYPE**: Reject recipes that do not match the Requested Dish Type.
5. **USER GUIDANCE**: Reject recipes that conflict with User Guidance.

Response Format:
Return a JSON object with an "analysis" array and "selectedIds".
Example:
{
  "analysis": [
    { "id": 0, "missing": ["Milk"], "status": "REJECT" },
    { "id": 1, "missing": [], "status": "ACCEPT" }
  ],
  "selectedIds": [1]
}
`;

        const filterResult = await filterModel.generateContent({
          contents: [{role: "user", parts: [{text: filterPrompt}]}],
          generationConfig: {responseMimeType: "application/json"},
        });

        const filterResponse = await filterResult.response;
        let filterText = "";
        if (filterResponse.candidates && filterResponse.candidates[0] &&
            filterResponse.candidates[0].content &&
            filterResponse.candidates[0].content.parts &&
            filterResponse.candidates[0].content.parts[0]) {
          filterText = filterResponse.candidates[0].content.parts[0].text || "";
        }

        const filterParsed = JSON.parse(filterText);
        const selectedIndices = filterParsed.selectedIds || [];

        return selectedIndices.map((i) => candidates[i]).filter((r) => r);
      } catch (error) {
        console.error("Error retrieving existing recipes:", error);
        return [];
      }
    };

    // Execute tasks in parallel
    const [newRecipes, existingRecipes] = await Promise.all([
      generateNewTask(),
      retrieveExistingTask(),
    ]);

    console.log(`Generated: ${newRecipes.length}, ` +
        `Retrieved: ${existingRecipes.length}`);

    // 3. Background Save (Fire and Forget)
    // Save ONLY the newly generated recipes to the global repo
    const savePromises = newRecipes.map(async (recipe) => {
      try {
        // Strip user specific data
        const {
          name, emoji, description, prepTime, cookTime, servings,
          difficulty, cuisine, skillLevel, nutrition, ingredients,
          instructions, tips,
        } = recipe;

        // Generate search tags
        const searchTags = [...new Set(
            ingredients.flatMap((i) => normalizeForSearch(i)),
        )];

        const docRef = await db.collection("global_recipes").add({
          name, emoji, description, prepTime, cookTime, servings,
          difficulty, cuisine, skillLevel, nutrition, ingredients,
          instructions, tips,
          searchTags,
          rating: 0,
          ratingCount: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          language: targetLanguage, // Save language context
        });
        return {...recipe, id: docRef.id};
      } catch (e) {
        console.error("Error saving global recipe:", e);
        return recipe;
      }
    });

    // We await savePromises to ensure we get the IDs back
    const savedNewRecipes = await Promise.all(savePromises);

    // --- HYBRID RECIPE ENGINE END ---

    // Combine and Deduplicate (using savedNewRecipes which have IDs)
    const allRecipes = [...existingRecipes, ...savedNewRecipes];

    // Only charge if we actually have recipes to return
    if (allRecipes.length > 0) {
      await usageRef.update({
        recipesRemaining: admin.firestore.FieldValue.increment(-1),
        totalRecipesUsed: admin.firestore.FieldValue.increment(1),
      });
    }
    const uniqueRecipes = [];
    const seenNames = new Set();

    for (const r of allRecipes) {
      if (!seenNames.has(r.name)) {
        seenNames.add(r.name);
        uniqueRecipes.push(r);
      }
    }

    const finalRecipes = uniqueRecipes.slice(0, maxRecipeCount);

    const payload = {
      recipes: finalRecipes,
    };

    if (ingredientCount <= 3) {
      payload.note =
        "Pantry ingredient count is low, so recipe variety is limited.";
      payload.noteCode = "limited_pantry_low";
    }

    res.status(200).json(payload);
  } catch (error) {
    console.error("Error generating recipes:", error);
    res.status(500).json({
      error: "Failed to generate recipes",
      details: error.message,
    });
  }
});

exports.getRecipeDetails = onRequest({
  cors: true,
  timeoutSeconds: 300,
}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed. Use POST."});
    return;
  }

  try {
    const uid = await verifyAuth(req);
    if (!uid) {
      res.status(401).json({error: "Unauthorized. Invalid or missing token."});
      return;
    }

    const {recipeName, availableIngredients, language} = req.body;

    if (!recipeName) {
      res.status(400).json({error: "No recipe name provided"});
      return;
    }

    const targetLanguage = language || "en";
    const langNames = {
      en: "English", es: "Spanish", fr: "French", de: "German",
      it: "Italian", pt: "Portuguese", ru: "Russian", zh: "Chinese",
      ja: "Japanese", ko: "Korean", ar: "Arabic", hi: "Hindi",
      tr: "Turkish", pl: "Polish", nl: "Dutch",
      sl: "Slovenian", hr: "Croatian", sr: "Serbian",
    };
    const targetLanguageName = langNames[targetLanguage] || "English";

    console.log("Getting details for recipe:", recipeName);
    console.log("Target language:", targetLanguageName);

    const detailLines = [
      "You are an experienced professional chef. Create a DELICIOUS, " +
        "TESTED recipe for: " + recipeName,
      "",
      "**IMPORTANT: ALL text must be in " + targetLanguageName + " language.**",
      "",
      "**INGREDIENTS THE USER HAS IN THEIR PANTRY:**",
      availableIngredients || "Not specified",
      "",
      "🚨 QUALITY FIRST - THIS RECIPE MUST:",
      "✓ Taste genuinely DELICIOUS with proper flavor balance",
      "✓ Be SIMPLE and EFFICIENT to prepare",
      "✓ Have tested, proven cooking techniques",
      "✓ Include clear WHY explanations for each step",
      "✓ Balance flavors: sweet/salty/umami/acid/fat",
      "✓ Create appealing textures and presentation",
      "",
      "🚨 STRICT INGREDIENT RULES:",
      "1. **USE ONLY ingredients from the pantry list above**",
      "2. You MAY assume: salt, black pepper, cooking oil, water, sugar",
      "3. **DO NOT add ANY other ingredients** unless listed",
      "4. If recipe needs unlisted ingredients, adapt creatively",
      "5. Mark any \"nice-to-have\" as OPTIONAL: \"(Optional if available)\"",
      "6. Focus on maximizing flavor with MINIMAL complexity",
      "7. **CRITICAL: Use ONLY the ingredients necessary for this dish**",
      "8. IGNORE other available ingredients if they don't belong",
      "9. Include precise measurements, temperatures, and timing",
      "10. Explain WHY each step matters for the final taste " +
        "(include this explanation WITHIN the step string)",
      "11. **ALL text must be in " + targetLanguageName + "**",
      "",
      "EXAMPLE OPTIONAL INGREDIENT:",
      "\"1 tbsp butter (Optional - substitute with extra oil)\"",
      "",
      "Respond with JSON format:",
      "{",
      "  \"name\": \"" + recipeName + "\",",
      "  \"emoji\": \"🍝\",",
      "  \"difficulty\": \"Easy|Medium|Hard (in " + targetLanguageName + ")\",",
      "  \"cookTime\": \"45 minutes\",",
      "  \"prepTime\": \"15 minutes\",",
      "  \"servings\": \"4\",",
      "  \"cuisine\": \"Type (in " + targetLanguageName + ")\",",
      "  \"nutrition\": {",
      "    \"calories\": 450,",
      "    \"protein\": \"25g\",",
      "    \"carbs\": \"35g\",",
      "    \"fat\": \"18g\"",
      "  },",
      "  \"skillLevel\": \"Beginner|Intermediate|Advanced (in " +
        targetLanguageName + ")\",",
      "  \"ingredients\": [",
      "    \"2 cups [ingredient from pantry] (in " + targetLanguageName +
        ")\",",
      "    \"1 tbsp [optional ingredient] (Optional if available) (in " +
        targetLanguageName + ")\",",
      "    \"etc - USE ONLY PANTRY INGREDIENTS\"",
      "  ],",
      "  \"instructions\": [",
      "    \"Step 1 in " + targetLanguageName +
        " - detailed and professional\",",
      "    \"Step 2 in " + targetLanguageName + "\",",
      "    \"etc\"",
      "  ],",
      "  \"tips\": [",
      "    \"Chef's tip in " + targetLanguageName + "\",",
      "    \"Optional substitution in " + targetLanguageName + "\",",
      "    \"etc\"",
      "  ]",
      "}",
      "",
      "**NUTRITION CALCULATION:**",
      "- Calculate calories and macros PER SERVING based on all ingredients",
      "- Use accurate nutritional data for each ingredient and quantity",
      "- Account for cooking method (oil absorption, water loss, etc.)",
      "",
      "Remember: Use ONLY pantry ingredients (+ salt, pepper, oil, water,",
      "sugar). Mark anything else as OPTIONAL! ALL text in " +
        targetLanguageName + ".",
    ];

    const prompt = detailLines.join("\n");

    const result = await recipeModel.generateContent({
      contents: [{
        role: "user",
        parts: [{text: prompt}],
      }],
    });

    const response = await result.response;
    let responseText = "";
    if (
      response.candidates &&
      response.candidates[0] &&
      response.candidates[0].content &&
      response.candidates[0].content.parts &&
      response.candidates[0].content.parts[0]
    ) {
      responseText = response.candidates[0].content.parts[0].text || "";
    }

    console.log("Gemini recipe details:", responseText);

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      res.status(200).json(parsed);
    } else {
      res.status(500).json({error: "Failed to parse recipe details"});
    }
  } catch (error) {
    console.error("Error getting recipe details:", error);
    res.status(500).json({
      error: "Failed to get recipe details",
      details: error.message,
    });
  }
});

exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
  const db = admin.firestore();
  const usageRef = db.collection("users").doc(user.uid)
      .collection("usage").doc("current");

  const initialData = {
    tier: "anonymous",
    scansRemaining: 10,
    recipesRemaining: 10,
    totalScansUsed: 0,
    totalRecipesUsed: 0,
    lastMonthlyBonusDate: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    resetDate: null,
  };

  try {
    await usageRef.set(initialData);
    console.log(`Initialized usage for user ${user.uid}`);
  } catch (error) {
    console.error(`Error initializing usage for user ${user.uid}:`, error);
  }
});

exports.upgradeTier = onRequest({cors: true}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed. Use POST."});
    return;
  }

  try {
    const uid = await verifyAuth(req);
    if (!uid) {
      res.status(401).json({error: "Unauthorized"});
      return;
    }

    const {newTier} = req.body;
    if (!newTier) {
      res.status(400).json({error: "Missing newTier"});
      return;
    }

    const db = admin.firestore();
    const usageRef = db.collection("users").doc(uid)
        .collection("usage").doc("current");

    const usageDoc = await usageRef.get();
    let usage = usageDoc.exists ? usageDoc.data() : null;

    if (!usage) {
      usage = {
        tier: newTier,
        scansRemaining: newTier === "anonymous" ? 10 :
            newTier === "free" ? 30 : 500,
        recipesRemaining: newTier === "anonymous" ? 10 :
            newTier === "free" ? 30 : 500,
        totalScansUsed: 0,
        totalRecipesUsed: 0,
        lastMonthlyBonusDate: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        resetDate: newTier === "premium" ?
            admin.firestore.FieldValue.serverTimestamp() : null,
      };
      await usageRef.set(usage);
      res.status(200).json(usage);
      return;
    }

    const updates = {tier: newTier};

    // Only reset limits if the tier is actually changing
    if (usage.tier !== newTier) {
      if (newTier === "free") {
        // PROTECTION: Prevent accidental downgrades due to race conditions
        // If user became premium recently (e.g., < 1 hour ago), ignore the downgrade
        if (usage.tier === "premium" && usage.resetDate) {
          const lastReset = usage.resetDate.toDate();
          const now = new Date();
          const minutesSinceReset = (now - lastReset) / (1000 * 60);
          
          if (minutesSinceReset < 60) {
            console.log(`Ignoring downgrade for ${uid} - Premium active for only ${minutesSinceReset.toFixed(1)} mins`);
            res.status(200).json(usage); // Return current usage without changes
            return;
          }
        }

        updates.scansRemaining = 30;
        updates.recipesRemaining = 30;
        updates.lastMonthlyBonusDate =
            admin.firestore.FieldValue.serverTimestamp();
      } else if (newTier === "premium") {
        updates.scansRemaining = 500;
        updates.recipesRemaining = 500;
        updates.resetDate = admin.firestore.FieldValue.serverTimestamp();
      }
    } else {
      console.log(`User ${uid} is already ${newTier}, skipping usage reset.`);
    }

    await usageRef.update(updates);

    // Check if user is in a household and update household usage directly
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    if (userData && userData.householdId) {
      const householdId = userData.householdId;
      const householdUsageRef = db.collection("households")
          .doc(householdId).collection("usage").doc("current");
      
      // Directly update household usage based on the new tier
      if (newTier === "premium") {
        // Check if household is already premium to avoid resetting credits
        const householdUsageDoc = await householdUsageRef.get();
        const householdUsage = householdUsageDoc.exists ? 
            householdUsageDoc.data() : null;

        if (!householdUsage || householdUsage.tier !== "premium") {
          // User is now premium - upgrade household to premium
          await householdUsageRef.set({
            tier: "premium",
            scansRemaining: 500,
            recipesRemaining: 500,
            resetDate: admin.firestore.FieldValue.serverTimestamp(),
          }, {merge: true});
          
          // Also update household hasPremium flag
          await db.collection("households").doc(householdId).update({
            hasPremium: true,
          });
          
          console.log(`✅ Upgraded household ${householdId} to premium`);
        } else {
          console.log(`Household ${householdId} is already premium, skipping reset.`);
        }
      } else if (newTier === "free") {
        // User downgraded - check if any other member is still premium
        const householdDoc = await db.collection("households")
            .doc(householdId).get();
        if (householdDoc.exists) {
          const householdData = householdDoc.data();
          await updateHouseholdPremiumStatus(
              householdId,
              householdData.memberIds || [],
          );
        }
      }
    }

    res.status(200).json({...usage, ...updates});
  } catch (error) {
    console.error("Error upgrading tier:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

exports.redeemGiftCode = onRequest({cors: true}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed. Use POST."});
    return;
  }

  try {
    const uid = await verifyAuth(req);
    if (!uid) {
      res.status(401).json({error: "Unauthorized"});
      return;
    }

    const {code} = req.body;
    if (!code) {
      res.status(400).json({error: "Missing code"});
      return;
    }

    const db = admin.firestore();
    const codeRef = db.collection("giftCodes").doc(code);
    const usageRef = db.collection("users").doc(uid)
        .collection("usage").doc("current");

    const codeDoc = await codeRef.get();
    if (!codeDoc.exists) {
      res.status(400).json({success: false, message: "Invalid gift code"});
      return;
    }

    const codeData = codeDoc.data();
    if (codeData.used) {
      res.status(400).json({
        success: false,
        message: "This gift code has already been used",
        usedBy: codeData.usedBy,
        usedAt: codeData.usedAt,
      });
      return;
    }

    if (codeData.expiresAt && codeData.expiresAt.toDate() < new Date()) {
      res.status(400).json({
        success: false,
        message: "This gift code has expired",
      });
      return;
    }

    const usageDoc = await usageRef.get();
    if (!usageDoc.exists) {
      res.status(404).json({
        success: false,
        message: "User usage data not found",
      });
      return;
    }

    const usage = usageDoc.data();
    const updates = {};

    if (codeData.type === "premium") {
      updates.tier = "premium";
      updates.scansRemaining = 500;
      updates.recipesRemaining = 500;
      updates.resetDate = admin.firestore.FieldValue.serverTimestamp();
      updates.subscription = {
        tier: "premium",
        source: "giftCode",
        giftCode: code,
        startDate: admin.firestore.FieldValue.serverTimestamp(),
        durationMonths: codeData.durationMonths || 1,
      };
    } else if (codeData.type === "scans") {
      updates.scansRemaining = (usage.scansRemaining || 0) +
          (codeData.scansAmount || 0);
    } else if (codeData.type === "recipes") {
      updates.recipesRemaining = (usage.recipesRemaining || 0) +
          (codeData.recipesAmount || 0);
    } else if (codeData.type === "bundle") {
      updates.scansRemaining = (usage.scansRemaining || 0) +
          (codeData.scansAmount || 0);
      updates.recipesRemaining = (usage.recipesRemaining || 0) +
          (codeData.recipesAmount || 0);
    }

    await usageRef.update(updates);
    await codeRef.update({
      used: true,
      usedBy: uid,
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({
      success: true,
      message: "Gift code redeemed successfully!",
      benefits: codeData,
      newUsage: {...usage, ...updates},
    });
  } catch (error) {
    console.error("Error redeeming gift code:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

exports.checkMonthlyBonus = onRequest({cors: true}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed. Use POST."});
    return;
  }

  try {
    const uid = await verifyAuth(req);
    if (!uid) {
      res.status(401).json({error: "Unauthorized"});
      return;
    }

    const db = admin.firestore();
    const usageRef = db.collection("users").doc(uid)
        .collection("usage").doc("current");

    const usageDoc = await usageRef.get();
    if (!usageDoc.exists) {
      res.status(200).json({bonusApplied: false, message: "No usage data"});
      return;
    }

    const usage = usageDoc.data();

    // Handle Premium Tier Reset
    if (usage.tier === "premium") {
      const now = new Date();
      const lastReset = usage.resetDate ?
          usage.resetDate.toDate() :
          (usage.createdAt ? usage.createdAt.toDate() : new Date(0));

      const monthsDiff = Math.floor(
          (now - lastReset) / (30 * 24 * 60 * 60 * 1000),
      );

      if (monthsDiff >= 1) {
        await usageRef.update({
          scansRemaining: 500,
          recipesRemaining: 500,
          resetDate: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(200).json({
          bonusApplied: true,
          message: "Premium monthly limit reset to 500",
          newScansRemaining: 500,
          newRecipesRemaining: 500,
        });
      } else {
        res.status(200).json({
          bonusApplied: false,
          message: "Premium reset not yet due",
          nextResetInDays: 30 - Math.floor(
              (now - lastReset) / (24 * 60 * 60 * 1000),
          ),
        });
      }
      return;
    }

    if (usage.tier !== "free") {
      res.status(200).json({
        bonusApplied: false,
        message: "Not a free or premium tier user",
      });
      return;
    }

    const now = new Date();
    const lastBonus = usage.lastMonthlyBonusDate ?
        usage.lastMonthlyBonusDate.toDate() : new Date(0);

    const monthsDiff = Math.floor(
        (now - lastBonus) / (30 * 24 * 60 * 60 * 1000),
    );

    if (monthsDiff >= 1) {
      const bonusAmount = monthsDiff * 5;
      const newScansRemaining = (usage.scansRemaining || 0) + bonusAmount;
      const newRecipesRemaining = (usage.recipesRemaining || 0) + bonusAmount;

      await usageRef.update({
        scansRemaining: newScansRemaining,
        recipesRemaining: newRecipesRemaining,
        lastMonthlyBonusDate: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({
        bonusApplied: true,
        bonusAmount,
        newScansRemaining,
        newRecipesRemaining,
        monthsMissed: monthsDiff,
      });
    } else {
      res.status(200).json({
        bonusApplied: false,
        message: "Bonus already applied this month",
      });
    }
  } catch (error) {
    console.error("Error checking monthly bonus:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

exports.initializeUsage = onRequest({cors: true}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed. Use POST."});
    return;
  }

  try {
    const uid = await verifyAuth(req);
    if (!uid) {
      res.status(401).json({error: "Unauthorized"});
      return;
    }

    const db = admin.firestore();
    const usageRef = db.collection("users").doc(uid)
        .collection("usage").doc("current");

    const usageDoc = await usageRef.get();
    if (usageDoc.exists) {
      res.status(200).json(usageDoc.data());
      return;
    }

    const initialData = {
      tier: "anonymous",
      scansRemaining: 10,
      recipesRemaining: 10,
      totalScansUsed: 0,
      totalRecipesUsed: 0,
      lastMonthlyBonusDate: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      resetDate: null,
    };

    await usageRef.set(initialData);
    res.status(200).json(initialData);
  } catch (error) {
    console.error("Error initializing usage:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

exports.recordLegalConsent = onRequest({cors: true}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed. Use POST."});
    return;
  }

  try {
    const uid = await verifyAuth(req);
    if (!uid) {
      res.status(401).json({error: "Unauthorized"});
      return;
    }

    const {consentDate, termsVersion, privacyVersion} = req.body;
    
    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);

    await userRef.set({
      legalConsent: {
        accepted: true,
        acceptedAt: consentDate ?
            new Date(consentDate) :
            admin.firestore.FieldValue.serverTimestamp(),
        recordedAt: admin.firestore.FieldValue.serverTimestamp(),
        termsVersion: termsVersion || "1.0",
        privacyVersion: privacyVersion || "1.0",
      },
    }, {merge: true});

    res.status(200).json({success: true});
  } catch (error) {
    console.error("Error recording legal consent:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

exports.rateRecipe = onRequest({cors: true}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed. Use POST."});
    return;
  }

  try {
    const uid = await verifyAuth(req);
    if (!uid) {
      res.status(401).json({error: "Unauthorized"});
      return;
    }

    const {recipeId, rating} = req.body;
    if (!recipeId || !rating) {
      res.status(400).json({error: "Missing recipeId or rating"});
      return;
    }

    const db = admin.firestore();
    const recipeRef = db.collection("global_recipes").doc(recipeId);

    await db.runTransaction(async (t) => {
      const doc = await t.get(recipeRef);
      if (!doc.exists) {
        // If it's not a global recipe, we can't rate it globally.
        return;
      }

      const data = doc.data();
      const currentRating = data.rating || 0;
      const currentCount = data.ratingCount || 0;

      const newCount = currentCount + 1;
      const newRating = ((currentRating * currentCount) + rating) / newCount;

      t.update(recipeRef, {
        rating: newRating,
        ratingCount: newCount,
      });
    });

    res.status(200).json({success: true});
  } catch (error) {
    console.error("Error rating recipe:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

/**
 * Firestore Trigger for Job-Based Recipe Generation
 * Listens for new documents in users/{userId}/recipe_requests
 */
exports.onRecipeRequestCreated = functions
    .runWith({
      memory: "1GB",
      timeoutSeconds: 300,
    })
    .firestore
    .document("users/{userId}/recipe_requests/{requestId}")
    .onCreate(async (snap, context) => {
      const requestId = context.params.requestId;
      const userId = context.params.userId;
      const requestData = snap.data();

      console.log(`Processing recipe request ${requestId} for user ${userId}`);

      try {
        const db = admin.firestore();

        // Check if user is in a household
        const userDoc = await db.collection("users").doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : null;
        const householdId = userData?.householdId || null;

        // Determine usage reference (household or personal)
        let usageRef;
        if (householdId) {
          usageRef = db.collection("households").doc(householdId)
              .collection("usage").doc("current");
        } else {
          usageRef = db.collection("users").doc(userId)
              .collection("usage").doc("current");
        }
        
        // 1. Check Usage Quota
        const usageDoc = await usageRef.get();
        let usageData = usageDoc.exists ? usageDoc.data() : null;

        if (!usageData) {
          // Initialize if missing (should exist, but safety first)
          usageData = {
            tier: "anonymous",
            scansRemaining: 10,
            recipesRemaining: 10,
            totalScansUsed: 0,
            totalRecipesUsed: 0,
            lastMonthlyBonusDate: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            resetDate: null,
          };
          await usageRef.set(usageData);
        }

        if (usageData.recipesRemaining <= 0) {
          await snap.ref.update({
            status: "error",
            error: "No recipes remaining.",
            errorCode: "quota_exceeded",
          });
          return;
        }

        // 2. Validate Input
        const {
          ingredients,
          language,
          dishCategory,
          maxRecipes,
          userGuidance,
        } = requestData;

        if (!ingredients) {
          await snap.ref.update({
            status: "error",
            error: "No ingredients provided",
          });
          return;
        }

        // Update status to processing
        await snap.ref.update({status: "processing"});

        const targetLanguage = language || "en";
        const selectedDishType = dishCategory || "mainCourse";

        const langNames = {
          en: "English", es: "Spanish", fr: "French", de: "German",
          it: "Italian", pt: "Portuguese", ru: "Russian", zh: "Chinese",
          ja: "Japanese", ko: "Korean", ar: "Arabic", hi: "Hindi",
          tr: "Turkish", pl: "Polish", nl: "Dutch",
          sl: "Slovenian", hr: "Croatian", sr: "Serbian",
        };
        const targetLanguageName = langNames[targetLanguage] || "English";

        const dishCategoryMap = {
          mainCourse: "Main Course / Dinner Entrée",
          salad: "Salad",
          dessert: "Dessert / Sweet Dish",
          breakfast: "Breakfast / Brunch",
          soup: "Soup or Stew",
          snack: "Snack / Light Bite",
        };
        const dishTypeDescription = dishCategoryMap[selectedDishType] ||
            "Main Course";

        const ingredientsArray = Array.isArray(ingredients) ? ingredients :
            (typeof ingredients === "string" ?
                ingredients.split(",").map((i) => i.trim()) : []);

        const filteredIngredients = ingredientsArray.filter((item) => {
          if (!item || typeof item !== "string") return false;
          const name = item.toLowerCase();
          const isBeverage = name.includes("water") || name.includes("juice") ||
                            name.includes("soda") || name.includes("cola") ||
                            name.includes("beer") || name.includes("wine") ||
                            name.includes("coffee") || name.includes("tea");
          const isCookingIngredient = name.includes("milk") ||
                                      name.includes("cream") ||
                                      name.includes("broth") ||
                                      name.includes("stock");
          return !isBeverage || isCookingIngredient;
        });

        const ingredientCount = filteredIngredients.length;
        let maxRecipeCount = 7;
        if (typeof maxRecipes === "number" && maxRecipes > 0) {
          maxRecipeCount = maxRecipes;
        } else {
          // Allow generation even with few ingredients, but limit count
          if (ingredientCount <= 2) maxRecipeCount = 2;
          else if (ingredientCount === 3) maxRecipeCount = 3;
          else if (ingredientCount <= 5) maxRecipeCount = 4;
        }

        if (ingredientCount === 0) {
          await snap.ref.update({
            status: "completed",
            recipes: [],
            note: "No valid cooking ingredients found. Please add food items.",
            noteCode: "limited_pantry_none",
          });
          return;
        }

        // --- HYBRID RECIPE ENGINE START ---

        // 1. Prepare Search Tags
        const userSearchTags = [...new Set(
            filteredIngredients.flatMap((i) => normalizeForSearch(i)),
        )].slice(0, 10);

        // 2. Define Parallel Tasks
        const generateNewTask = async (retryCount = 0) => {
          const genCount = Math.min(maxRecipeCount, 3);
          const prompt = `
You are an experienced professional chef. Create EXACTLY ${genCount} recipes ` +
`based on these ingredients: ${filteredIngredients.join(", ")}.

TARGET LANGUAGE: ${targetLanguageName} (ALL output must be in this language).
DISH TYPE: ${dishTypeDescription}

IMPORTANT: You MUST return at least 1 recipe. The user has ${ingredientCount} ingredients available.

STRICT GUIDELINES:
1. USE PROVIDED INGREDIENTS that are appropriate for the requested ` +
`DISH TYPE. You may assume basic staples ` +
`(Salt, Pepper, Oil, Water, Sugar).
2. If a recipe requires other ingredients not listed, DO NOT suggest it, ` +
`or adapt it to use what is available.
3. **NEVER** include meat, fish, or poultry unless it is explicitly ` +
`listed in the provided ingredients.
4. **NEVER** include savory ingredients (meat, fish, poultry, garlic, ` +
`onion) if the requested DISH TYPE is Dessert/Sweet.
5. If the requested DISH TYPE is Soup, **DO NOT** generate salads or solid ` +
`main courses.
6. If the requested DISH TYPE is Salad, **DO NOT** generate soups or ` +
`cooked main courses (unless warm salad).
7. Recipes must be delicious, tested, and achievable.
8. Provide accurate nutrition estimates per serving.

RESPONSE FORMAT:
Return a raw JSON object with a "recipes" array containing ${genCount} recipes.
Each recipe object must match this schema:
{
  "name": "Recipe Name",
  "emoji": "🍲",
  "description": "Appetizing summary",
  "prepTime": "15 minutes",
  "cookTime": "30 minutes",
  "servings": "4",
  "difficulty": "Easy/Medium/Hard",
  "cuisine": "Cuisine Type",
  "skillLevel": "Beginner/Intermediate/Advanced",
  "nutrition": {
    "calories": 450,
    "protein": "25g",
    "carbs": "35g",
    "fat": "18g"
  },
  "ingredients": ["List of ingredients with quantities"],
  "instructions": ["Step 1", "Step 2"],
  "tips": ["Chef tip 1"]
}

${userGuidance && userGuidance.trim() ?
    `USER REQUEST: ${userGuidance.trim()}` : ""}
`;

          try {
            console.log(`Generation Task: Attempt ${retryCount + 1}, ` +
                `requesting ${genCount} recipes for ${ingredientCount} ingredients`);

            const result = await recipeModel.generateContent({
              contents: [{role: "user", parts: [{text: prompt}]}],
              generationConfig: {responseMimeType: "application/json"},
            });

            const response = await result.response;
            let text = "";
            if (response.candidates && response.candidates[0] &&
                response.candidates[0].content &&
                response.candidates[0].content.parts &&
                response.candidates[0].content.parts[0]) {
              text = response.candidates[0].content.parts[0].text || "";
            }

            // Extract JSON from potential Markdown code blocks
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : text;
            const parsed = JSON.parse(jsonString);
            const recipes = Array.isArray(parsed.recipes) ? parsed.recipes : [];

            console.log(`Generation Task: Got ${recipes.length} recipes`);

            // Retry once if we got 0 recipes but have valid ingredients
            if (recipes.length === 0 && retryCount < 1 && ingredientCount >= 3) {
              console.log("Generation Task: No recipes returned, retrying...");
              return generateNewTask(retryCount + 1);
            }

            return recipes;
          } catch (e) {
            console.error("Failed to generate/parse recipes:", e);

            // Retry once on error if we have valid ingredients
            if (retryCount < 1 && ingredientCount >= 3) {
              console.log("Generation Task: Error occurred, retrying...");
              return generateNewTask(retryCount + 1);
            }

            return [];
          }
        };

        const retrieveExistingTask = async () => {
          console.log("Retrieval Task: Starting...");
          console.log("User Search Tags:", userSearchTags);

          if (userSearchTags.length === 0) {
            console.log("Retrieval Task: No search tags, skipping.");
            return [];
          }

          let snapshot = null;
          try {
            snapshot = await db.collection("global_recipes")
                .where("language", "==", targetLanguage)
                .where("searchTags", "array-contains-any", userSearchTags)
                .orderBy("rating", "desc")
                .limit(20)
                .get();

            console.log(`Retrieval Task: Found ${snapshot.size} candidates.`);

            if (snapshot.empty) return [];

            const candidates = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

            const filterPrompt = `
You are a strict recipe filter.
User Ingredients: ${filteredIngredients.join(", ")}
Requested Dish Type: ${dishTypeDescription}
${userGuidance ? `User Guidance: ${userGuidance}` : ""}
Candidate Recipes:
${JSON.stringify(candidates.map((c, i) => ({
    id: i,
    name: c.name,
    description: c.description,
    ingredients: c.ingredients,
  })))}

Task: Analyze each candidate to check if it can be made using ` +
`**ONLY** the User Ingredients and allowed staples.

STRICT FILTERING RULES:
1. **ALLOWED STAPLES**: Salt, Black Pepper, Oil, Water, Sugar.
2. **MISSING INGREDIENTS**: If a recipe requires **ANY** ingredient ` +
`(including spices, herbs, sauces, dairy, grains, or garnishes) that is ` +
`NOT in the User Ingredients and NOT an Allowed Staple, you **MUST REJECT** it.
3. **NO SUBSTITUTIONS**: Do not assume the user can substitute or omit ` +
`main ingredients.
4. **DISH TYPE**: Reject recipes that do not match the Requested Dish Type.
5. **USER GUIDANCE**: Reject recipes that conflict with User Guidance.

Response Format:
Return a JSON object with an "analysis" array and "selectedIds".
Example:
{
  "analysis": [
    { "id": 0, "missing": ["Milk"], "status": "REJECT" },
    { "id": 1, "missing": [], "status": "ACCEPT" }
  ],
  "selectedIds": [1]
}
`;

            const filterResult = await filterModel.generateContent({
              contents: [{role: "user", parts: [{text: filterPrompt}]}],
              generationConfig: {responseMimeType: "application/json"},
            });

            const filterResponse = await filterResult.response;
            let filterText = "";
            if (filterResponse.candidates && filterResponse.candidates[0] &&
                filterResponse.candidates[0].content &&
                filterResponse.candidates[0].content.parts &&
                filterResponse.candidates[0].content.parts[0]) {
              filterText =
                filterResponse.candidates[0].content.parts[0].text || "";
            }

            console.log("Retrieval Task: Filter response:", filterText);

            // Extract JSON from potential Markdown code blocks
            const jsonMatch = filterText.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : filterText;
            const filterParsed = JSON.parse(jsonString);
            const selectedIndices = filterParsed.selectedIds || [];

            const finalSelection = selectedIndices.map((i) => candidates[i])
                .filter((r) => r);
            console.log(
                `Retrieval Task: Selected ${finalSelection.length} recipes.`,
            );
            return finalSelection;
          } catch (error) {
            console.error("Error retrieving existing recipes:", error);
            return [];
          }
        };

        // Execute tasks in parallel
        const [newRecipes, existingRecipes] = await Promise.all([
          generateNewTask(),
          retrieveExistingTask(),
        ]);

        // 3. Background Save (Fire and Forget)
        const savePromises = newRecipes.map(async (recipe) => {
          try {
            const {
              name, emoji, description, prepTime, cookTime, servings,
              difficulty, cuisine, skillLevel, nutrition, ingredients,
              instructions, tips,
            } = recipe;

            const searchTags = [...new Set(
                ingredients.flatMap((i) => normalizeForSearch(i)),
            )];

            const docRef = await db.collection("global_recipes").add({
              name, emoji, description, prepTime, cookTime, servings,
              difficulty, cuisine, skillLevel, nutrition, ingredients,
              instructions, tips,
              searchTags,
              rating: 0,
              ratingCount: 0,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              language: targetLanguage,
            });
            return {...recipe, id: docRef.id};
          } catch (e) {
            console.error("Error saving global recipe:", e);
            return recipe;
          }
        });

        const savedNewRecipes = await Promise.all(savePromises);

        // --- HYBRID RECIPE ENGINE END ---

        const allRecipes = [...existingRecipes, ...savedNewRecipes];

        // Only charge if we actually have recipes to return
        if (allRecipes.length > 0) {
          await usageRef.update({
            recipesRemaining: admin.firestore.FieldValue.increment(-1),
            totalRecipesUsed: admin.firestore.FieldValue.increment(1),
          });
        }
        const uniqueRecipes = [];
        const seenNames = new Set();

        for (const r of allRecipes) {
          if (!seenNames.has(r.name)) {
            seenNames.add(r.name);
            uniqueRecipes.push(r);
          }
        }

        const finalRecipes = uniqueRecipes.slice(0, maxRecipeCount);

        console.log(`Final recipe count: ${finalRecipes.length} ` +
            `(from ${newRecipes.length} generated + ${existingRecipes.length} retrieved)`);

        const payload = {
          status: "completed",
          recipes: finalRecipes,
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Provide helpful feedback based on results
        if (finalRecipes.length === 0 && ingredientCount >= 3) {
          // Had enough ingredients but still got 0 recipes - temporary AI issue
          payload.note = "Recipe generation had a temporary issue. Please try again.";
          payload.noteCode = "generation_retry";
        } else if (ingredientCount <= 3) {
          payload.note =
            "Pantry ingredient count is low, so recipe variety is limited.";
          payload.noteCode = "limited_pantry_low";
        }

        await snap.ref.update(payload);
      } catch (error) {
        console.error("Error processing recipe request:", error);
        await snap.ref.update({
          status: "error",
          error: "Failed to generate recipes",
          details: error.message,
        });
      }
    });

exports.checkIngredients = onRequest({
  cors: true,
  memory: "512MiB",
  timeoutSeconds: 60,
}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed. Use POST."});
    return;
  }

  try {
    const uid = await verifyAuth(req);
    if (!uid) {
      res.status(401).json({error: "Unauthorized. Invalid or missing token."});
      return;
    }

    const {recipeIngredients, pantryItems, language} = req.body;
    const targetLanguage = language || "en";

    console.log("CheckIngredients Request:", {
      ingredientsCount: recipeIngredients ? recipeIngredients.length : 0,
      pantryCount: pantryItems ? pantryItems.length : 0,
      language: targetLanguage,
    });

    if (!recipeIngredients || !pantryItems) {
      console.error("Missing data in request");
      res.status(400).json({error: "Missing ingredients or pantry items"});
      return;
    }

    const prompt = `
      You are a precise kitchen assistant. Your task is to check if the user has the ingredients required for a recipe.

      INPUT DATA:
      1. REQUIRED INGREDIENTS (from recipe):
      ${JSON.stringify(recipeIngredients)}

      2. USER'S PANTRY (available items):
      ${JSON.stringify(pantryItems)}

      3. TARGET LANGUAGE: ${targetLanguage}

      INSTRUCTIONS:
      Step 1: Normalize the "Required Ingredients". Remove quantities, units, and preparation methods (e.g., "2 cups chopped onions" -> "Onion").
      Step 2: For EACH normalized required ingredient, check if a matching item exists in the "User's Pantry".
      
      MATCHING RULES:
      - EXACT MATCH: "Milk" matches "Milk".
      - PARTIAL MATCH: "Diced Tomatoes" matches "Tomato".
      - SYNONYM MATCH: "Cilantro" matches "Coriander".
      - CATEGORY MATCH: If recipe asks for "Cheese" and pantry has "Cheddar", it is a MATCH.
      - IGNORE QUANTITIES: If recipe needs "5 eggs" and pantry has "Eggs", it is a MATCH.

      STAPLES POLICY:
      - Assume the user ALWAYS has: Water, Salt, Black Pepper, Sugar, Vegetable Oil.
      - Do NOT list these as missing.

      OUTPUT REQUIREMENTS:
      - Return a JSON object with two arrays: "available" and "missing".
      - "available": List of ingredients found in the pantry (use the name from the Pantry list if possible, or the Recipe list).
      - "missing": List of ingredients NOT found in the pantry (use the normalized name from the Recipe list).
      - Translate all output ingredient names to ${targetLanguage}.
      - Ensure the output is valid JSON.
    `;

    let result;
    try {
      result = await pantryCheckModel.generateContent(prompt);
    } catch (modelError) {
      console.warn("Gemini 3 Flash failed, falling back to 2.5-flash", modelError);
      const fallbackModel = vertexAI.getGenerativeModel({
        model: "gemini-2.5-flash",
      });
      result = await fallbackModel.generateContent(prompt);
    }

    const response = await result.response;
    let text = "";
    if (response.candidates && response.candidates[0] &&
        response.candidates[0].content &&
        response.candidates[0].content.parts &&
        response.candidates[0].content.parts[0]) {
      text = response.candidates[0].content.parts[0].text || "";
    }

    console.log("AI Response:", text);

    // Robust JSON extraction
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Invalid JSON response from AI:", text);
      throw new Error("No JSON found in response");
    }
    const analysis = JSON.parse(jsonMatch[0]);

    res.json(analysis);
  } catch (error) {
    console.error("Error checking ingredients:", error);
    res.status(500).json({
      error: "Failed to check ingredients",
      details: error.message || "Unknown error",
    });
  }
});

exports.matchPantryToRecipes = onRequest({
  cors: true,
  memory: "1GiB",
  timeoutSeconds: 120,
}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed. Use POST."});
    return;
  }

  try {
    const uid = await verifyAuth(req);
    if (!uid) {
      res.status(401).json({error: "Unauthorized. Invalid or missing token."});
      return;
    }

    const {recipes, pantryItems, language} = req.body;
    const targetLanguage = language || "en";

    if (!recipes || !Array.isArray(recipes) || recipes.length === 0) {
      res.status(400).json({error: "No recipes provided"});
      return;
    }

    if (!pantryItems || !Array.isArray(pantryItems)) {
      res.status(400).json({error: "No pantry items provided"});
      return;
    }

    // Limit batch size to prevent context window overflow
    // If user has 100 recipes, we might need to batch this on the client side
    // or handle it here. For now, let's assume a reasonable number (e.g. < 50).
    // If more, we process the first 50.
    const recipesToProcess = recipes.slice(0, 50);

    const prompt = `
      You are a smart kitchen assistant. I have a list of pantry items and a
      list of recipes. Determine which recipes I can cook RIGHT NOW with what
      I have.

      My Pantry Items:
      ${JSON.stringify(pantryItems)}

      My Recipes:
      ${JSON.stringify(recipesToProcess.map((r) => ({
    id: r.id,
    name: r.name,
    ingredients: r.ingredients,
  })))}

      Target Language: ${targetLanguage}

      Rules:
      1. **Flexible Matching**: "Diced tomatoes" matches "Tomato".
         "Low fat milk" matches "Milk".
      2. **Staples**: Assume I HAVE Salt, Pepper, Water, Oil, Sugar.
         Do not count these as missing.
      3. **Status**:
         - "COOK_NOW": All ingredients are present (or staples).
         - "ALMOST": Missing 1-2 minor ingredients.
         - "SHOPPING": Missing major ingredients or >2 items.
      4. **Output**: Return a JSON object where keys are Recipe IDs and values
         are objects containing:
         - "status": "COOK_NOW" | "ALMOST" | "SHOPPING"
         - "missingIngredients": [List of missing items in ${targetLanguage}]
           (Empty if COOK_NOW)
         - "matchPercentage": 0-100 (Estimate of how many ingredients I have)

      Output JSON ONLY. No markdown.
    `;

    const result = await pantryCheckModel.generateContent(prompt);
    const response = await result.response;
    let text = "";
    if (response.candidates && response.candidates[0] &&
        response.candidates[0].content &&
        response.candidates[0].content.parts &&
        response.candidates[0].content.parts[0]) {
      text = response.candidates[0].content.parts[0].text || "";
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in AI response");
    }

    const analysis = JSON.parse(jsonMatch[0]);
    res.json(analysis);
  } catch (error) {
    console.error("Error matching pantry to recipes:", error);
    res.status(500).json({
      error: "Failed to match recipes",
      details: error.message,
    });
  }
});

exports.generateCustomRecipe = onRequest({
  cors: true,
  timeoutSeconds: 300,
}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed. Use POST."});
    return;
  }

  try {
    const uid = await verifyAuth(req);
    if (!uid) {
      res.status(401).json({error: "Unauthorized. Invalid or missing token."});
      return;
    }

    const db = admin.firestore();

    // Check if user is in a household
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const householdId = userData?.householdId || null;

    // Determine usage reference (household or personal)
    let usageRef;
    if (householdId) {
      usageRef = db.collection("households").doc(householdId)
          .collection("usage").doc("current");
    } else {
      usageRef = db.collection("users").doc(uid)
          .collection("usage").doc("current");
    }

    const usageDoc = await usageRef.get();

    let usageData = usageDoc.exists ? usageDoc.data() : null;

    if (!usageData) {
      usageData = {
        tier: "anonymous",
        scansRemaining: 10,
        recipesRemaining: 10,
        totalScansUsed: 0,
        totalRecipesUsed: 0,
        lastMonthlyBonusDate: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        resetDate: null,
      };
      await usageRef.set(usageData);
    }

    if (usageData.recipesRemaining <= 0) {
      res.status(403).json({error: "No recipes remaining."});
      return;
    }

    const {prompt, language} = req.body;
    if (!prompt) {
      res.status(400).json({error: "No prompt provided"});
      return;
    }

    const targetLanguage = language || "en";
    const langNames = {
      en: "English", es: "Spanish", fr: "French", de: "German",
      it: "Italian", pt: "Portuguese", ru: "Russian", zh: "Chinese",
      ja: "Japanese", ko: "Korean", ar: "Arabic", hi: "Hindi",
      tr: "Turkish", pl: "Polish", nl: "Dutch",
      sl: "Slovenian", hr: "Croatian", sr: "Serbian",
    };
    const targetLanguageName = langNames[targetLanguage] || "English";

    console.log("Generating custom recipe for:", prompt);
    console.log("Target language:", targetLanguageName);

    const systemPrompt = `
You are a world-class professional chef at a "Chef's Table".
The user will ask for a specific dish or give you a culinary idea.
Your goal is to create a PERFECT, custom recipe based on their request.

USER REQUEST: "${prompt}"

TARGET LANGUAGE: ${targetLanguageName} (ALL output must be in this language).

GUIDELINES:
1. IGNORE PANTRY RESTRICTIONS. You have access to every ingredient in the world.
2. Focus on FLAVOR, TECHNIQUE, and PRESENTATION.
3. Be creative but practical.
4. Provide accurate nutrition estimates.

RESPONSE FORMAT (STRICT JSON):
You MUST return a single JSON object matching this exact schema:
{
  "name": "Recipe Name",
  "emoji": "🍲",
  "description": "Appetizing summary",
  "prepTime": "15 min",
  "cookTime": "30 min",
  "servings": "4",
  "difficulty": "Easy/Medium/Hard",
  "cuisine": "Cuisine Type",
  "skillLevel": "Beginner/Intermediate/Advanced",
  "nutrition": {
    "calories": 450,
    "protein": "25g",
    "carbs": "35g",
    "fat": "18g"
  },
  "ingredients": [
    "2 cups Flour",
    "1 tsp Salt",
    "etc..."
  ],
  "instructions": [
    "Step 1: Mix flour and salt...",
    "Step 2: ..."
  ],
  "tips": [
    "Chef's Tip 1...",
    "Substitution idea..."
  ]
}
`;

    const result = await recipeModel.generateContent({
      contents: [{role: "user", parts: [{text: systemPrompt}]}],
      generationConfig: {responseMimeType: "application/json"},
    });

    const response = await result.response;
    let text = "";
    if (response.candidates && response.candidates[0] &&
        response.candidates[0].content &&
        response.candidates[0].content.parts &&
        response.candidates[0].content.parts[0]) {
      text = response.candidates[0].content.parts[0].text || "";
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Decrement quota
      await usageRef.update({
        recipesRemaining: admin.firestore.FieldValue.increment(-1),
        totalRecipesUsed: admin.firestore.FieldValue.increment(1),
      });

      res.status(200).json(parsed);
    } else {
      res.status(500).json({error: "Failed to parse generated recipe"});
    }
  } catch (error) {
    console.error("Error generating custom recipe:", error);
    res.status(500).json({
      error: "Failed to generate custom recipe",
      details: error.message,
    });
  }
});

exports.modifyRecipe = onRequest({
  cors: true,
  timeoutSeconds: 300,
}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed. Use POST."});
    return;
  }

  try {
    const uid = await verifyAuth(req);
    if (!uid) {
      res.status(401).json({error: "Unauthorized. Invalid or missing token."});
      return;
    }

    const db = admin.firestore();

    // Check if user is in a household
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const householdId = userData?.householdId || null;

    // Determine usage reference (household or personal)
    let usageRef;
    if (householdId) {
      usageRef = db.collection("households").doc(householdId)
          .collection("usage").doc("current");
    } else {
      usageRef = db.collection("users").doc(uid)
          .collection("usage").doc("current");
    }

    const usageDoc = await usageRef.get();
    let usageData = usageDoc.exists ? usageDoc.data() : null;

    if (!usageData || usageData.recipesRemaining <= 0) {
      res.status(403).json({error: "No recipes remaining."});
      return;
    }

    const {currentRecipe, modificationRequest, language} = req.body;
    if (!currentRecipe || !modificationRequest) {
      res.status(400).json({error: "Missing recipe or modification request"});
      return;
    }

    const targetLanguage = language || "en";
    const langNames = {
      en: "English", es: "Spanish", fr: "French", de: "German",
      it: "Italian", pt: "Portuguese", ru: "Russian", zh: "Chinese",
      ja: "Japanese", ko: "Korean", ar: "Arabic", hi: "Hindi",
      tr: "Turkish", pl: "Polish", nl: "Dutch",
      sl: "Slovenian", hr: "Croatian", sr: "Serbian",
    };
    const targetLanguageName = langNames[targetLanguage] || "English";

    console.log("Modifying recipe:", currentRecipe.name);
    console.log("Request:", modificationRequest);

    const systemPrompt = `
You are a professional chef. The user wants to MODIFY an existing recipe.

CURRENT RECIPE:
${JSON.stringify(currentRecipe)}

USER MODIFICATION REQUEST:
"${modificationRequest}"

TARGET LANGUAGE: ${targetLanguageName}

INSTRUCTIONS:
1. Apply the user's changes to the recipe.
2. Adjust ingredients, instructions, nutrition, and description accordingly.
3. Keep the rest of the recipe consistent.
4. Ensure the output is still a valid, delicious recipe.

RESPONSE FORMAT (STRICT JSON):
Return the UPDATED recipe object matching the exact same schema:
{
  "name": "Updated Name",
  "emoji": "🍲",
  "description": "Updated summary",
  "prepTime": "...",
  "cookTime": "...",
  "servings": "...",
  "difficulty": "...",
  "cuisine": "...",
  "skillLevel": "...",
  "nutrition": { ... },
  "ingredients": [ ... ],
  "instructions": [ ... ],
  "tips": [ ... ]
}
`;

    const result = await recipeModel.generateContent({
      contents: [{role: "user", parts: [{text: systemPrompt}]}],
      generationConfig: {responseMimeType: "application/json"},
    });

    const response = await result.response;
    let text = "";
    if (response.candidates && response.candidates[0] &&
        response.candidates[0].content &&
        response.candidates[0].content.parts &&
        response.candidates[0].content.parts[0]) {
      text = response.candidates[0].content.parts[0].text || "";
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Decrement quota
      await usageRef.update({
        recipesRemaining: admin.firestore.FieldValue.increment(-1),
        totalRecipesUsed: admin.firestore.FieldValue.increment(1),
      });

      res.status(200).json(parsed);
    } else {
      res.status(500).json({error: "Failed to parse modified recipe"});
    }
  } catch (error) {
    console.error("Error modifying recipe:", error);
    res.status(500).json({
      error: "Failed to modify recipe",
      details: error.message,
    });
  }
});

// ============================================
// HOUSEHOLD MANAGEMENT FUNCTIONS
// ============================================

/**
 * Generate a random invite code for households
 * @return {string} A 6-character alphanumeric code
 */
function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Check premium status for all household members
 * First checks Firestore (user's usage tier), then falls back to RevenueCat API
 * @param {Array} memberIds - Array of user IDs
 * @return {Promise<boolean>} True if any member has premium
 */
async function checkHouseholdPremiumStatus(memberIds) {
  const db = admin.firestore();

  // First, check Firestore for any member with premium tier
  for (const memberId of memberIds) {
    try {
      const usageDoc = await db.collection("users").doc(memberId)
          .collection("usage").doc("current").get();
      if (usageDoc.exists && usageDoc.data().tier === "premium") {
        console.log(`Member ${memberId} has premium tier in Firestore`);
        return true;
      }
    } catch (error) {
      console.error(`Error checking Firestore for member ${memberId}:`, error);
    }
  }

  // Fallback: Check RevenueCat API if configured
  const REVENUECAT_API_KEY = process.env.REVENUECAT_SECRET_KEY;

  if (!REVENUECAT_API_KEY) {
    console.log("RevenueCat API key not configured, using Firestore only");
    return false;
  }

  for (const memberId of memberIds) {
    try {
      const response = await fetch(
          `https://api.revenuecat.com/v1/subscribers/${memberId}`,
          {
            headers: {
              "Authorization": `Bearer ${REVENUECAT_API_KEY}`,
              "Content-Type": "application/json",
            },
          },
      );

      if (response.ok) {
        const data = await response.json();
        const entitlements = data.subscriber?.entitlements || {};
        const activeEntitlements = Object.values(entitlements)
            .filter((e) => e.expires_date === null ||
                new Date(e.expires_date) > new Date());

        if (activeEntitlements.length > 0) {
          console.log(`Member ${memberId} has active premium entitlement`);
          return true;
        }
      }
    } catch (error) {
      console.error(`Error checking premium for member ${memberId}:`, error);
    }
  }
  return false;
}

/**
 * Generate a random 4-digit number for default nickname
 * @return {string} Random 4 digits
 */
function generateRandomDigits() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Get user's nickname, creating a default one if not set
 * @param {string} uid - User ID
 * @return {Promise<string>} User's nickname
 */
async function getUserNickname(uid) {
  const db = admin.firestore();
  const userDoc = await db.collection("users").doc(uid).get();
  const userData = userDoc.exists ? userDoc.data() : {};

  if (userData.nickname) {
    return userData.nickname;
  }

  // Generate default nickname: User + 4 random digits
  const defaultNickname = `User${generateRandomDigits()}`;

  // Save the default nickname to user doc
  await db.collection("users").doc(uid).set({
    nickname: defaultNickname,
  }, {merge: true});

  return defaultNickname;
}

/**
 * Update household premium status and quotas
 * @param {string} householdId - The household ID
 * @param {Array} memberIds - Array of member user IDs
 */
async function updateHouseholdPremiumStatus(householdId, memberIds) {
  const db = admin.firestore();
  const hasPremium = await checkHouseholdPremiumStatus(memberIds);

  const householdRef = db.collection("households").doc(householdId);
  const usageRef = householdRef.collection("usage").doc("current");

  await householdRef.update({hasPremium});

  const tier = hasPremium ? "premium" : "free";
  const quotaLimit = hasPremium ? 500 : 30;

  const usageDoc = await usageRef.get();
  if (usageDoc.exists) {
    const currentUsage = usageDoc.data();
    // Only update if upgrading to premium (don't decrease existing quotas)
    if (hasPremium && currentUsage.tier !== "premium") {
      await usageRef.update({
        tier: "premium",
        scansRemaining: quotaLimit,
        recipesRemaining: quotaLimit,
        resetDate: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else if (!hasPremium && currentUsage.tier === "premium") {
      // Downgrade from premium - set to free tier limits
      await usageRef.update({
        tier: "free",
        scansRemaining: Math.min(currentUsage.scansRemaining, 30),
        recipesRemaining: Math.min(currentUsage.recipesRemaining, 30),
      });
    }
  }
}

exports.createHousehold = onRequest({cors: true}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed. Use POST."});
    return;
  }

  try {
    const uid = await verifyAuth(req);
    if (!uid) {
      res.status(401).json({error: "Unauthorized"});
      return;
    }

    const {householdName} = req.body;
    const db = admin.firestore();

    // Check if user already in a household
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    if (userData.householdId) {
      res.status(400).json({
        error: "Already in a household",
        message: "You must leave your current household before creating a new one.",
      });
      return;
    }

    // Check 7-day cooldown period
    if (userData.lastLeftHouseholdAt) {
      const lastLeft = userData.lastLeftHouseholdAt.toDate();
      const daysSinceLeft = (Date.now() - lastLeft.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLeft < 7) {
        const daysRemaining = Math.ceil(7 - daysSinceLeft);
        res.status(400).json({
          error: "Cooldown period active",
          message: `You must wait ${daysRemaining} more day(s) before creating or joining a household.`,
          daysRemaining,
        });
        return;
      }
    }

    // Generate unique invite code
    let inviteCode;
    let codeExists = true;
    while (codeExists) {
      inviteCode = generateInviteCode();
      const existingHousehold = await db.collection("households")
          .where("inviteCode", "==", inviteCode)
          .limit(1)
          .get();
      codeExists = !existingHousehold.empty;
    }

    // Get user's nickname for member tracking
    const nickname = await getUserNickname(uid);

    // Create household
    const householdRef = await db.collection("households").add({
      name: householdName || `${nickname}'s Household`,
      createdBy: uid,
      memberIds: [uid],
      members: [{
        id: uid,
        name: nickname,
        joinedAt: new Date().toISOString(),
      }],
      inviteCode,
      hasPremium: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const householdId = householdRef.id;

    // Move user's pantry items to household
    const userPantryRef = db.collection("users").doc(uid).collection("pantry");
    const pantrySnapshot = await userPantryRef.get();

    const batch = db.batch();
    const householdPantryRef = db.collection("households")
        .doc(householdId).collection("pantry");

    pantrySnapshot.forEach((doc) => {
      const itemData = doc.data();
      const newItemRef = householdPantryRef.doc(doc.id);
      batch.set(newItemRef, {
        ...itemData,
        addedBy: uid,
        addedByName: nickname,
        movedToHousehold: admin.firestore.FieldValue.serverTimestamp(),
      });
      // Delete from personal pantry
      batch.delete(doc.ref);
    });

    // Archive user's personal credits before joining household
    const userUsageRef = db.collection("users").doc(uid)
        .collection("usage").doc("current");
    const userUsageDoc = await userUsageRef.get();
    const userUsage = userUsageDoc.exists ? userUsageDoc.data() : null;

    // Update user document with householdId and archive credits
    const userUpdate = {
      householdId,
    };
    if (userUsage) {
      userUpdate.archivedScansRemaining = userUsage.scansRemaining || 0;
      userUpdate.archivedRecipesRemaining = userUsage.recipesRemaining || 0;
      userUpdate.archivedTier = userUsage.tier || "free";
    }
    // Use set with merge to create user doc if it doesn't exist
    batch.set(db.collection("users").doc(uid), userUpdate, {merge: true});

    // Create household usage document with fresh 30/30 (free) or 500/500 (premium)
    const householdUsageRef = db.collection("households")
        .doc(householdId).collection("usage").doc("current");

    // Check if creator has premium
    const hasPremium = userUsage?.tier === "premium";
    const quotaLimit = hasPremium ? 500 : 30;

    const initialUsage = {
      tier: hasPremium ? "premium" : "free",
      scansRemaining: quotaLimit,
      recipesRemaining: quotaLimit,
      totalScansUsed: 0,
      totalRecipesUsed: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      resetDate: null,
    };

    batch.set(householdUsageRef, initialUsage);

    await batch.commit();

    // Check premium status for the household
    await updateHouseholdPremiumStatus(householdId, [uid]);

    res.status(200).json({
      success: true,
      householdId,
      inviteCode,
      message: "Household created successfully",
      itemsMoved: pantrySnapshot.size,
    });
  } catch (error) {
    console.error("Error creating household:", error);
    res.status(500).json({error: "Internal server error", details: error.message});
  }
});

exports.joinHousehold = onRequest({cors: true}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed. Use POST."});
    return;
  }

  try {
    const uid = await verifyAuth(req);
    if (!uid) {
      res.status(401).json({error: "Unauthorized"});
      return;
    }

    const {inviteCode} = req.body;
    if (!inviteCode) {
      res.status(400).json({error: "Missing invite code"});
      return;
    }

    const db = admin.firestore();

    // Check if user already in a household
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    if (userData.householdId) {
      res.status(400).json({
        error: "Already in a household",
        message: "You must leave your current household before joining another.",
      });
      return;
    }

    // Check 7-day cooldown period
    if (userData.lastLeftHouseholdAt) {
      const lastLeft = userData.lastLeftHouseholdAt.toDate();
      const daysSinceLeft = (Date.now() - lastLeft.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLeft < 7) {
        const daysRemaining = Math.ceil(7 - daysSinceLeft);
        res.status(400).json({
          error: "Cooldown period active",
          message: `You must wait ${daysRemaining} more day(s) before creating or joining a household.`,
          daysRemaining,
        });
        return;
      }
    }

    // Find household by invite code
    const householdQuery = await db.collection("households")
        .where("inviteCode", "==", inviteCode.toUpperCase())
        .limit(1)
        .get();

    if (householdQuery.empty) {
      res.status(404).json({error: "Invalid invite code"});
      return;
    }

    const householdDoc = householdQuery.docs[0];
    const householdId = householdDoc.id;
    const householdData = householdDoc.data();

    // Check member limit (10 max)
    if (householdData.memberIds.length >= 10) {
      res.status(400).json({
        error: "Household full",
        message: "This household has reached the maximum of 10 members.",
      });
      return;
    }

    // Get user's nickname
    const nickname = await getUserNickname(uid);

    // Get user's current usage to archive
    const userUsageRef = db.collection("users").doc(uid)
        .collection("usage").doc("current");
    const userUsageDoc = await userUsageRef.get();
    const userUsage = userUsageDoc.exists ? userUsageDoc.data() : null;

    const batch = db.batch();

    // Delete user's personal pantry items (they're joining a shared pantry)
    const userPantryRef = db.collection("users").doc(uid).collection("pantry");
    const pantrySnapshot = await userPantryRef.get();
    pantrySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Add user to household
    batch.update(householdDoc.ref, {
      memberIds: admin.firestore.FieldValue.arrayUnion(uid),
      members: admin.firestore.FieldValue.arrayUnion({
        id: uid,
        name: nickname,
        joinedAt: new Date().toISOString(),
      }),
    });

    // Update user document with householdId and archive credits
    const userUpdate = {
      householdId,
    };
    if (userUsage) {
      userUpdate.archivedScansRemaining = userUsage.scansRemaining || 0;
      userUpdate.archivedRecipesRemaining = userUsage.recipesRemaining || 0;
      userUpdate.archivedTier = userUsage.tier || "free";
    }
    // Use set with merge to create user doc if it doesn't exist
    batch.set(db.collection("users").doc(uid), userUpdate, {merge: true});

    await batch.commit();

    // If joining user is premium, directly upgrade household to premium
    if (userUsage && userUsage.tier === "premium") {
      const householdUsageRef = db.collection("households")
          .doc(householdId).collection("usage").doc("current");
      await householdUsageRef.set({
        tier: "premium",
        scansRemaining: 500,
        recipesRemaining: 500,
        resetDate: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
      await db.collection("households").doc(householdId).update({
        hasPremium: true,
      });
      console.log(`✅ Premium user joined - upgraded household ${householdId}`);
    } else {
      // Check premium status for all members (in case another member is premium)
      const updatedMemberIds = [...householdData.memberIds, uid];
      await updateHouseholdPremiumStatus(householdId, updatedMemberIds);
    }

    res.status(200).json({
      success: true,
      householdId,
      householdName: householdData.name,
      message: "Successfully joined household",
      itemsDeleted: pantrySnapshot.size,
    });
  } catch (error) {
    console.error("Error joining household:", error);
    res.status(500).json({error: "Internal server error", details: error.message});
  }
});

exports.leaveHousehold = onRequest({cors: true}, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed. Use POST."});
    return;
  }

  try {
    const uid = await verifyAuth(req);
    if (!uid) {
      res.status(401).json({error: "Unauthorized"});
      return;
    }

    const db = admin.firestore();

    // Get user's household
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    if (!userData.householdId) {
      res.status(400).json({
        error: "Not in a household",
        message: "You are not currently in a household.",
      });
      return;
    }

    const householdId = userData.householdId;
    const householdRef = db.collection("households").doc(householdId);
    const householdDoc = await householdRef.get();

    if (!householdDoc.exists) {
      // Household doesn't exist, just clean up user
      await db.collection("users").doc(uid).update({
        householdId: admin.firestore.FieldValue.delete(),
      });
      res.status(200).json({success: true, message: "Left household"});
      return;
    }

    const householdData = householdDoc.data();
    const remainingMembers = householdData.memberIds.filter((id) => id !== uid);

    const batch = db.batch();

    if (remainingMembers.length === 0) {
      // Last member leaving - delete household and all its data
      const householdPantryRef = householdRef.collection("pantry");
      const pantrySnapshot = await householdPantryRef.get();
      pantrySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      const usageRef = householdRef.collection("usage").doc("current");
      batch.delete(usageRef);
      batch.delete(householdRef);
    } else {
      // Remove user from household
      const updatedMembers = (householdData.members || [])
          .filter((m) => m.id !== uid);

      batch.update(householdRef, {
        memberIds: remainingMembers,
        members: updatedMembers,
      });
    }

    // Remove householdId from user and set cooldown timestamp
    // Also restore archived credits if available
    const userUpdateData = {
      householdId: admin.firestore.FieldValue.delete(),
      lastLeftHouseholdAt: admin.firestore.FieldValue.serverTimestamp(),
      // Clean up archived fields after restoring
      archivedScansRemaining: admin.firestore.FieldValue.delete(),
      archivedRecipesRemaining: admin.firestore.FieldValue.delete(),
      archivedTier: admin.firestore.FieldValue.delete(),
    };
    batch.update(db.collection("users").doc(uid), userUpdateData);

    // Restore user's personal usage from archived credits or create new
    const userUsageRef = db.collection("users").doc(uid)
        .collection("usage").doc("current");
    
    // Determine credits to restore
    const archivedScans = userData.archivedScansRemaining;
    const archivedRecipes = userData.archivedRecipesRemaining;
    const archivedTier = userData.archivedTier || "free";
    
    // If user had archived credits, restore them; otherwise give fresh 30/30
    const scansToRestore = (archivedScans !== undefined && archivedScans !== null) 
        ? archivedScans : 30;
    const recipesToRestore = (archivedRecipes !== undefined && archivedRecipes !== null) 
        ? archivedRecipes : 30;
    
    batch.set(userUsageRef, {
      tier: archivedTier,
      scansRemaining: scansToRestore,
      recipesRemaining: recipesToRestore,
      totalScansUsed: 0,
      totalRecipesUsed: 0,
      lastMonthlyBonusDate: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      resetDate: null,
      restoredFromHousehold: true,
    });

    await batch.commit();

    // Update premium status for remaining members
    if (remainingMembers.length > 0) {
      await updateHouseholdPremiumStatus(householdId, remainingMembers);
    }

    res.status(200).json({
      success: true,
      message: remainingMembers.length === 0 ?
          "Left and deleted household" : "Left household",
      householdDeleted: remainingMembers.length === 0,
    });
  } catch (error) {
    console.error("Error leaving household:", error);
    res.status(500).json({error: "Internal server error", details: error.message});
  }
});

exports.getHouseholdInfo = onRequest({cors: true}, async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({error: "Method not allowed. Use GET."});
    return;
  }

  try {
    const uid = await verifyAuth(req);
    if (!uid) {
      res.status(401).json({error: "Unauthorized"});
      return;
    }

    const db = admin.firestore();

    // Get user's household
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    if (!userData.householdId) {
      res.status(200).json({inHousehold: false});
      return;
    }

    const householdId = userData.householdId;
    const householdDoc = await db.collection("households")
        .doc(householdId).get();

    if (!householdDoc.exists) {
      // Clean up stale reference
      await db.collection("users").doc(uid).update({
        householdId: admin.firestore.FieldValue.delete(),
      });
      res.status(200).json({inHousehold: false});
      return;
    }

    const householdData = householdDoc.data();

    // Get usage data
    const usageDoc = await db.collection("households")
        .doc(householdId).collection("usage").doc("current").get();
    const usageData = usageDoc.exists ? usageDoc.data() : null;

    res.status(200).json({
      inHousehold: true,
      householdId,
      name: householdData.name,
      inviteCode: householdData.inviteCode,
      members: householdData.members || [],
      memberCount: householdData.memberIds.length,
      hasPremium: householdData.hasPremium || false,
      usage: usageData,
      createdAt: householdData.createdAt,
    });
  } catch (error) {
    console.error("Error getting household info:", error);
    res.status(500).json({error: "Internal server error", details: error.message});
  }
});

/**
 * Update user nickname
 * Also updates the name in household members array if user is in a household
 */
exports.updateNickname = onRequest({
  cors: true,
  region: "us-central1",
}, async (req, res) => {
  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({error: "Unauthorized"});
      return;
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const {nickname} = req.body;

    // Validate nickname
    if (!nickname || typeof nickname !== "string") {
      res.status(400).json({error: "Nickname is required"});
      return;
    }

    const trimmedNickname = nickname.trim();

    if (trimmedNickname.length === 0) {
      res.status(400).json({error: "Nickname cannot be empty"});
      return;
    }

    if (trimmedNickname.length > 20) {
      res.status(400).json({error: "Nickname must be 20 characters or less"});
      return;
    }

    const db = admin.firestore();

    // Update user document with new nickname
    await db.collection("users").doc(uid).set({
      nickname: trimmedNickname,
    }, {merge: true});

    // Check if user is in a household
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.data();

    if (userData.householdId) {
      // Update the member name in the household members array
      const householdRef = db.collection("households").doc(userData.householdId);
      const householdDoc = await householdRef.get();

      if (householdDoc.exists) {
        const householdData = householdDoc.data();
        const updatedMembers = (householdData.members || []).map((member) => {
          if (member.id === uid) {
            return {...member, name: trimmedNickname};
          }
          return member;
        });

        await householdRef.update({members: updatedMembers});
      }
    }

    res.status(200).json({
      success: true,
      nickname: trimmedNickname,
    });
  } catch (error) {
    console.error("Error updating nickname:", error);
    res.status(500).json({error: "Internal server error", details: error.message});
  }
});

/**
 * Delete User Account
 * Deletes all user data from Firestore and the Firebase Auth account
 */
exports.deleteAccount = onRequest({
  cors: true,
  memory: "512MiB",
  timeoutSeconds: 60,
}, async (req, res) => {
  if (req.method !== "POST" && req.method !== "DELETE") {
    res.status(405).json({error: "Method not allowed. Use POST or DELETE."});
    return;
  }

  try {
    const uid = await verifyAuth(req);
    if (!uid) {
      res.status(401).json({error: "Unauthorized. Invalid or missing token."});
      return;
    }

    const db = admin.firestore();
    const batch = db.batch();

    console.log(`Starting account deletion for user: ${uid}`);

    // 1. Get user document to check for household membership
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const householdId = userData?.householdId;

    // 2. Handle household membership
    if (householdId) {
      const householdRef = db.collection("households").doc(householdId);
      const householdDoc = await householdRef.get();

      if (householdDoc.exists) {
        const householdData = householdDoc.data();
        const isOwner = householdData.ownerId === uid;

        if (isOwner) {
          // Owner is deleting account - delete entire household
          console.log(`User is household owner. Deleting household: ${householdId}`);

          // Delete household subcollections
          const subcollections = ["pantry", "shoppingList", "savedRecipes", "usage"];
          for (const subcol of subcollections) {
            const subcollectionRef = householdRef.collection(subcol);
            const subcollectionDocs = await subcollectionRef.listDocuments();
            for (const docRef of subcollectionDocs) {
              batch.delete(docRef);
            }
          }

          // Remove householdId from other members
          const members = householdData.members || [];
          for (const member of members) {
            if (member.id !== uid) {
              batch.update(db.collection("users").doc(member.id), {
                householdId: admin.firestore.FieldValue.delete(),
              });
            }
          }

          // Delete household document
          batch.delete(householdRef);
        } else {
          // Member is deleting account - just remove from household
          console.log(`User is household member. Removing from household: ${householdId}`);
          const updatedMembers = (householdData.members || [])
              .filter((m) => m.id !== uid);
          batch.update(householdRef, {members: updatedMembers});
        }
      }
    }

    // 3. Delete user's personal subcollections
    const userRef = db.collection("users").doc(uid);
    const userSubcollections = ["pantry", "shoppingList", "savedRecipes", "usage", "legalConsent"];

    for (const subcol of userSubcollections) {
      const subcollectionRef = userRef.collection(subcol);
      const subcollectionDocs = await subcollectionRef.listDocuments();
      for (const docRef of subcollectionDocs) {
        batch.delete(docRef);
      }
    }

    // 4. Delete user document
    batch.delete(userRef);

    // 5. Commit all Firestore deletions
    await batch.commit();
    console.log(`Firestore data deleted for user: ${uid}`);

    // 6. Delete Firebase Auth account
    await admin.auth().deleteUser(uid);
    console.log(`Firebase Auth account deleted for user: ${uid}`);

    res.status(200).json({
      success: true,
      message: "Account and all associated data have been permanently deleted.",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({
      error: "Failed to delete account",
      details: error.message,
    });
  }
});


