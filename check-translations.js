const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'contexts', 'translations.js');
let content = fs.readFileSync(filePath, 'utf8');

// Remove imports
content = content.replace(/import .*?;/g, '');

// Remove export keywords
content = content.replace(/export const/g, 'const');

// Mock useMemo
const useMemo = (fn) => fn();

// Execute content
// We wrap it in a function that returns translations
const evalCode = `
    ${content}
    return translations;
`;

try {
    const getTranslations = new Function('useMemo', evalCode);
    const translations = getTranslations(useMemo);
    
    const languages = ['es', 'fr', 'de', 'it', 'sl'];
    const base = translations.en;
    
    let missingCount = 0;
    let untranslatedCount = 0;
    
    // Known identical words to ignore
    const ignoreList = ['ID', 'Email', 'SMS', 'QR', 'OK', 'Chef', 'PantryAI', '100%', '50%', '30%', 'App', 'Version', 'Warning'];

    languages.forEach(lang => {
        console.log(`\n--- Checking ${lang} ---`);
        const target = translations[lang];
        
        Object.keys(base).forEach(key => {
            const baseValue = base[key];
            const targetValue = target[key];
            
            if (targetValue === undefined) {
                console.log(`[MISSING] ${lang}.${key}`);
                missingCount++;
            } else if (targetValue === baseValue) {
                if (!ignoreList.includes(baseValue) && baseValue.length > 1 && isNaN(baseValue)) {
                     console.log(`[SAME AS ENGLISH] ${lang}.${key}: "${targetValue}"`);
                     untranslatedCount++;
                }
            }
        });
    });
    
    console.log(`\nSummary:`);
    console.log(`Missing keys: ${missingCount}`);
    console.log(`Potentially untranslated: ${untranslatedCount}`);

} catch (e) {
    console.error("Error parsing translations:", e);
}

