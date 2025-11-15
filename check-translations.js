const { translations } = require('./contexts/translations.js');

const baseKeys = Object.keys(translations.en);
const languages = ['es', 'fr', 'de', 'it', 'sl'];

console.log(`\n📊 Translation Completeness Report\n${'='.repeat(50)}\n`);
console.log(`Base English keys: ${baseKeys.length}\n`);

languages.forEach(lang => {
  const langKeys = Object.keys(translations[lang]);
  const missing = baseKeys.filter(key => !langKeys.includes(key));
  const extra = langKeys.filter(key => !baseKeys.includes(key));
  
  console.log(`\n${lang.toUpperCase()}:`);
  console.log(`  Total keys: ${langKeys.length}`);
  console.log(`  Missing: ${missing.length}`);
  
  if (missing.length > 0) {
    console.log(`  Missing keys: ${missing.join(', ')}`);
  }
  
  if (extra.length > 0) {
    console.log(`  Extra keys: ${extra.join(', ')}`);
  }
});
