
/**
 * Parses a quantity string into a number.
 * Handles integers ("2"), decimals ("1.5"), fractions ("1/2"), and mixed numbers ("1 1/2").
 */
const parseQuantity = (str) => {
  if (!str) return null;

  // Regex for mixed numbers (e.g., "1 1/2")
  const mixedMatch = str.match(/^(\d+)\s+(\d+)\/(\d+)/);
  if (mixedMatch) {
    return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);
  }

  // Regex for fractions (e.g., "1/2")
  const fractionMatch = str.match(/^(\d+)\/(\d+)/);
  if (fractionMatch) {
    return parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
  }

  // Regex for decimals or integers
  const numberMatch = str.match(/^(\d+(\.\d+)?)/);
  if (numberMatch) {
    return parseFloat(numberMatch[1]);
  }

  return null;
};

/**
 * Formats a number back into a readable string.
 * Converts common decimals to fractions.
 */
const formatQuantity = (num) => {
  const tolerance = 0.01;
  
  // Check for whole numbers
  if (Math.abs(Math.round(num) - num) < tolerance) {
    return Math.round(num).toString();
  }

  // Common fractions
  const fractions = [
    { val: 0.25, str: '1/4' },
    { val: 0.33, str: '1/3' },
    { val: 0.5, str: '1/2' },
    { val: 0.66, str: '2/3' },
    { val: 0.75, str: '3/4' }
  ];

  const whole = Math.floor(num);
  const remainder = num - whole;

  for (const frac of fractions) {
    if (Math.abs(remainder - frac.val) < tolerance) {
      return whole > 0 ? `${whole} ${frac.str}` : frac.str;
    }
  }

  // Default to decimal with 1 or 2 places
  return parseFloat(num.toFixed(2)).toString();
};

/**
 * Scales an ingredient string based on the ratio of new servings to original servings.
 */
const scaleIngredient = (ingredient, originalServings, newServings) => {
  if (!ingredient || !originalServings || !newServings || originalServings === newServings) {
    return ingredient;
  }

  const ratio = newServings / originalServings;

  // Attempt to find the quantity at the start of the string
  // Matches: "1 1/2", "1/2", "1.5", "10" followed by space
  const quantityRegex = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(\.\d+)?)\s*(.*)/;
  const match = ingredient.match(quantityRegex);

  if (match) {
    const quantityStr = match[1];
    const rest = match[3]; // The unit and ingredient name
    
    const quantity = parseQuantity(quantityStr);
    
    if (quantity !== null && !isNaN(quantity)) {
      const newQuantity = quantity * ratio;
      return `${formatQuantity(newQuantity)} ${rest}`;
    }
  }

  // If no quantity pattern matched at the start, return original
  return ingredient;
};

const testCases = [
  { ingredient: "1 cup flour", original: 4, new: 2, expected: "1/2 cup flour" },
  { ingredient: "2 cups flour", original: 4, new: 8, expected: "4 cups flour" },
  { ingredient: "1/2 tsp salt", original: 4, new: 8, expected: "1 tsp salt" },
  { ingredient: "1 1/2 tbsp sugar", original: 4, new: 2, expected: "3/4 tbsp sugar" },
  { ingredient: "1.5 kg chicken", original: 4, new: 8, expected: "3 kg chicken" },
  { ingredient: "Salt to taste", original: 4, new: 8, expected: "Salt to taste" },
  { ingredient: "4 eggs", original: 4, new: 2, expected: "2 eggs" },
  { ingredient: "1/4 cup oil", original: 4, new: 6, expected: "0.38 cup oil" },
  { ingredient: "100g butter", original: 4, new: 2, expected: "50g butter" }, // This might fail if regex expects space after number
];

console.log("Running Scaler Tests...\n");

testCases.forEach((test, index) => {
  const result = scaleIngredient(test.ingredient, test.original, test.new);
  // Loose check for the decimal one
  const isPass = result === test.expected || (test.expected.includes("0.38") && result.includes("0.38"));
  
  console.log(`Test ${index + 1}: "${test.ingredient}" -> "${result}"`);
  if (!isPass) {
    console.log(`  FAIL. Expected: "${test.expected}"`);
  } else {
    console.log(`  PASS`);
  }
});
