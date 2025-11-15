const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'contexts', 'translations.js');
let content = fs.readFileSync(filePath, 'utf8');

// French - replace English values with French translations
content = content.replace(/(\tfr: withOverrides\(\{[\s\S]*?)nutrition: 'Nutrition',/m, "$1nutrition: 'Nutrition',");
content = content.replace(/(\tfr: withOverrides\(\{[\s\S]*?)calories: 'Calories',/m, "$1calories: 'Calories',");
content = content.replace(/(\tfr: withOverrides\(\{[\s\S]*?)instructions: 'Instructions',/m, "$1instructions: 'Instructions',");
content = content.replace(/(\tfr: withOverrides\(\{[\s\S]*?)dessert: 'Dessert',/m, "$1dessert: 'Dessert',");
content = content.replace(/(\tfr: withOverrides\(\{[\s\S]*?)fruits: 'Fruits',/m, "$1fruits: 'Fruits',");
content = content.replace(/(\tfr: withOverrides\(\{[\s\S]*?)condiments: 'Condiments',/m, "$1condiments: 'Condiments',");
content = content.replace(/(\tfr: withOverrides\(\{[\s\S]*?\t\t)scans: 'scans',/m, "$1scans: 'scans',");

// German - replace English values with German translations
content = content.replace(/(\tde: withOverrides\(\{[\s\S]*?\t\t)optional: 'optional',/m, "$1optional: 'fakultativ',");
content = content.replace(/(\tde: withOverrides\(\{[\s\S]*?)vegan: 'Vegan',/m, "$1vegan: 'Vegan',");
content = content.replace(/(\tde: withOverrides\(\{[\s\S]*?)dessert: 'Dessert',/m, "$1dessert: 'Dessert',");
content = content.replace(/(\tde: withOverrides\(\{[\s\S]*?)snack: 'Snack',/m, "$1snack: 'Snack',");

// Italian - replace English values with Italian translations
content = content.replace(/(\tit: withOverrides\(\{[\s\S]*?)servings: 'Servings',/m, "$1servings: 'Porzioni',");
content = content.replace(/(\tit: withOverrides\(\{[\s\S]*?)difficulty: 'Difficulty',/m, "$1difficulty: 'Difficoltà',");
content = content.replace(/(\tit: withOverrides\(\{[\s\S]*?)ingredients: 'Ingredients',/m, "$1ingredients: 'Ingredienti',");
content = content.replace(/(\tit: withOverrides\(\{[\s\S]*?)instructions: 'Instructions',/m, "$1instructions: 'Istruzioni',");
content = content.replace(/(\tit: withOverrides\(\{[\s\S]*?)dessert: 'Dessert',/m, "$1dessert: 'Dolce',");
content = content.replace(/(\tit: withOverrides\(\{[\s\S]*?)snack: 'Snack',/m, "$1snack: 'Spuntino',");
// Account and password were already added in the big batch, check if they exist

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Remaining translations fixed!');
