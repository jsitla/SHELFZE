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
 * @param {string} ingredient - The ingredient string (e.g., "2 cups flour")
 * @param {number} originalServings - The original number of servings
 * @param {number} newServings - The target number of servings
 * @returns {string} - The scaled ingredient string
 */
export const scaleIngredient = (ingredient, originalServings, newServings) => {
  if (!ingredient || !originalServings || !newServings || originalServings === newServings) {
    return ingredient;
  }

  const ratio = newServings / originalServings;

  // Attempt to find the quantity at the start of the string
  // Matches: "1 1/2", "1/2", "1.5", "10" followed by optional space
  // We use \s* to handle "100g" where there is no space
  const quantityRegex = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(\.\d+)?)\s*(.*)/;
  const match = ingredient.match(quantityRegex);

  if (match) {
    const quantityStr = match[1];
    const rest = match[3]; // The unit and ingredient name
    
    const quantity = parseQuantity(quantityStr);
    
    if (quantity !== null && !isNaN(quantity)) {
      const newQuantity = quantity * ratio;
      // We always add a space between quantity and unit for readability
      // e.g. "100g" -> "50 g"
      return `${formatQuantity(newQuantity)} ${rest}`;
    }
  }

  // If no quantity pattern matched at the start, return original
  return ingredient;
};
