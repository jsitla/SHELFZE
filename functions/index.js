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

// Model for Camera/Image Analysis (Keep as requested)
const cameraModel = vertexAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
});

// Model for Recipe Generation
// User requested Gemini 2.5; use flash variant for richer outputs.
const recipeModel = vertexAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

// Model for Fast Filtering (Retrieval)
const filterModel = vertexAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
});

// Model specifically for Pantry Check (Using 2.0 as requested)
const pantryCheckModel = vertexAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
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
    const usageRef = db.collection("users").doc(uid)
        .collection("usage").doc("current");
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
      }));
      console.log("Using Gemini detection for", foodItems.length, "items");
    } else if (geminiResult && geminiResult.productName) {
      foodItems = [{
        name: geminiResult.productName,
        category: normalizeCategory(geminiResult.category || "Other"),
        confidence: geminiResult.confidence || 0.70,
        source: "Gemini AI",
        details: geminiResult.details || "",
      }];
      console.log("Using Gemini detection (single item):", foodItems[0].name);
    } else {
      const singleItem = categorizeFoodItem(allDetections, fullText);
      foodItems = [singleItem];
      console.log("Using Vision API detection:", singleItem.name);
    }

    const expiryDate = findExpiryDate(fullText);
    const formattedDate = expiryDate ? formatDate(expiryDate) : null;

    const savedItems = [];
    for (const foodItem of foodItems) {
      if (foodItem.name && foodItem.name !== "Unknown Item") {
        const docRef = await admin.firestore()
            .collection("users")
            .doc(userId)
            .collection("pantry")
            .add({
              name: foodItem.name,
              itemName: foodItem.name,
              category: foodItem.category,
              confidence: foodItem.confidence,
              detectionSource: foodItem.source || "Vision API",
              geminiDetails: foodItem.details || null,
              detectedLabels: detectedLabels.slice(0, 5),
              detectedObjects: detectedObjects.slice(0, 5),
              expiryDate: formattedDate || null,
              quantity: 1,
              unit: "pcs",
              fullText: fullText.substring(0, 500),
              addedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        savedItems.push({
          id: docRef.id,
          ...foodItem,
        });
      }
    }

    if (savedItems.length > 0) {
      await usageRef.update({
        scansRemaining: admin.firestore.FieldValue.increment(-1),
        totalScansUsed: admin.firestore.FieldValue.increment(1),
      });
    }

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
      expiryDate: formattedDate,
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
    console.log("Model: Gemini 2.0 Flash");
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
   - **NEVER use generic names** like "Spices", "Seasoning", "Herbs",
     "Condiment".
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
    const usageRef = db.collection("users").doc(uid)
        .collection("usage").doc("current");
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
      appetizer: "Appetizer / Starter",
      dessert: "Dessert / Sweet Dish",
      breakfast: "Breakfast / Brunch",
      soupSalad: "Soup, Stew, or Salad",
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
5. If the requested DISH TYPE is Soup/Salad, **DO NOT** generate pasta ` +
`dishes (unless pasta salad), rice dishes (unless rice soup), or solid ` +
`main courses.
6. Recipes must be delicious, tested, and achievable.
6. Provide accurate nutrition estimates per serving.

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
You are a smart recipe filter.
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

Task: Select up to 3 recipes from the candidates that can be made PRIMARILY ` +
`using the User Ingredients AND match the Requested Dish Type AND ` +
`respect User Guidance.
RULES:
1. It is acceptable if 1-2 minor common ingredients (like spices, garlic, ` +
`onion) are missing.
2. **REJECT** any recipe that requires a main ingredient (meat, fish, ` +
`poultry, main vegetable) that is NOT in the User Ingredients.
3. **REJECT** any recipe that does NOT match the Requested Dish Type ` +
`(e.g. if Dessert is requested, reject savory dishes; if Soup/Salad is ` +
`requested, reject solid main courses like spaghetti, steak, or curry).
4. **REJECT** any recipe that conflicts with User Guidance ` +
`(e.g. dietary restrictions, unwanted ingredients).
Return JSON: {"selectedIds": [0, 2]}
If none fit well, return {"selectedIds": []}
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

    await usageRef.update({
      recipesRemaining: admin.firestore.FieldValue.increment(-1),
      totalRecipesUsed: admin.firestore.FieldValue.increment(1),
    });

    // Combine and Deduplicate (using savedNewRecipes which have IDs)
    const allRecipes = [...existingRecipes, ...savedNewRecipes];
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
            newTier === "free" ? 30 : 1000,
        recipesRemaining: newTier === "anonymous" ? 10 :
            newTier === "free" ? 30 : 1000,
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

    if (newTier === "free") {
      updates.scansRemaining = 30;
      updates.recipesRemaining = 30;
      updates.lastMonthlyBonusDate =
          admin.firestore.FieldValue.serverTimestamp();
    } else if (newTier === "premium") {
      updates.scansRemaining = 1000;
      updates.recipesRemaining = 1000;
      updates.resetDate = admin.firestore.FieldValue.serverTimestamp();
    }

    await usageRef.update(updates);
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
      updates.scansRemaining = 1000;
      updates.recipesRemaining = 1000;
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

    if (usage.tier !== "free") {
      res.status(200).json({
        bonusApplied: false,
        message: "Not a free tier user",
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
        const usageRef = db.collection("users").doc(userId)
            .collection("usage").doc("current");
        
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
          appetizer: "Appetizer / Starter",
          dessert: "Dessert / Sweet Dish",
          breakfast: "Breakfast / Brunch",
          soupSalad: "Soup, Stew, or Salad",
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
          if (ingredientCount <= 2) maxRecipeCount = 0;
          else if (ingredientCount === 3) maxRecipeCount = 3;
          else if (ingredientCount <= 5) maxRecipeCount = 4;
        }

        if (maxRecipeCount === 0) {
          await snap.ref.update({
            status: "completed",
            recipes: [],
            note: "Not enough ingredients available to confidently suggest " +
              "recipes. Add more pantry items and try again.",
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
        const generateNewTask = async () => {
          const genCount = Math.min(maxRecipeCount, 3);
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
5. If the requested DISH TYPE is Soup/Salad, **DO NOT** generate pasta ` +
`dishes (unless pasta salad), rice dishes (unless rice soup), or solid ` +
`main courses.
6. Recipes must be delicious, tested, and achievable.
6. Provide accurate nutrition estimates per serving.

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
            // Extract JSON from potential Markdown code blocks
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : text;
            const parsed = JSON.parse(jsonString);
            return Array.isArray(parsed.recipes) ? parsed.recipes : [];
          } catch (e) {
            console.error("Failed to parse generated recipes:", e);
            console.error("Raw text was:", text);
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
You are a smart recipe filter.
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

Task: Select up to 3 recipes from the candidates that can be made PRIMARILY ` +
`using the User Ingredients AND match the Requested Dish Type AND ` +
`respect User Guidance.
RULES:
1. It is acceptable if 1-2 minor common ingredients (like spices, garlic, ` +
`onion) are missing.
2. **REJECT** any recipe that requires a main ingredient (meat, fish, ` +
`poultry, main vegetable) that is NOT in the User Ingredients.
3. **REJECT** any recipe that does NOT match the Requested Dish Type ` +
`(e.g. if Dessert is requested, reject savory dishes; if Soup/Salad is ` +
`requested, reject solid main courses like spaghetti, steak, or curry).
4. **REJECT** any recipe that conflicts with User Guidance ` +
`(e.g. dietary restrictions, unwanted ingredients).
Return JSON: {"selectedIds": [0, 2]}
If none fit well, return {"selectedIds": []}
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
            // Fallback: If AI filtering fails, return top 3 rated candidates
            // This ensures we don't return empty if we found matches in DB
            if (snapshot && !snapshot.empty) {
              console.log("Falling back to top 3 rated recipes due to error.");
              const candidates = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }));
              return candidates.slice(0, 3);
            }
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

        await usageRef.update({
          recipesRemaining: admin.firestore.FieldValue.increment(-1),
          totalRecipesUsed: admin.firestore.FieldValue.increment(1),
        });

        const allRecipes = [...existingRecipes, ...savedNewRecipes];
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
          status: "completed",
          recipes: finalRecipes,
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (ingredientCount <= 3) {
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
      You are a smart kitchen assistant. Compare the required recipe ingredients
      against the user's pantry items.
      
      Recipe Ingredients:
      ${JSON.stringify(recipeIngredients)}
      
      Pantry Items:
      ${JSON.stringify(pantryItems)}
      
      Target Language: ${targetLanguage}
      
      Rules:
      1. Identify which recipe ingredients are MISSING from the pantry.
      2. Be smart about synonyms (e.g., "EVOO" matches "Olive Oil").
      3. Ignore quantities (e.g., "2 onions" vs "Onion" is a MATCH).
      4. SIMPLIFY INGREDIENT NAMES:
         - Remove "to taste", quantities, and preparation methods.
         - Example: "Salt to taste" -> "Salt".
         - Example: "2 cups of flour" -> "Flour".
      5. IGNORE BASIC STAPLES:
         - Do NOT list basic ingredients as "missing".
         - Exclude: Salt, Sugar, Water, Oil, Pepper.
         - Assume the user always has these.
      6. Return a JSON object with two arrays:
         - "missing": items that need to be bought (excluding staples).
         - "available": items found in the pantry.
      7. FORMATTING RULES (CRITICAL):
         - All output text MUST be in the Target Language (${targetLanguage}).
         - Clean up all ingredient names to be human-readable and pretty.
         - Use Title Case for every item (e.g., "Olive Oil").
         - Fix any spelling errors.
         - Ensure proper spacing between words.
         - Remove technical jargon or excessive punctuation.
      8. Output ONLY valid JSON. No markdown formatting.
    `;

    let result;
    try {
      result = await pantryCheckModel.generateContent(prompt);
    } catch (modelError) {
      console.warn("Gemini 2.0 failed, falling back to 1.5-flash", modelError);
      const fallbackModel = vertexAI.getGenerativeModel({
        model: "gemini-1.5-flash",
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
