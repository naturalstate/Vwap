/**
 * Recipe URL Extractor
 * Extracts recipes from URLs using JSON-LD structured data (schema.org/Recipe)
 */

const axios = require('axios');
const cheerio = require('cheerio');

class RecipeExtractor {
  constructor() {
    this.timeout = 10000; // 10 second timeout
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  }

  /**
   * Check if a string is a valid URL
   * @param {string} str - String to check
   * @returns {boolean} - True if valid URL
   */
  isValidURL(str) {
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Extract recipe from a URL using JSON-LD structured data
   * @param {string} url - Recipe URL
   * @returns {Promise<Object>} - Extracted recipe data
   */
  async extractFromURL(url) {
    if (!this.isValidURL(url)) {
      throw new Error('Invalid URL format');
    }

    try {
      console.log(`🌐 Fetching recipe from: ${url}`);
      
      // Fetch the webpage
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
        maxRedirects: 5,
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: Unable to fetch recipe`);
      }

      // Parse HTML
      const $ = cheerio.load(response.data);
      
      // Extract JSON-LD structured data
      const jsonLdData = this.extractJSONLD($);
      
      let recipe;
      if (jsonLdData) {
        // Convert JSON-LD to standard recipe format
        recipe = this.convertToRecipeText(jsonLdData);
      } else {
        console.log('⚠️ No JSON-LD found, trying fallback extraction...');
        // Fallback to HTML parsing
        recipe = this.extractFromHTML($);
        if (!recipe || !recipe.text || recipe.text.length < 100) {
          throw new Error('No recipe content found. This site may not be supported.');
        }
      }
      
      console.log(`✅ Successfully extracted recipe: "${recipe.title}"`);
      return recipe;

    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timed out. The website may be slow or unavailable.');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to the website. Please check the URL.');
      } else if (error.response) {
        throw new Error(`Website returned ${error.response.status}: ${error.response.statusText}`);
      } else {
        throw new Error(error.message || 'Failed to extract recipe from URL');
      }
    }
  }

  /**
   * Extract JSON-LD structured data from HTML
   * @param {CheerioStatic} $ - Cheerio instance
   * @returns {Object|null} - Recipe data or null if not found
   */
  extractJSONLD($) {
    let recipeData = null;

    // Look for JSON-LD script tags
    $('script[type="application/ld+json"]').each((i, element) => {
      try {
        const jsonData = JSON.parse($(element).html());
        
        // Handle both single objects and arrays
        const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
        
        for (const data of dataArray) {
          if (this.isRecipeData(data)) {
            recipeData = data;
            return false; // Break out of each loop
          }
        }
      } catch (parseError) {
        console.warn('Failed to parse JSON-LD:', parseError.message);
      }
    });

    return recipeData;
  }

  /**
   * Check if data contains recipe information
   * @param {Object} data - JSON-LD data
   * @returns {boolean} - True if contains recipe data
   */
  isRecipeData(data) {
    if (!data || typeof data !== 'object') return false;
    
    const type = data['@type'] || data.type;
    if (!type) return false;

    // Check for Recipe type (can be string or array)
    const types = Array.isArray(type) ? type : [type];
    return types.some(t => t === 'Recipe' || t.endsWith('/Recipe'));
  }

  /**
   * Convert JSON-LD recipe data to formatted recipe text
   * @param {Object} data - JSON-LD recipe data
   * @returns {Object} - Formatted recipe with title and text
   */
  convertToRecipeText(data) {
    const title = data.name || 'Untitled Recipe';
    let recipeText = '';

    // Add title
    recipeText += `${title}\n\n`;

    // Add description if available
    if (data.description) {
      recipeText += `Description: ${data.description}\n\n`;
    }

    // Add prep/cook time if available
    if (data.prepTime || data.cookTime || data.totalTime) {
      recipeText += 'Timing:\n';
      if (data.prepTime) recipeText += `- Prep Time: ${this.formatDuration(data.prepTime)}\n`;
      if (data.cookTime) recipeText += `- Cook Time: ${this.formatDuration(data.cookTime)}\n`;
      if (data.totalTime) recipeText += `- Total Time: ${this.formatDuration(data.totalTime)}\n`;
      recipeText += '\n';
    }

    // Add servings if available
    if (data.recipeYield || data.yield) {
      const yieldValue = data.recipeYield || data.yield;
      const yieldText = Array.isArray(yieldValue) ? yieldValue[0] : yieldValue;
      recipeText += `Servings: ${yieldText}\n\n`;
    }

    // Add ingredients
    if (data.recipeIngredient && data.recipeIngredient.length > 0) {
      recipeText += 'Ingredients:\n';
      data.recipeIngredient.forEach(ingredient => {
        // Clean up ingredient text
        const cleanIngredient = ingredient.replace(/^\\s*[-•*]\\s*/, '').trim();
        recipeText += `- ${cleanIngredient}\n`;
      });
      recipeText += '\n';
    }

    // Add instructions
    if (data.recipeInstructions && data.recipeInstructions.length > 0) {
      recipeText += 'Instructions:\n';
      data.recipeInstructions.forEach((instruction, index) => {
        let instructionText = '';
        
        if (typeof instruction === 'string') {
          instructionText = instruction;
        } else if (instruction.text) {
          instructionText = instruction.text;
        } else if (instruction.name) {
          instructionText = instruction.name;
        }
        
        if (instructionText) {
          recipeText += `${index + 1}. ${instructionText.trim()}\n`;
        }
      });
    }

    return {
      title,
      text: recipeText.trim(),
      originalData: data
    };
  }

  /**
   * Format ISO 8601 duration to readable format
   * @param {string} duration - ISO 8601 duration (e.g., "PT30M")
   * @returns {string} - Readable duration
   */
  formatDuration(duration) {
    if (!duration) return '';
    
    // Handle ISO 8601 format (PT30M, PT1H30M)
    const match = duration.match(/PT(?:(\\d+)H)?(?:(\\d+)M)?(?:(\\d+)S)?/);
    if (match) {
      const hours = parseInt(match[1] || 0);
      const minutes = parseInt(match[2] || 0);
      const seconds = parseInt(match[3] || 0);
      
      const parts = [];
      if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
      if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
      if (seconds > 0 && hours === 0) parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);
      
      return parts.join(' ');
    }
    
    // Return as-is if not ISO format
    return duration;
  }

  /**
   * Fallback HTML extraction for sites without JSON-LD
   * @param {CheerioStatic} $ - Cheerio instance
   * @returns {Object} - Extracted recipe data
   */
  extractFromHTML($) {
    console.log('🔎 Attempting HTML fallback extraction...');
    
    // Try to find recipe title
    let title = 'Recipe';
    const titleSelectors = [
      'h1.recipe-title',
      'h1[class*="recipe"]',
      'h1[class*="title"]',
      '.recipe-header h1',
      '.entry-title',
      'h1',
      'title'
    ];
    
    for (const selector of titleSelectors) {
      const titleEl = $(selector).first();
      if (titleEl.length && titleEl.text().trim()) {
        title = titleEl.text().trim();
        break;
      }
    }
    
    let recipeText = `${title}\n\n`;
    
    // Try to find ingredients
    const ingredientSelectors = [
      '.recipe-ingredients li',
      '.ingredients li',
      '[class*="ingredient"] li',
      '.recipe-ingredient',
      '[data-ingredient]',
      'ul:contains("cup") li',
      'ul:contains("tsp") li',
      'ul:contains("tbsp") li'
    ];
    
    let ingredients = [];
    for (const selector of ingredientSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        elements.each((i, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 3) {
            ingredients.push(text);
          }
        });
        if (ingredients.length > 2) break; // Found a good list
      }
    }
    
    if (ingredients.length > 0) {
      recipeText += 'Ingredients:\n';
      ingredients.forEach(ingredient => {
        const cleanIngredient = ingredient.replace(/^\\s*[-•*]\\s*/, '').trim();
        recipeText += `- ${cleanIngredient}\n`;
      });
      recipeText += '\n';
    }
    
    // Try to find instructions
    const instructionSelectors = [
      '.recipe-instructions li',
      '.instructions li',
      '.recipe-directions li',
      '.directions li',
      '[class*="instruction"] li',
      '[class*="direction"] li',
      '.recipe-method li',
      'ol li'
    ];
    
    let instructions = [];
    for (const selector of instructionSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        elements.each((i, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 10) {
            instructions.push(text);
          }
        });
        if (instructions.length > 1) break; // Found a good list
      }
    }
    
    if (instructions.length > 0) {
      recipeText += 'Instructions:\n';
      instructions.forEach((instruction, index) => {
        recipeText += `${index + 1}. ${instruction}\n`;
      });
    }
    
    // If we still don't have much content, try to extract any recipe-like text
    if (recipeText.length < 200) {
      const contentSelectors = [
        '.recipe-content',
        '.recipe',
        '.entry-content',
        '.post-content',
        'main',
        'article'
      ];
      
      for (const selector of contentSelectors) {
        const content = $(selector).text();
        if (content && content.length > 500) {
          // Extract text that looks like recipes (has common cooking terms)
          const cookingTerms = ['cup', 'tablespoon', 'teaspoon', 'oven', 'bake', 'mix', 'add', 'stir'];
          if (cookingTerms.some(term => content.toLowerCase().includes(term))) {
            recipeText += content.substring(0, 2000); // Limit to prevent huge extractions
            break;
          }
        }
      }
    }
    
    console.log(`⚙️ Fallback extraction found ${ingredients.length} ingredients, ${instructions.length} instructions`);
    
    return {
      title,
      text: recipeText.trim(),
      source: 'html-fallback',
      success: recipeText.length > 100
    };
  }

  /**
   * Test if a URL likely contains a recipe
   * @param {string} url - URL to test
   * @returns {boolean} - True if likely a recipe URL
   */
  looksLikeRecipeURL(url) {
    if (!this.isValidURL(url)) return false;
    
    const urlLower = url.toLowerCase();
    const recipeKeywords = [
      'recipe', 'recipes', 'cooking', 'food', 'kitchen', 'chef',
      'allrecipes', 'foodnetwork', 'epicurious', 'delish', 'eatingwell',
      'simplyrecipes', 'tasteofhome', 'bonappetit', 'seriouseats',
      'recipetineats'
    ];
    
    return recipeKeywords.some(keyword => urlLower.includes(keyword));
  }
}

module.exports = RecipeExtractor;
