#!/usr/bin/env node
/**
 * USDA FoodData Central Downloader
 * Downloads and processes ingredients from USDA database
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class USDADownloader {
  constructor() {
    // USDA FoodData Central API (no key required for basic access)
    this.baseURL = 'https://api.nal.usda.gov/fdc/v1';
    
    // Vegan classification patterns
    this.veganPatterns = {
      vegan: [
        'vegetable', 'fruit', 'grain', 'cereal', 'rice', 'wheat', 'oat', 'barley',
        'bean', 'lentil', 'pea', 'nut', 'seed', 'oil', 'vinegar', 'spice', 'herb',
        'tomato', 'potato', 'onion', 'garlic', 'carrot', 'apple', 'banana', 'orange',
        'bread', 'pasta', 'flour', 'sugar', 'salt', 'pepper', 'basil', 'oregano'
      ],
      nonVegan: [
        'meat', 'beef', 'chicken', 'pork', 'fish', 'salmon', 'tuna', 'shrimp',
        'milk', 'cheese', 'butter', 'cream', 'yogurt', 'egg', 'honey', 'gelatin',
        'bacon', 'ham', 'sausage', 'turkey', 'lamb', 'crab', 'lobster'
      ]
    };
  }

  async downloadUSDAData() {
    console.log('🇺🇸 Downloading USDA FoodData Central sample...\n');

    try {
      // Search for basic food ingredients (using search endpoint)
      const searchQueries = [
        'vegetables',
        'fruits', 
        'grains',
        'dairy',
        'meat',
        'spices',
        'nuts',
        'oils'
      ];

      let allFoods = [];
      
      for (const query of searchQueries) {
        console.log(`🔍 Searching for: ${query}`);
        
        const searchData = await this.searchFoods(query, 125); // 125 per category = 1000 total
        if (searchData && searchData.foods) {
          allFoods = allFoods.concat(searchData.foods);
          console.log(`  ✅ Found ${searchData.foods.length} foods`);
        }
        
        // Small delay to be respectful to the API
        await this.delay(500);
      }

      console.log(`\n📊 Total USDA foods downloaded: ${allFoods.length}`);

      // Process foods into ingredients
      const ingredients = this.processFoodsToIngredients(allFoods);
      
      console.log(`🔧 Processed into ${ingredients.length} ingredients`);

      // Save to file
      const outputFile = path.join(__dirname, '../../usda_ingredients.json');
      const output = {
        source: 'usda',
        count: ingredients.length,
        downloaded: new Date().toISOString(),
        ingredients: ingredients
      };

      fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
      console.log(`💾 Saved to: ${outputFile}`);

      return ingredients;

    } catch (error) {
      console.error('❌ Error downloading USDA data:', error);
      throw error;
    }
  }

  async searchFoods(query, pageSize = 50) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseURL}/foods/search?query=${encodeURIComponent(query)}&pageSize=${pageSize}&dataType=Foundation,SR Legacy`;
      
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (error) {
            reject(error);
          }
        });
        
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  processFoodsToIngredients(foods) {
    const ingredients = [];
    const seen = new Set(); // Avoid duplicates

    for (const food of foods) {
      if (!food.description) continue;

      // Extract ingredient name from description
      let name = this.extractIngredientName(food.description);
      if (!name || name.length < 3 || seen.has(name.toLowerCase())) {
        continue;
      }

      seen.add(name.toLowerCase());

      // Determine vegan status
      const veganStatus = this.determineVeganStatus(name, food);

      // Categorize
      const category = this.categorizeIngredient(name);

      // Create ingredient object
      const ingredient = {
        name: name,
        vegan: veganStatus,
        category: category,
        source: 'usda',
        confidence: 0.9, // USDA data is high quality
        usda_id: food.fdcId,
        description: food.description,
        substitutes: veganStatus === false ? this.getSubstitutes(name) : [],
        common_uses: this.getCommonUses(name, category)
      };

      ingredients.push(ingredient);
    }

    return ingredients;
  }

  extractIngredientName(description) {
    // Clean up USDA food descriptions to get ingredient names
    let name = description.toLowerCase()
      .replace(/,.*$/, '') // Remove everything after first comma
      .replace(/\(.*?\)/g, '') // Remove parentheses
      .replace(/\s+/g, ' ')
      .trim();

    // Remove common USDA prefixes/suffixes
    const prefixesToRemove = [
      'raw', 'cooked', 'fresh', 'frozen', 'dried', 'canned', 'organic',
      'baby food', 'infant formula', 'fast foods'
    ];

    for (const prefix of prefixesToRemove) {
      name = name.replace(new RegExp(`^${prefix}\\s+`, 'i'), '');
      name = name.replace(new RegExp(`\\s+${prefix}$`, 'i'), '');
    }

    // Capitalize first letter of each word
    return name.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();
  }

  determineVeganStatus(name, food) {
    const lowerName = name.toLowerCase();

    // Check non-vegan patterns first (more specific)
    for (const pattern of this.veganPatterns.nonVegan) {
      if (lowerName.includes(pattern)) {
        return false;
      }
    }

    // Check vegan patterns
    for (const pattern of this.veganPatterns.vegan) {
      if (lowerName.includes(pattern)) {
        return true;
      }
    }

    // Default to unknown/null for ambiguous cases
    return null;
  }

  categorizeIngredient(name) {
    const lowerName = name.toLowerCase();

    const categories = {
      vegetables: ['vegetable', 'tomato', 'potato', 'onion', 'carrot', 'pepper', 'cucumber', 'lettuce', 'spinach', 'broccoli'],
      fruits: ['fruit', 'apple', 'banana', 'orange', 'berry', 'grape', 'lemon', 'lime', 'peach', 'pear'],
      grains: ['grain', 'rice', 'wheat', 'oat', 'barley', 'bread', 'pasta', 'flour', 'cereal'],
      dairy: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'whey'],
      meat: ['beef', 'chicken', 'pork', 'turkey', 'lamb', 'meat', 'bacon', 'ham', 'sausage'],
      seafood: ['fish', 'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'cod', 'trout'],
      nuts_seeds: ['nut', 'seed', 'almond', 'walnut', 'cashew', 'peanut', 'sunflower', 'sesame'],
      herbs_spices: ['spice', 'herb', 'pepper', 'salt', 'basil', 'oregano', 'thyme', 'cumin'],
      fats_oils: ['oil', 'fat', 'olive oil', 'vegetable oil', 'coconut oil'],
      sweeteners: ['sugar', 'honey', 'syrup', 'maple', 'agave']
    };

    for (const [category, patterns] of Object.entries(categories)) {
      if (patterns.some(pattern => lowerName.includes(pattern))) {
        return category;
      }
    }

    return 'other';
  }

  getSubstitutes(name) {
    const lowerName = name.toLowerCase();
    const substitutes = {
      'milk': ['oat milk', 'almond milk', 'soy milk'],
      'butter': ['vegan butter', 'coconut oil', 'olive oil'],
      'cheese': ['nutritional yeast', 'vegan cheese', 'cashew cheese'],
      'cream': ['coconut cream', 'cashew cream', 'oat cream'],
      'egg': ['flax egg', 'chia egg', 'aquafaba'],
      'beef': ['beyond beef', 'seitan', 'mushroom crumbles'],
      'chicken': ['tofu', 'tempeh', 'cauliflower'],
      'bacon': ['tempeh bacon', 'coconut bacon', 'mushroom bacon'],
      'honey': ['maple syrup', 'agave nectar', 'brown rice syrup']
    };

    for (const [ingredient, subs] of Object.entries(substitutes)) {
      if (lowerName.includes(ingredient)) {
        return subs;
      }
    }

    return [];
  }

  getCommonUses(name, category) {
    const uses = {
      vegetables: ['salads', 'cooking', 'soups', 'stir-fry'],
      fruits: ['snacks', 'smoothies', 'desserts', 'baking'],
      grains: ['baking', 'main dishes', 'breakfast', 'side dishes'],
      herbs_spices: ['seasoning', 'flavoring', 'cooking', 'marinades'],
      nuts_seeds: ['snacking', 'baking', 'salads', 'smoothies']
    };

    return uses[category] || ['cooking', 'food preparation'];
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run if called directly
if (require.main === module) {
  const downloader = new USDADownloader();
  downloader.downloadUSDAData().catch(console.error);
}

module.exports = USDADownloader;
