#!/usr/bin/env node
/**
 * Enhanced Ingredient Parser with Better Categorization
 * Fixes the "other" category problem in our current database
 */

const sqlite3 = require('sqlite3').verbose();

class EnhancedCategorizer {
  constructor() {
    this.categoryPatterns = {
      // Dairy products
      dairy: [
        'milk', 'butter', 'cheese', 'cream', 'yogurt', 'yoghurt', 
        'whey', 'casein', 'lactose', 'curd', 'kefir', 'ghee',
        'fromage', 'lait', 'beurre', 'crème', 'latte', 'panna'
      ],
      
      // Meat and poultry  
      meat: [
        'beef', 'chicken', 'pork', 'lamb', 'turkey', 'duck', 'goose',
        'bacon', 'ham', 'sausage', 'pepperoni', 'salami', 'prosciutto',
        'meat', 'poultry', 'veal', 'venison', 'bison', 'rabbit',
        'viande', 'poulet', 'boeuf', 'porc', 'carne'
      ],
      
      // Seafood
      seafood: [
        'fish', 'salmon', 'tuna', 'cod', 'shrimp', 'crab', 'lobster',
        'scallops', 'mussels', 'oysters', 'clams', 'anchovies',
        'sardines', 'mackerel', 'trout', 'bass', 'halibut',
        'poisson', 'saumon', 'thon', 'crevettes', 'pesce'
      ],
      
      // Eggs
      eggs: [
        'egg', 'eggs', 'albumin', 'mayonnaise', 'mayo', 'meringue',
        'oeuf', 'oeufs', 'uovo', 'huevo'
      ],
      
      // Vegetables
      vegetables: [
        'tomato', 'onion', 'garlic', 'carrot', 'potato', 'broccoli',
        'spinach', 'lettuce', 'cucumber', 'pepper', 'celery', 'mushroom',
        'cabbage', 'cauliflower', 'zucchini', 'eggplant', 'corn',
        'peas', 'beans', 'lentils', 'chickpeas', 'asparagus',
        'tomate', 'oignon', 'ail', 'carotte', 'pomme de terre'
      ],
      
      // Fruits
      fruits: [
        'apple', 'banana', 'orange', 'lemon', 'lime', 'strawberry',
        'blueberry', 'raspberry', 'grape', 'pineapple', 'mango',
        'peach', 'pear', 'cherry', 'plum', 'apricot', 'kiwi',
        'pomme', 'banane', 'orange', 'citron', 'fraise'
      ],
      
      // Grains and cereals
      grains: [
        'wheat', 'rice', 'oats', 'barley', 'quinoa', 'flour', 'bread',
        'pasta', 'noodles', 'cereals', 'grain', 'rye', 'buckwheat',
        'millet', 'amaranth', 'farro', 'bulgur', 'couscous',
        'blé', 'riz', 'avoine', 'farine', 'pain', 'pâtes'
      ],
      
      // Nuts and seeds
      nuts_seeds: [
        'almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'hazelnut',
        'peanut', 'sunflower', 'pumpkin', 'sesame', 'chia', 'flax',
        'hemp', 'pine nut', 'macadamia', 'Brazil nut',
        'amande', 'noix', 'cajou', 'pistache', 'noisette'
      ],
      
      // Fats and oils
      fats_oils: [
        'oil', 'olive oil', 'coconut oil', 'sunflower oil', 'canola oil',
        'vegetable oil', 'palm oil', 'avocado oil', 'sesame oil',
        'fat', 'lard', 'tallow', 'shortening', 'margarine',
        'huile', 'graisse', 'margarine', 'olio'
      ],
      
      // Sweeteners
      sweeteners: [
        'sugar', 'honey', 'syrup', 'maple syrup', 'agave', 'stevia',
        'molasses', 'brown sugar', 'cane sugar', 'fructose', 'glucose',
        'sucrose', 'aspartame', 'saccharin', 'xylitol', 'erythritol',
        'sucre', 'miel', 'sirop', 'zucchero', 'miele'
      ],
      
      // Herbs and spices
      herbs_spices: [
        'salt', 'pepper', 'basil', 'oregano', 'thyme', 'rosemary',
        'sage', 'parsley', 'cilantro', 'mint', 'dill', 'chives',
        'paprika', 'cumin', 'coriander', 'turmeric', 'ginger',
        'cinnamon', 'nutmeg', 'cloves', 'cardamom', 'saffron',
        'sel', 'poivre', 'basilic', 'origan', 'thym', 'romarin'
      ],
      
      // Beverages
      beverages: [
        'water', 'juice', 'coffee', 'tea', 'wine', 'beer', 'soda',
        'milk tea', 'coconut water', 'kombucha', 'kefir water',
        'eau', 'jus', 'café', 'thé', 'vin', 'bière'
      ],
      
      // Hidden animal products
      hidden_animal: [
        'gelatin', 'gelatine', 'rennet', 'carmine', 'shellac', 'isinglass',
        'lanolin', 'collagen', 'keratin', 'chitosan', 'tallow',
        'gélatine', 'présure', 'cochenille'
      ]
    };
  }

