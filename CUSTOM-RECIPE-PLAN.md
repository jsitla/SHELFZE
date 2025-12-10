# Custom Recipe Generation Implementation Plan

## 1. Analysis of Current Recipe System
The current `RecipeGenerator` is designed to minimize food waste by strictly enforcing pantry ingredient usage. It uses a hybrid approach:
- **Generation**: Gemini 2.5 Flash generates recipes based *only* on available ingredients.
- **Retrieval**: Fetches existing recipes from Firestore and filters them against pantry items.
- **User Guidance**: Allows some optional input but still strictly adheres to pantry constraints.

## 2. Proposed Feature: "Chef's Table" (Custom Recipes)
This new feature will be a standalone section dedicated to free-form culinary creativity, separated from the pantry-restricted logic.

### Key Requirements
- **Separation**: Clearly distinct from "Pantry Recipes".
- **Freedom**: No ingredient restrictions. User can ask for anything.
- **Conversation**: "Open discussion" window to modify the recipe iteratively.
- **AI Model**: Continue using **Gemini 2.5 Flash** for high-quality culinary output.

## 3. Implementation Steps

### Phase 1: Backend (Cloud Functions)
We need new endpoints in `functions/index.js` to handle the free-form nature and conversational context.

1.  **`generateCustomRecipe` Endpoint**
    -   **Input**: `prompt` (User's request), `language`.
    -   **Logic**: Direct call to Gemini 2.5 Flash with a "Professional Chef" persona.
    -   **Output**: JSON structured recipe (strictly matching the existing schema for full UI compatibility).
        ```json
        {
          "name": "Recipe Name",
          "emoji": "🍲",
          "description": "Summary",
          "prepTime": "15 min",
          "cookTime": "30 min",
          "servings": "4",
          "difficulty": "Easy",
          "cuisine": "Italian",
          "nutrition": { "calories": 500, "protein": "20g", "carbs": "30g", "fat": "10g" },
          "ingredients": ["Item 1", "Item 2"],
          "instructions": ["Step 1", "Step 2"],
          "tips": ["Tip 1"]
        }
        ```

2.  **`modifyRecipe` Endpoint**
    -   **Input**: `currentRecipe` (JSON), `modificationRequest` (String), `language`.
    -   **Logic**:
        -   Send the current recipe JSON to Gemini.
        -   Apply the user's modification request.
        -   Return the *updated* recipe JSON.

### Phase 2: Frontend (React Native)
A new screen `CustomRecipeGenerator.js` will be created.

1.  **UI Layout**
    -   **Header**: "Chef's Table" or "Custom Kitchen".
    -   **Initial View**: Large text input: "What are you craving today?" (e.g., "Spicy Tacos", "Vegan Chocolate Cake").
    -   **Result View**:
        -   Displays the generated recipe (using the existing recipe detail view components if possible).
        -   **Chat/Modification Bar**: A fixed bottom bar with a text input to "Discuss & Modify".
    -   **Chat Interface**:
        -   User types: "Make it gluten-free" or "Add more garlic".
        -   App shows a loading state ("Chef is updating your recipe...").
        -   The recipe view updates in real-time with the changes.

2.  **Navigation**
    -   Add a new tab or a prominent button on the Home/Recipe screen to switch to "Custom Mode".

### Phase 3: Integration
1.  **`config.js`**: Add new function URLs.
2.  **`App.js`**: Register the new screen.
3.  **Saving**: Allow users to save these custom recipes to their existing `SavedRecipes` collection, perhaps with a special tag (`isCustom: true`).

## 4. User Experience Flow
1.  User opens **Chef's Table**.
2.  User types: *"I want a lasagna recipe but with zucchini instead of pasta."*
3.  AI generates the recipe.
4.  User sees the recipe but thinks it needs more cheese.
5.  User types in the bottom bar: *"Add extra mozzarella and parmesan."*
6.  AI rewrites the recipe to include the extra cheese.
7.  User is happy and clicks **Save**.

## 5. Technical Considerations
-   **Context Window**: When modifying, we must send the *entire* current recipe back to the AI so it knows what to modify.
-   **Latency**: Gemini 2.5 Flash is fast, but we should show engaging loading states (e.g., "Chopping vegetables...", "Preheating oven...").
-   **Quota**: These generations should count towards the user's recipe quota (or a separate quota if desired).
