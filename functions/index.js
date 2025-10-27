// PHASE 2 & 3: Cloud Function for Vision API + Gemini AI Integration

// 1. Initialize Firebase Functions, Google Cloud Vision, and Gemini AI
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const vision = require("@google-cloud/vision");
const {VertexAI} = require("@google-cloud/vertexai");

// Initialize Firebase Admin
admin.initializeApp();

// Create Vision API client
const client = new vision.ImageAnnotatorClient();

// Initialize Gemini AI
const vertexAI = new VertexAI({
  project: "pantryai-3d396",
  location: "us-central1",
});

// Use gemini-2.0-flash-001 (latest stable model)
const generativeModel = vertexAI.getGenerativeModel({
  model: "gemini-2.0-flash-001",
});

// 2. Create and export an HTTPS callable function named 'analyzeImage'.
exports.analyzeImage = functions.https.onRequest(async (req, res) => {
  // 3. Add CORS handling to allow requests from your app.
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Max-Age", "3600");
    res.status(204).send("");
    return;
  }

  // 4. Inside the function, check if the request method is POST. If not, send an error.
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed. Use POST."});
    return;
  }

  try {
    // 5. Get the base64 image data from the request body.
    const imageData = req.body.image;
    const targetLanguage = req.body.language || "en"; // Get language from request
    const userId = req.body.userId; // Get userId from request

    if (!imageData) {
      res.status(400).json({error: "No image data provided"});
      return;
    }

    if (!userId) {
      res.status(400).json({error: "No userId provided. User must be authenticated."});
      return;
    }

    // 6. Improved Vision API request for better sensitivity
    const request = {
      image: {content: imageData},
      features: [
        {type: "TEXT_DETECTION"},
        {type: "LABEL_DETECTION", maxResults: 30}, // 3x boost
        {type: "OBJECT_LOCALIZATION"},
        {type: "WEB_DETECTION"}, // Product ID
        {type: "CROP_HINTS", maxResults: 1}, // Focus area
      ],
    };

    // 7. Call the Vision API with the request.
    const [result] = await client.annotateImage(request);

    const textAnnotations = result.textAnnotations || [];
    const labelAnnotations = result.labelAnnotations || [];
    const objects = result.localizedObjectAnnotations || [];

    // 8. Process the result:
    const fullText = textAnnotations.length > 0 ? textAnnotations[0].description : "";

    // PRIORITY 1: Try Gemini AI first (most intelligent)
    let geminiResult = null;
    try {
      console.log("Attempting Gemini AI analysis...");
      geminiResult = await analyzeWithGemini(imageData, targetLanguage);
      console.log("Gemini analysis result:", geminiResult);
    } catch (error) {
      console.error("Gemini failed, falling back to Vision API:");
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    // Combine labels (AI content understanding) and objects (physical detection)
    // Labels are more accurate for food content, objects for containers
    const detectedLabels = labelAnnotations.map((label) => ({
      name: label.description,
      confidence: label.score,
      source: "label", // AI understanding
    }));

    const detectedObjects = objects.map((obj) => ({
      name: obj.name,
      confidence: obj.score,
      source: "object", // Physical object
    }));

    // Combine labels and objects
    const allDetections = [...detectedLabels, ...detectedObjects];

    // Helper function to normalize categories from Gemini (lowercase) to app format (Title Case)
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

    // PRIORITY DETECTION: Gemini AI > OCR Text > Vision API
    let foodItems = [];
    if (geminiResult && geminiResult.items && geminiResult.items.length > 0) {
      // Use Gemini's intelligent analysis (detects multiple items)
      foodItems = geminiResult.items.map((item) => ({
        name: item.productName,
        category: normalizeCategory(item.category || "Other"),
        confidence: item.confidence || 0.70, // Lowered for sensitivity
        source: "Gemini AI",
        details: item.details || "",
      }));
      console.log("Using Gemini detection for", foodItems.length, "items");
    } else if (geminiResult && geminiResult.productName) {
      // Old format - single item
      foodItems = [{
        name: geminiResult.productName,
        category: normalizeCategory(geminiResult.category || "Other"),
        confidence: geminiResult.confidence || 0.70,
        source: "Gemini AI",
        details: geminiResult.details || "",
      }];
      console.log("Using Gemini detection (single item):", foodItems[0].name);
    } else {
      // Fallback to existing OCR + Vision API logic
      const singleItem = categorizeFoodItem(allDetections, fullText);
      foodItems = [singleItem];
      console.log("Using Vision API detection:", singleItem.name);
    }

    // PHASE 3: Find expiry date in the text (optional)
    const expiryDate = findExpiryDate(fullText);
    const formattedDate = expiryDate ? formatDate(expiryDate) : null;

    // Save all detected food items to Firestore
    const savedItems = [];
    for (const foodItem of foodItems) {
      if (foodItem.name && foodItem.name !== "Unknown Item") {
        // 5. Save to Firestore with enhanced data in user-specific collection
        const docRef = await admin.firestore()
            .collection("users")
            .doc(userId)
            .collection("pantry")
            .add({
              name: foodItem.name, // Updated to 'name' for consistency
              itemName: foodItem.name, // Keep for backward compatibility
              category: foodItem.category,
              confidence: foodItem.confidence,
              detectionSource: foodItem.source || "Vision API",
              geminiDetails: foodItem.details || null,
              detectedLabels: detectedLabels.slice(0, 5), // Top 5 AI labels
              detectedObjects: detectedObjects.slice(0, 5), // Top 5 objects
              expiryDate: formattedDate || null, // Optional expiry date
              quantity: 1, // Default quantity
              unit: "pcs", // Default unit
              fullText: fullText.substring(0, 500),
              addedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        savedItems.push({
          id: docRef.id,
          ...foodItem,
        });
      }
    }

    // 9. Send the processed data back as a JSON response.
    res.status(200).json({
      fullText: fullText,
      foodItems: foodItems, // Array of all detected items
      totalItems: foodItems.length,
      savedItems: savedItems, // Array of saved items with IDs
      detectionSource: foodItems.length > 0 ? foodItems[0].source : "Vision API",
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

// Gemini AI Analysis Function
/**
 * Analyzes image using Google Gemini AI for intelligent food recognition
 * @param {string} base64Image - Base64 encoded image
 * @return {Object} Intelligent analysis with specific product details
 */
async function analyzeWithGemini(base64Image, targetLang = "en") {
  try {
    console.log("=== GEMINI ANALYSIS START ===");
    console.log("Image data length:", base64Image ? base64Image.length : 0);
    console.log("Target language:", targetLang);

    // Language names
    const langNames = {
      en: "English", es: "Spanish", fr: "French", de: "German",
      it: "Italian", pt: "Portuguese", ru: "Russian", zh: "Chinese",
      ja: "Japanese", ko: "Korean", ar: "Arabic", hi: "Hindi",
      tr: "Turkish", pl: "Polish", nl: "Dutch",
      sl: "Slovenian", hr: "Croatian", sr: "Serbian",
    };

    const targetLanguageName = langNames[targetLang] || "English";
    
    const prompt = `You are a food recognition expert specializing in 
precise ingredient identification. Analyze this image carefully.

CRITICAL GUIDELINES - FOOD AND INGREDIENTS:
1. **DETECT FOOD ITEMS AND FOOD INGREDIENTS** - Focus on edible products
2. INCLUDE packaged/bottled food (e.g., "Orange Juice in Bottle")
3. If UNSURE but possibly food, include it with lower confidence
4. Only return empty if CLEARLY no food items visible
5. Be PERMISSIVE - when in doubt, include the item

6. Detect MULTIPLE food items if present in the image
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
   - Check if it's POWDER/GROUND, WHOLE, or FRESH
   - Look at packaging text for clues (e.g., "powder", "ground", "whole")
   - Note the texture and appearance
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
      "category": "dairy|meat|fruit|vegetable|beverage|packaged|spices|condiments|bakery",
      "form": "fresh|dried|ground|powder|whole|minced|frozen|canned|bottled",
      "confidence": 0.9
    }
  ],
  "totalItems": 1
}

Remember: If the image contains NO food items, return {"items": [], "totalItems": 0}`;

    const result = await generativeModel.generateContent({
      contents: [{
        role: "user",
        parts: [
          {text: prompt},
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
        ],
      }],
    });

    console.log("Gemini generateContent completed");
    const response = await result.response;
    console.log("Gemini response object:", JSON.stringify(response, null, 2));
    
    // Extract text from Gemini 2.0 response structure
    let responseText = "";
    if (response.candidates && response.candidates[0] && 
        response.candidates[0].content && response.candidates[0].content.parts &&
        response.candidates[0].content.parts[0]) {
      responseText = response.candidates[0].content.parts[0].text || "";
    }
    console.log("Gemini raw response text:", responseText);
    
    // Extract JSON from response (Gemini might wrap it in markdown)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log("Gemini parsed result:", parsed);
      return parsed;
    }
    console.log("No JSON found in Gemini response, full text was:", responseText);
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

// Food categorization function
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

  // Non-food items to COMPLETELY IGNORE
  const nonFoodItems = ["bottle", "jar", "package", "packaged goods",
    "container", "box", "can", "carton", "plastic", "glass", "metal",
    "paper", "cardboard", "bag", "wrapper", "label", "cap", "lid",
    "utensil", "dish", "plate", "bowl", "cup", "furniture", "table",
    "counter", "shelf", "hand", "person", "clothing", "phone", "camera"];

  let itemName = "Unknown Item";
  let category = "Other";
  let confidence = 0;

  // PRIORITY 1: Check OCR text first for specific products (most accurate)
  if (fullText) {
    const lines = fullText.split("\n").map((line) => line.trim());
    const fullTextLower = fullText.toLowerCase();

    // Keywords that indicate milk in various languages
    const milkKeywords = ["milk", "mleko", "mleczny", "lait", "leche",
      "latte", "milch"];

    // Check if text contains milk keywords
    if (milkKeywords.some((keyword) => fullTextLower.includes(keyword))) {
      // Check for specific milk types
      if (fullTextLower.includes("sheep") || fullTextLower.includes("ovce") ||
          fullTextLower.includes("овче")) {
        itemName = "Sheep Milk";
        category = "Dairy";
        confidence = 0.9;
      } else if (fullTextLower.includes("goat")) {
        itemName = "Goat Milk";
        category = "Dairy";
        confidence = 0.9;
      } else if (fullTextLower.includes("cow") || fullTextLower.includes("whole") ||
                 fullTextLower.includes("skim")) {
        itemName = "Milk";
        category = "Dairy";
        confidence = 0.85;
      } else {
        // Generic milk
        itemName = "Milk";
        category = "Dairy";
        confidence = 0.8;
      }
    }

    // If no milk found, check for other specific products in text
    if (category === "Other") {
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];
        const lineLower = line.toLowerCase();

        // Check if line contains food keywords
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

        // If we found a match, stop looking
        if (category !== "Other") break;
      }
    }
  }

  // PRIORITY 2: If no specific item found in text, check AI labels
  if (category === "Other" && allDetections && allDetections.length > 0) {
    // Separate labels from objects
    const labels = allDetections.filter((d) => d.source === "label");
    const objects = allDetections.filter((d) => d.source === "object");

    // Try labels first (AI content understanding)
    for (const label of labels) {
      const labelLower = label.name.toLowerCase();

      // Skip non-food items
      if (nonFoodItems.some((word) => labelLower.includes(word))) {
        continue;
      }

      // Check if label matches food category
      for (const [cat, keywords] of Object.entries(foodCategories)) {
        if (keywords.some((keyword) => labelLower.includes(keyword))) {
          itemName = label.name;
          category = cat;
          confidence = label.confidence;
          break;
        }
      }

      // If we found a food match, stop looking
      if (category !== "Other") break;
    }

    // If no label match, try objects (but skip non-food items)
    if (category === "Other") {
      for (const obj of objects) {
        const objLower = obj.name.toLowerCase();

        // Skip non-food items
        if (nonFoodItems.some((word) => objLower.includes(word))) {
          continue;
        }

        // Check if object matches food category
        for (const [cat, keywords] of Object.entries(foodCategories)) {
          if (keywords.some((keyword) => objLower.includes(keyword))) {
            itemName = obj.name;
            category = cat;
            confidence = obj.confidence;
            break;
          }
        }

        // If we found a food match, stop looking
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

// PHASE 3: Parsing & Storing (The "Memory")

// 1. Write a helper function 'findExpiryDate' that takes the full text from the Vision API as input.
function findExpiryDate(text) {
  if (!text) return null;

  // 2. Use multiple regular expressions (regex) to find dates.
  const patterns = [
    // DD/MM/YYYY or DD-MM-YYYY
    /(?:EXP|BEST BEFORE|BBE|USE BY|EXPIRES?)[\s:]*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i,

    // DD/MM/YY or DD-MM-YY
    /(?:EXP|BEST BEFORE|BBE|USE BY|EXPIRES?)[\s:]*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/i,

    // MM/YYYY or MM-YYYY
    /(?:EXP|BEST BEFORE|BBE|USE BY|EXPIRES?)[\s:]*(\d{1,2})[\/\-](\d{4})/i,

    // MON YYYY (e.g., OCT 2025)
    /(?:EXP|BEST BEFORE|BBE|USE BY|EXPIRES?)[\s:]*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*[\s,]*(\d{4})/i,

    // Standalone date patterns without keywords
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/,
    /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*[\s,]*(\d{1,2})[\s,]*(\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0]; // Return the first match found
    }
  }

  return null;
}

// Helper function to format dates to YYYY-MM-DD
function formatDate(dateString) {
  if (!dateString) return null;

  const monthMap = {
    "JAN": "01", "FEB": "02", "MAR": "03", "APR": "04",
    "MAY": "05", "JUN": "06", "JUL": "07", "AUG": "08",
    "SEP": "09", "OCT": "10", "NOV": "11", "DEC": "12",
  };

  try {
    // Handle MON YYYY format
    const monthYearMatch = dateString.match(/(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*[\s,]*(\d{4})/i);
    if (monthYearMatch) {
      const month = monthMap[monthYearMatch[1].toUpperCase().substring(0, 3)];
      const year = monthYearMatch[2];
      return `${year}-${month}-01`;
    }

    // Handle DD/MM/YYYY or DD-MM-YYYY
    const fullDateMatch = dateString.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (fullDateMatch) {
      const day = fullDateMatch[1].padStart(2, "0");
      const month = fullDateMatch[2].padStart(2, "0");
      const year = fullDateMatch[3];
      return `${year}-${month}-${day}`;
    }

    // Handle DD/MM/YY or DD-MM-YY (assume 20XX for YY)
    const shortDateMatch = dateString.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/);
    if (shortDateMatch) {
      const day = shortDateMatch[1].padStart(2, "0");
      const month = shortDateMatch[2].padStart(2, "0");
      const year = `20${shortDateMatch[3]}`;
      return `${year}-${month}-${day}`;
    }

    // Handle MM/YYYY
    const monthYearSlashMatch = dateString.match(/(\d{1,2})[\/\-](\d{4})/);
    if (monthYearSlashMatch) {
      const month = monthYearSlashMatch[1].padStart(2, "0");
      const year = monthYearSlashMatch[2];
      return `${year}-${month}-01`;
    }

    return dateString; // Return as-is if can't parse
  } catch (error) {
    console.error("Date formatting error:", error);
    return dateString;
  }
}

// RECIPE GENERATION FUNCTIONS

/**
 * Generate recipe suggestions based on available ingredients
 */
exports.generateRecipes = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Max-Age", "3600");
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed. Use POST."});
    return;
  }

  try {
    const {ingredients, language, dishCategory, maxRecipes, userGuidance} = req.body;

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

    // Language names for the prompt
    const langNames = {
      en: "English", es: "Spanish", fr: "French", de: "German",
      it: "Italian", pt: "Portuguese", ru: "Russian", zh: "Chinese",
      ja: "Japanese", ko: "Korean", ar: "Arabic", hi: "Hindi",
      tr: "Turkish", pl: "Polish", nl: "Dutch",
      sl: "Slovenian", hr: "Croatian", sr: "Serbian",
    };
    const targetLanguageName = langNames[targetLanguage] || "English";

    // Map dish categories to descriptive text
    const dishCategoryMap = {
      mainCourse: "Main Course / Dinner Entrée",
      appetizer: "Appetizer / Starter",
      dessert: "Dessert / Sweet Dish",
      breakfast: "Breakfast / Brunch",
      soupSalad: "Soup / Salad",
      snack: "Snack / Light Bite",
    };
    const dishTypeDescription = dishCategoryMap[selectedDishType] || "Main Course";

    // Ensure ingredients is an array
    let ingredientsArray = Array.isArray(ingredients) ? ingredients : 
                          (typeof ingredients === 'string' ? ingredients.split(',').map(i => i.trim()) : []);

    // Filter out beverages unless they're cooking ingredients
    const filteredIngredients = ingredientsArray.filter((item) => {
      if (!item || typeof item !== 'string') return false;
      
      const name = item.toLowerCase();
      const isBeverage = name.includes("water") || name.includes("juice") ||
                        name.includes("soda") || name.includes("cola") ||
                        name.includes("beer") || name.includes("wine") ||
                        name.includes("coffee") || name.includes("tea");
      const isCookingIngredient = name.includes("milk") || name.includes("cream") ||
                                  name.includes("broth") || name.includes("stock");
      return !isBeverage || isCookingIngredient;
    });

    console.log("Filtered ingredients (beverages removed):", filteredIngredients);

    const ingredientCount = filteredIngredients.length;
    // Use maxRecipes parameter if provided, otherwise calculate based on ingredient count
    let maxRecipeCount = 5;
    if (typeof maxRecipes === "number" && maxRecipes > 0) {
      // Use explicitly provided maxRecipes value
      maxRecipeCount = maxRecipes;
    } else {
      // Apply ingredient-based limits when maxRecipes not provided
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

    const promptLines = [
      "You are an experienced professional chef with expertise across " +
        "many cuisines.",
      "Create PROVEN, TESTED recipes that are guaranteed to be delicious.",
      "",
      "**IMPORTANT: Respond entirely in " + targetLanguageName + ".**",
      "All names, descriptions, and text must use the target language.",
      "",
      "**DISH TYPE: " + dishTypeDescription + "**",
      "",
      "**AVAILABLE PANTRY INGREDIENTS (THE USER ONLY HAS THESE):**",
      filteredIngredients.join(", "),
      "",
    ];

    // Add user guidance if provided
    if (userGuidance && userGuidance.trim()) {
      promptLines.push("**USER'S SPECIAL REQUESTS:**");
      promptLines.push(userGuidance.trim());
      promptLines.push("");
    }

    // Add remaining prompt instructions
    promptLines.push("🚨 QUALITY STANDARDS - EVERY RECIPE MUST BE:");
    promptLines.push("✓ DELICIOUS - Balanced flavors (sweet/salty/umami/acid)");
    promptLines.push("✓ TESTED - Only suggest combinations you KNOW work well together");
    promptLines.push("✓ ACHIEVABLE - Realistic cooking times and techniques");
    promptLines.push("✓ SATISFYING - Proper portion sizes and nutritional balance");
    promptLines.push("✓ APPEALING - Attractive presentation and appetizing description");
    promptLines.push("");
    promptLines.push("🚨 STRICT INGREDIENT RULES:");
    promptLines.push("1. Use ONLY the listed pantry ingredients");
    promptLines.push("2. You may assume: salt, black pepper, neutral oil, water, sugar");
    promptLines.push("3. Do NOT assume any other ingredients exist unless listed");
    promptLines.push("4. Return at most " + maxRecipeCount + " recipes");
    promptLines.push("5. Each recipe must use multiple ingredients for depth of flavor");
    promptLines.push("6. Avoid one-note or boring flavor profiles");
    promptLines.push("");
    promptLines.push("🚨 FLAVOR VALIDATION:");
    promptLines.push("- Every recipe needs contrast (texture, flavor, temperature)");
    promptLines.push("- Consider: Is this genuinely tasty or just edible?");
    promptLines.push("- Would a professional chef be proud to serve this?");
    promptLines.push("- Does it have proper seasoning and flavor development?");
    promptLines.push("- If ingredients are too limited for a good dish, suggest fewer recipes");
    promptLines.push("");
    promptLines.push("EXAMPLES OF WHAT NOT TO DO:");
    promptLines.push("❌ Add flour (unless flour is in pantry)");
    promptLines.push("❌ Mix in eggs (unless eggs are in pantry)");
    promptLines.push("❌ Boring single-ingredient dishes (just boiled potatoes)");
    promptLines.push("❌ Untested weird combinations that might taste bad");
    promptLines.push("❌ Missing crucial flavor elements (acid, salt, fat balance)");
    promptLines.push("");
    promptLines.push("Respond with JSON format:");
    promptLines.push("{");
    promptLines.push("  \"recipes\": [");
    promptLines.push("    {");
    promptLines.push("      \"name\": \"Recipe name in " + targetLanguageName + "\",");
    promptLines.push("      \"emoji\": \"🍝\",");
    promptLines.push("      \"description\": \"Appetizing 2-3 sentence description " +
      "highlighting why it tastes great in " + targetLanguageName + "\",");
    promptLines.push("      \"prepTime\": \"15 minutes\",");
    promptLines.push("      \"cookTime\": \"30 minutes\",");
    promptLines.push("      \"servings\": \"4\",");
    promptLines.push("      \"difficulty\": \"Easy|Medium|Hard (in " +
      targetLanguageName + ")\",");
    promptLines.push("      \"cuisine\": \"Cuisine name (in " + targetLanguageName + ")\",");
    promptLines.push("      \"nutrition\": {");
    promptLines.push("        \"calories\": 450,");
    promptLines.push("        \"protein\": \"25g\",");
    promptLines.push("        \"carbs\": \"35g\",");
    promptLines.push("        \"fat\": \"18g\"");
    promptLines.push("      },");
    promptLines.push("      \"skillLevel\": \"Beginner|Intermediate|Advanced (in " +
      targetLanguageName + ")\"");
    promptLines.push("    }");
    promptLines.push("  ]");
    promptLines.push("}");
    promptLines.push("");
    promptLines.push("**NUTRITION CALCULATION:**");
    promptLines.push("- Calculate accurate calories and macros PER SERVING");
    promptLines.push("- Based on actual ingredient quantities");
    promptLines.push("- Use standard USDA nutritional values");
    promptLines.push("- Round to nearest 5 calories");
    promptLines.push("");
    promptLines.push("Remember: ONLY suggest recipes you're confident will taste delicious. " +
      "Quality over quantity!");

    const prompt = promptLines.join("\n");

    const result = await generativeModel.generateContent({
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

    console.log("Gemini recipe suggestions:", responseText);

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const recipesArray = Array.isArray(parsed.recipes) ? parsed.recipes : [];
      const payload = {
        recipes: recipesArray.slice(0, maxRecipeCount),
      };

      if (ingredientCount <= 3) {
        payload.note =
          "Pantry ingredient count is low, so recipe variety is limited.";
        payload.noteCode = "limited_pantry_low";
      }

      res.status(200).json(payload);
    } else {
      res.status(500).json({error: "Failed to parse recipe suggestions"});
    }
  } catch (error) {
    console.error("Error generating recipes:", error);
    res.status(500).json({error: "Failed to generate recipes"});
  }
});

/**
 * Get detailed recipe with step-by-step instructions
 */
exports.getRecipeDetails = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Max-Age", "3600");
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed. Use POST."});
    return;
  }

  try {
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
      "6. Focus on maximizing flavor with what's available",
      "7. Include precise measurements, temperatures, and timing",
      "8. Explain WHY each step matters for the final taste",
      "9. **ALL text must be in " + targetLanguageName + "**",
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

    const result = await generativeModel.generateContent({
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
    res.status(500).json({error: "Failed to get recipe details"});
  }
});