  categorizeIngredient(name) {
    const lowerName = name.toLowerCase().trim();
    
    // Check each category
    for (const [category, patterns] of Object.entries(this.categoryPatterns)) {
      for (const pattern of patterns) {
        if (lowerName.includes(pattern.toLowerCase())) {
          return category;
        }
      }
    }
    
    // Advanced pattern matching
    if (lowerName.includes('extract') || lowerName.includes('essence')) {
      return 'flavoring';
    }
    
    if (lowerName.includes('acid') || lowerName.includes('vitamin')) {
      return 'additive';
    }
    
    if (lowerName.includes('powder') || lowerName.includes('flour')) {
      return 'grains';
    }
    
    return 'other';
  }

  isEnglishIngredient(name) {
    // Simple heuristic: English ingredients typically use Latin alphabet only
    // and common English patterns
    const cleanName = name.toLowerCase().trim();
    
    // Skip if contains non-Latin characters
    if (/[^\x00-\x7F]/.test(cleanName)) return false;
    
    // Skip if looks like a code or ID
    if (/^[a-z0-9]+$/.test(cleanName) && cleanName.length < 4) return false;
    
    // Skip obvious non-English patterns
    const nonEnglishPatterns = [
      /de\s+/, /du\s+/, /del\s+/, /della\s+/, /von\s+/, /van\s+/,
      /\bet\s+/, /\bou\s+/, /\by\s+/, /\be\s+$/
    ];
    
    if (nonEnglishPatterns.some(pattern => pattern.test(cleanName))) {
      return false;
    }
    
    return true;
  }

  async enhanceDatabase() {
    console.log('🔧 Enhancing ingredient database...\n');
    
    const db = new sqlite3.Database('./vwap_ingredients.db');
    
    // Get all ingredients currently categorized as "other"
    const ingredients = await new Promise((resolve, reject) => {
      db.all('SELECT id, name, category FROM ingredients WHERE category = "other"', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`📊 Found ${ingredients.length} ingredients to recategorize`);
    
    let recategorized = 0;
    let filtered = 0;
    
    for (const ingredient of ingredients) {
      // Check if English
      if (!this.isEnglishIngredient(ingredient.name)) {
        // Mark non-English ingredients for potential removal
        await new Promise((resolve, reject) => {
          db.run('UPDATE ingredients SET category = "non_english" WHERE id = ?', 
            [ingredient.id], (err) => {
              if (err) reject(err);
              else resolve();
            });
        });
        filtered++;
        continue;
      }
      
      // Recategorize
      const newCategory = this.categorizeIngredient(ingredient.name);
      
      if (newCategory !== 'other') {
        await new Promise((resolve, reject) => {
          db.run('UPDATE ingredients SET category = ? WHERE id = ?', 
            [newCategory, ingredient.id], (err) => {
              if (err) reject(err);
              else resolve();
            });
        });
        recategorized++;
      }
    }
    
    console.log(`✅ Recategorized: ${recategorized} ingredients`);
    console.log(`🔍 Filtered non-English: ${filtered} ingredients`);
    
    // Show new statistics
    const stats = await new Promise((resolve, reject) => {
      db.all('SELECT category, COUNT(*) as count FROM ingredients GROUP BY category ORDER BY count DESC', 
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
    });
    
    console.log('\n📊 Updated category distribution:');
    stats.forEach(stat => {
      console.log(`  ${stat.category}: ${stat.count} ingredients`);
    });
    
    db.close();
    console.log('\n✅ Database enhancement complete!');
  }
}

// Run enhancement if called directly
if (require.main === module) {
  const enhancer = new EnhancedCategorizer();
  enhancer.enhanceDatabase().catch(console.error);
}

module.exports = EnhancedCategorizer;
