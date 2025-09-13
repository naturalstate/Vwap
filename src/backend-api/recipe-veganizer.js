/**
 * Vwap Recipe Veganizer
 * Core logic for parsing recipes and replacing non-vegan ingredients
 */

class RecipeVeganizer {
  constructor(database) {
    this.database = database;
    this.ingredientPatterns = this.buildIngredientPatterns();
  }

  /**
   * Build regex patterns for common ingredient formats
   */
  buildIngredientPatterns() {
    return [
      // Quantity + ingredient (e.g., "2 cups milk", "1 lb chicken")
      /(\d+(?:\.\d+)?)\s*(?:cups?|tbsp?|tsp?|tablespoons?|teaspoons?|lbs?|pounds?|oz|ounces?|g|grams?|kg|kilograms?|ml|milliliters?|l|liters?|pints?|quarts?|gallons?|sticks?|slices?|pieces?|cloves?|cans?|jars?|packages?|boxes?)?\s+([a-zA-Z\s]+)/gi,
      
      // Fraction + ingredient (e.g., "1/2 cup butter", "3/4 tsp salt")
      /(\d+\/\d+)\s*(?:cups?|tbsp?|tsp?|tablespoons?|teaspoons?|lbs?|pounds?|oz|ounces?|g|grams?|kg|kilograms?|ml|milliliters?|l|liters?|pints?|quarts?|gallons?|sticks?|slices?|pieces?|cloves?)?\s+([a-zA-Z\s]+)/gi,
      
      // Just ingredient names (e.g., "chicken breast", "cheddar cheese")
      /\b([a-zA-Z\s]{3,}(?:milk|butter|cheese|cream|egg|chicken|beef|pork|fish|honey|bacon|ham))\b/gi,
      
      // List format (e.g., "- 2 eggs", "* 1 cup milk")
      /^[\-\*•]\s*(\d+(?:\.\d+)?|\d+\/\d+)?\s*(?:cups?|tbsp?|tsp?|tablespoons?|teaspoons?|lbs?|pounds?|oz|ounces?)?\s+([a-zA-Z\s]+)/gim
    ];
  }

  /**
   * Main function to veganize a recipe
   */
  async veganizeRecipe(recipeText) {
    const startTime = Date.now();
    
    try {
      // Extract ingredients from recipe text
      const detectedIngredients = await this.extractIngredients(recipeText);
      
      // Find non-vegan ingredients and their substitutes
      const substitutions = await this.findSubstitutions(detectedIngredients);
      
      // Apply substitutions to recipe text
      const veganizedRecipe = this.applySubstitutions(recipeText, substitutions);
      
      const processingTime = Date.now() - startTime;
      
      return {
        veganizedRecipe,
        substitutions,
        detectedIngredients,
        processingTime
      };
      
    } catch (error) {
      console.error('❌ Error veganizing recipe:', error);
      throw error;
    }
  }

  /**
   * Extract ingredient names from recipe text
   */
  async extractIngredients(recipeText) {
    const ingredients = new Set();
    
    // Apply each pattern to find ingredients
    for (const pattern of this.ingredientPatterns) {
      let match;
      while ((match = pattern.exec(recipeText)) !== null) {
        const ingredientText = match[2] || match[1];
        if (ingredientText && ingredientText.trim().length > 2) {
          const cleaned = this.cleanIngredientName(ingredientText.trim());
          if (cleaned) {
            ingredients.add(cleaned.toLowerCase());
          }
        }
      }
    }
    
    // Also search for common ingredient words directly
    const commonIngredients = [
      'milk', 'butter', 'cheese', 'cream', 'eggs', 'egg', 'chicken', 'beef', 
      'pork', 'bacon', 'ham', 'fish', 'salmon', 'tuna', 'honey', 'gelatin',
      'yogurt', 'sour cream', 'mayonnaise', 'whey', 'casein'
    ];
    
    for (const ingredient of commonIngredients) {
      const regex = new RegExp(`\\b${ingredient}s?\\b`, 'gi');
      if (regex.test(recipeText)) {
        ingredients.add(ingredient);
      }
    }
    
    console.log(`🔍 Detected ${ingredients.size} potential ingredients:`, Array.from(ingredients));
    return Array.from(ingredients);
  }

