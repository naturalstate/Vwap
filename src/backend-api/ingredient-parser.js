/**
 * Vwap Ingredient Parser
 * Processes OpenFoodFacts data and existing ingredient database
 */

const fs = require('fs').promises;
const path = require('path');

class IngredientParser {
  constructor() {
    this.substitutesMap = this.loadSubstitutesMap();
    this.categoryMap = this.loadCategoryMap();
  }

  /**
   * Load predefined substitutes mapping
   */
  loadSubstitutesMap() {
    return {
      // Dairy
      'milk': ['oat milk', 'almond milk', 'soy milk', 'coconut milk'],
      'butter': ['vegan butter', 'coconut oil', 'olive oil', 'avocado oil'],
      'cheese': ['nutritional yeast', 'cashew cheese', 'vegan cheese'],
      'cream': ['coconut cream', 'cashew cream', 'oat cream'],
      'yogurt': ['coconut yogurt', 'almond yogurt', 'soy yogurt'],
      'sour cream': ['cashew sour cream', 'coconut yogurt', 'tofu sour cream'],
      'ice cream': ['coconut ice cream', 'oat ice cream', 'cashew ice cream'],
      
      // Eggs
      'eggs': ['flax eggs', 'chia eggs', 'aquafaba', 'commercial egg replacer'],
      'egg whites': ['aquafaba', 'flax gel', 'commercial egg white replacer'],
      'egg yolks': ['cashew cream', 'silken tofu', 'vegan mayo'],
      'mayonnaise': ['vegan mayo', 'avocado', 'cashew mayo', 'tahini'],
      
      // Meat
      'chicken': ['chicken-style seitan', 'cauliflower', 'tofu', 'tempeh'],
      'beef': ['Beyond beef', 'seitan', 'mushroom crumbles', 'lentil crumbles'],
      'pork': ['mushroom bacon', 'tempeh bacon', 'coconut bacon', 'smoky tofu'],
      'bacon': ['tempeh bacon', 'coconut bacon', 'shiitake mushroom strips'],
      'sausage': ['plant-based sausage', 'seasoned crumbled tofu', 'lentil sausage'],
      'ham': ['smoky tempeh', 'seasoned tofu', 'jackfruit ham'],
      'turkey': ['tofurky', 'seitan roast', 'stuffed squash', 'lentil loaf'],
      
      // Seafood
      'fish': ['banana blossom', 'hearts of palm', 'tofu fish', 'seaweed'],
      'shrimp': ['king oyster mushrooms', 'hearts of palm', 'plant-based shrimp'],
      'tuna': ['jackfruit tuna', 'chickpea tuna', 'hearts of palm'],
      'salmon': ['marinated carrots', 'beet-cured tofu', 'plant-based salmon'],
      
      // Hidden animal products
      'honey': ['maple syrup', 'agave nectar', 'brown rice syrup', 'date syrup'],
      'gelatin': ['agar agar', 'carrageenan', 'pectin', 'cornstarch'],
      'lard': ['coconut oil', 'vegan shortening', 'vegetable oil'],
      'whey': ['plant-based protein powder', 'pea protein', 'rice protein'],
      'casein': ['plant-based protein powder', 'nutritional yeast']
    };
  }

  /**
   * Load category mapping for ingredients
   */
  loadCategoryMap() {
    return {
      // Common patterns for categorizing ingredients
      dairy: ['milk', 'butter', 'cheese', 'cream', 'yogurt', 'whey', 'casein', 'lactose'],
      eggs: ['egg', 'albumin', 'mayonnaise'],
      meat: ['beef', 'chicken', 'pork', 'lamb', 'bacon', 'sausage', 'ham', 'turkey'],
      seafood: ['fish', 'shrimp', 'crab', 'lobster', 'salmon', 'tuna', 'cod'],
      hidden: ['honey', 'gelatin', 'lard', 'tallow', 'carmine', 'shellac', 'isinglass'],
      plant: ['vegetable', 'fruit', 'grain', 'bean', 'nut', 'seed', 'herb', 'spice']
    };
  }

