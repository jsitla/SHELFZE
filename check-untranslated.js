const { translations } = require('./contexts/translations.js');

const baseTranslations = translations.en;
const languages = ['es', 'fr', 'de', 'it', 'sl'];
const languageNames = {
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  sl: 'Slovenian'
};

console.log(`\n🔍 Checking for Untranslated Text (same as English)\n${'='.repeat(70)}\n`);

languages.forEach(lang => {
  const langTranslations = translations[lang];
  const sameAsEnglish = [];
  
  Object.keys(baseTranslations).forEach(key => {
    // Skip keys that intentionally might be the same (like emojis, numbers, etc.)
    const skipKeys = ['error', 'email', 'profile', 'premium', 'stop', 'all', 'add'];
    
    if (!skipKeys.includes(key) && 
        langTranslations[key] === baseTranslations[key] &&
        typeof baseTranslations[key] === 'string' &&
        baseTranslations[key].length > 2) {
      sameAsEnglish.push({ key, value: baseTranslations[key] });
    }
  });
  
  console.log(`\n${languageNames[lang].toUpperCase()} (${lang}):`);
  if (sameAsEnglish.length === 0) {
    console.log('  ✅ All translations complete!');
  } else {
    console.log(`  ⚠️  Found ${sameAsEnglish.length} untranslated keys:\n`);
    sameAsEnglish.forEach(({ key, value }) => {
      console.log(`    ${key}: "${value}"`);
    });
  }
});