  /**
   * Clean ingredient name for database lookup
   */
  cleanIngredientName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z\s]/g, '') // Remove non-letter characters
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .replace(/\b(fresh|dried|raw|cooked|organic|free-range|grass-fed|whole|skim|2%|low-fat|fat-free)\b/g, '') // Remove modifiers
      .trim();
  }

  /**
   * Find substitutions for non-vegan ingredients
   */
  async findSubstitutions(ingredientNames) {
    const substitutions = [];
    
    for (const ingredientName of ingredientNames) {
      try {
        // Search database for this ingredient
        const searchResults = await this.database.searchIngredients(ingredientName, 5);
        
        for (const dbIngredient of searchResults) {
          if (!dbIngredient.vegan && dbIngredient.substitutes.length > 0) {
            // Found a non-vegan ingredient with substitutes
            const bestSubstitute = this.selectBestSubstitute(dbIngredient.substitutes, ingredientName);
            
            substitutions.push({
              from: dbIngredient.name,
              to: bestSubstitute,
              category: dbIngredient.category,
              alternatives: dbIngredient.substitutes.filter(s => s !== bestSubstitute),
              confidence: dbIngredient.confidence,
              common_uses: dbIngredient.common_uses
            });
            
            console.log(`🔄 Substitution: ${dbIngredient.name} → ${bestSubstitute}`);
            break; // Use first match for each ingredient
          }
        }
        
      } catch (error) {
        console.error(`❌ Error finding substitution for ${ingredientName}:`, error);
      }
    }
    
    return substitutions;
  }

  /**
   * Select the best substitute from available options
   */
  selectBestSubstitute(substitutes, originalIngredient) {
    if (substitutes.length === 0) return null;
    if (substitutes.length === 1) return substitutes[0];
    
    // Preference logic - could be enhanced with ML in the future
    const preferences = {
      // For dairy
      'milk': ['oat milk', 'almond milk', 'soy milk'],
      'butter': ['vegan butter', 'coconut oil'],
      'cheese': ['nutritional yeast', 'vegan cheese'],
      'cream': ['coconut cream', 'cashew cream'],
      
      // For eggs
      'egg': ['flax eggs', 'aquafaba'],
      
      // For meat
      'chicken': ['tofu', 'seitan', 'tempeh'],
      'beef': ['seitan', 'Beyond beef'],
      'pork': ['tempeh bacon', 'mushroom bacon']
    };
    
    const preferred = preferences[originalIngredient.toLowerCase()];
    if (preferred) {
      for (const pref of preferred) {
        if (substitutes.includes(pref)) {
          return pref;
        }
      }
    }
    
    // Default to first substitute
    return substitutes[0];
  }

  /**
   * Apply substitutions to the recipe text
   */
  applySubstitutions(recipeText, substitutions) {
    let veganizedText = recipeText;
    
    for (const substitution of substitutions) {
      // Create regex patterns to find and replace the ingredient
      const patterns = [
        // Exact word matches with word boundaries
        new RegExp(`\\b${this.escapeRegex(substitution.from)}\\b`, 'gi'),
        // Plural forms
        new RegExp(`\\b${this.escapeRegex(substitution.from)}s\\b`, 'gi'),
        // Common variations
        new RegExp(`\\b${this.escapeRegex(substitution.from.replace(/\s+/g, '\\s+'))}\\b`, 'gi')
      ];
      
      for (const pattern of patterns) {
        veganizedText = veganizedText.replace(pattern, (match) => {
          // Preserve original capitalization
          if (match.charAt(0) === match.charAt(0).toUpperCase()) {
            return substitution.to.charAt(0).toUpperCase() + substitution.to.slice(1);
          }
          return substitution.to;
        });
      }
    }
    
    return veganizedText;
  }

  /**
   * Escape special regex characters
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Analyze recipe for vegan-friendliness (utility function)
   */
  async analyzeRecipe(recipeText) {
    const ingredients = await this.extractIngredients(recipeText);
    const substitutions = await this.findSubstitutions(ingredients);
    
    const analysis = {
      is_vegan: substitutions.length === 0,
      non_vegan_ingredients: substitutions.length,
      detected_ingredients: ingredients.length,
      difficulty_score: this.calculateVeganizationDifficulty(substitutions),
      categories_affected: [...new Set(substitutions.map(s => s.category))]
    };
    
    return analysis;
  }

  /**
   * Calculate how difficult it would be to veganize this recipe
   */
  calculateVeganizationDifficulty(substitutions) {
    if (substitutions.length === 0) return 0; // Already vegan
    
    let difficulty = 0;
    
    for (const sub of substitutions) {
      // Base difficulty per substitution
      difficulty += 1;
      
      // Higher difficulty for certain categories
      if (sub.category === 'eggs') difficulty += 2; // Eggs are harder to substitute
      if (sub.category === 'meat') difficulty += 1.5; // Meat substitution affects texture
      if (sub.category === 'dairy' && sub.from.includes('cheese')) difficulty += 1.5; // Cheese is complex
      
      // Lower difficulty if confidence is high
      if (sub.confidence > 0.8) difficulty -= 0.5;
      
      // Lower difficulty if multiple alternatives exist
      if (sub.alternatives.length > 2) difficulty -= 0.2;
    }
    
    // Scale to 1-10
    return Math.min(10, Math.max(1, Math.round(difficulty)));
  }
}

module.exports = RecipeVeganizer;