  /**
   * Parse OpenFoodFacts JSON data and extract ingredients
   */
  async parseOpenFoodFacts(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const openFoodData = JSON.parse(data);
      
      console.log(`📊 Processing ${openFoodData.products?.length || 0} OpenFoodFacts products...`);
      
      const ingredients = new Map(); // Use Map to avoid duplicates
      let processedCount = 0;
      
      if (openFoodData.products) {
        for (const product of openFoodData.products) {
          if (product.ingredients && Array.isArray(product.ingredients)) {
            for (const ingredient of product.ingredients) {
              if (ingredient.text && ingredient.id) {
                const processedIngredient = this.processIngredient(ingredient, product);
                if (processedIngredient) {
                  const key = processedIngredient.name;
                  
                  // Keep highest confidence version if duplicate
                  if (!ingredients.has(key) || 
                      ingredients.get(key).confidence < processedIngredient.confidence) {
                    ingredients.set(key, processedIngredient);
                  }
                  processedCount++;
                }
              }
            }
          }
        }
      }
      
      const uniqueIngredients = Array.from(ingredients.values());
      
      console.log(`✅ Extracted ${uniqueIngredients.length} unique ingredients from ${processedCount} total entries`);
      
      return uniqueIngredients;
      
    } catch (error) {
      console.error('❌ Error parsing OpenFoodFacts data:', error);
      throw error;
    }
  }

  /**
   * Process individual ingredient from OpenFoodFacts
   */
  processIngredient(ingredient, product) {
    const name = this.cleanIngredientName(ingredient.text);
    if (!name || name.length < 2) return null;
    
    // Determine if vegan
    const isVegan = this.determineVeganStatus(ingredient, product);
    if (isVegan === null) return null; // Skip if can't determine vegan status
    
    // Categorize ingredient
    const category = this.categorizeIngredient(name, ingredient);
    
    // Get substitutes and common uses
    const substitutes = this.getSubstitutes(name, isVegan);
    const commonUses = this.getCommonUses(name, category);
    
    // Calculate confidence score
    const confidence = this.calculateConfidence(ingredient, product);
    
    return {
      name,
      vegan: isVegan,
      category,
      substitutes,
      common_uses: commonUses,
      source: 'openfoodfacts',
      confidence
    };
  }

  /**
   * Clean and normalize ingredient name
   */
  cleanIngredientName(text) {
    if (!text) return null;
    
    return text
      .toLowerCase()
      .replace(/^en:/, '') // Remove language prefix
      .replace(/[^a-z\s-]/g, '') // Keep only letters, spaces, hyphens
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Determine vegan status of ingredient
   */
  determineVeganStatus(ingredient, product) {
    // Direct vegan flag
    if (ingredient.vegan === 'yes') return true;
    if (ingredient.vegan === 'no') return false;
    
    // Product-level analysis
    if (product.ingredients_analysis_tags) {
      if (product.ingredients_analysis_tags.includes('en:vegan')) return true;
      if (product.ingredients_analysis_tags.includes('en:non-vegan')) return false;
    }
    
    // Pattern matching for known non-vegan ingredients
    const name = ingredient.text.toLowerCase();
    const nonVeganPatterns = [
      'milk', 'butter', 'cheese', 'cream', 'whey', 'casein', 'lactose',
      'egg', 'beef', 'chicken', 'pork', 'fish', 'honey', 'gelatin',
      'bacon', 'ham', 'sausage', 'lard', 'tallow'
    ];
    
    if (nonVeganPatterns.some(pattern => name.includes(pattern))) {
      return false;
    }
    
    // Skip ingredients we can't classify
    return null;
  }

  /**
   * Categorize ingredient
   */
  categorizeIngredient(name, ingredient) {
    for (const [category, patterns] of Object.entries(this.categoryMap)) {
      if (patterns.some(pattern => name.includes(pattern))) {
        return category;
      }
    }
    
    // Default category based on common patterns
    if (name.includes('oil') || name.includes('fat')) return 'fat';
    if (name.includes('sugar') || name.includes('syrup')) return 'sweetener';
    if (name.includes('salt') || name.includes('sodium')) return 'seasoning';
    if (name.includes('flour') || name.includes('starch')) return 'grain';
    
    return 'other';
  }

  /**
   * Get substitutes for ingredient
   */
  getSubstitutes(name, isVegan) {
    if (isVegan) return []; // Vegan ingredients don't need substitutes
    
    // Direct mapping
    if (this.substitutesMap[name]) {
      return this.substitutesMap[name];
    }
    
    // Pattern matching
    for (const [pattern, subs] of Object.entries(this.substitutesMap)) {
      if (name.includes(pattern)) {
        return subs;
      }
    }
    
    return [];
  }

  /**
   * Get common uses for ingredient
   */
  getCommonUses(name, category) {
    const usesMap = {
      dairy: ['baking', 'cooking', 'cereal', 'coffee'],
      eggs: ['baking', 'binding', 'breakfast'],
      meat: ['main dishes', 'sandwiches', 'stir-fry'],
      seafood: ['main dishes', 'sushi', 'pasta'],
      fat: ['cooking', 'baking', 'frying'],
      sweetener: ['baking', 'beverages', 'desserts'],
      seasoning: ['cooking', 'flavoring', 'preservation'],
      grain: ['baking', 'breads', 'pasta']
    };
    
    return usesMap[category] || ['cooking', 'baking'];
  }

  /**
   * Calculate confidence score for ingredient data
   */
  calculateConfidence(ingredient, product) {
    let confidence = 0.5; // Base confidence
    
    // Higher confidence if direct vegan flag
    if (ingredient.vegan === 'yes' || ingredient.vegan === 'no') {
      confidence += 0.3;
    }
    
    // Higher confidence if product has vegan analysis
    if (product.ingredients_analysis_tags) {
      confidence += 0.2;
    }
    
    // Higher confidence if ingredient is in taxonomy
    if (ingredient.is_in_taxonomy === 1) {
      confidence += 0.2;
    }
    
    // Lower confidence if name is very long (likely parsing error)
    if (ingredient.text && ingredient.text.length > 50) {
      confidence -= 0.3;
    }
    
    return Math.min(1.0, Math.max(0.1, confidence));
  }

  /**
   * Parse existing ingredient database JSON
   */
  async parseExistingDatabase(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const existingData = JSON.parse(data);
      
      const ingredients = [];
      
      if (existingData.ingredients) {
        for (const [category, categoryIngredients] of Object.entries(existingData.ingredients)) {
          for (const [name, details] of Object.entries(categoryIngredients)) {
            ingredients.push({
              name: name.toLowerCase(),
              vegan: details.vegan,
              category: category.replace(/_/g, ' '),
              substitutes: details.substitutes || [],
              common_uses: details.common_uses || [],
              source: 'curated',
              confidence: 1.0 // High confidence for curated data
            });
          }
        }
      }
      
      console.log(`✅ Parsed ${ingredients.length} ingredients from existing database`);
      return ingredients;
      
    } catch (error) {
      console.error('❌ Error parsing existing database:', error);
      throw error;
    }
  }
}

module.exports = IngredientParser;
