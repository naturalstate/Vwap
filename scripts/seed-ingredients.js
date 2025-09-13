/**
 * Universal Ingredient Database Seeder
 * Processes ingredient data from multiple sources and seeds the database
 * Supports: OpenFoodFacts, USDA FoodData Central, Curated lists
 */

const fs = require('fs');
const path = require('path');
const VwapDatabase = require('../src/backend-api/database.js');

class IngredientSeeder {
  constructor() {
    this.db = new VwapDatabase();
    this.stats = {
      processed: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };
  }

  /**
   * Initialize database connection
   */
  async initialize() {
    await this.db.initialize();
    console.log('✅ Database initialized');
  }

  /**
   * Process OpenFoodFacts JSON files (from your existing downloads)
   */
  async processOpenFoodFacts(filePath) {
    console.log(`🔄 Processing OpenFoodFacts file: ${path.basename(filePath)}`);
    
    try {
      const rawData = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(rawData);
      
      if (!data.products) {
        console.log('⚠️  No products found in file');
        return [];
      }

      const ingredients = [];
      
      for (const product of data.products) {
        if (!product.ingredients_text) continue;
        
        // Extract ingredients from the ingredients_text
        const ingredientTexts = product.ingredients_text
          .toLowerCase()
          .split(/[,;]/)
          .map(ing => ing.trim().replace(/^\d+\.?\s*/, '').replace(/\([^)]*\)/g, '').trim())
          .filter(ing => ing && ing.length > 2);

        for (const ingredientText of ingredientTexts) {
          // Determine vegan status based on known patterns
          const veganStatus = this.assessVeganStatus(ingredientText);
          const category = this.categorizeIngredient(ingredientText);
          
          ingredients.push({
            name: ingredientText,
            vegan: veganStatus.vegan,
            category: category,
            confidence: veganStatus.confidence,
            source: 'openfoodfacts',
            substitutes: [],
            common_uses: []
          });
        }
      }

      console.log(`  📊 Extracted ${ingredients.length} ingredients from OpenFoodFacts`);
      return ingredients;
      
    } catch (error) {
      console.error(`❌ Error processing OpenFoodFacts file ${filePath}:`, error.message);
      return [];
    }
  }

  /**
   * Process USDA FoodData Central JSON files
   */
  async processUSDA(filePath) {
    console.log(`🔄 Processing USDA file: ${path.basename(filePath)}`);
    
    try {
      const rawData = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(rawData);
      
      // USDA data should already be processed into ingredient format
      const ingredients = Array.isArray(data) ? data : [data];
      
      console.log(`  📊 Found ${ingredients.length} ingredients from USDA`);
      return ingredients.map(ingredient => ({
        name: ingredient.name.toLowerCase(),
        vegan: ingredient.vegan,
        category: ingredient.category,
        confidence: ingredient.confidence || 0.8,
        source: 'usda',
        substitutes: ingredient.substitutes || [],
        common_uses: ingredient.common_uses || []
      }));
      
    } catch (error) {
      console.error(`❌ Error processing USDA file ${filePath}:`, error.message);
      return [];
    }
  }

  /**
   * Process curated ingredient lists (like your USDA curated list)
   */
  async processCurated(filePath) {
    console.log(`🔄 Processing curated file: ${path.basename(filePath)}`);
    
    try {
      const rawData = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(rawData);
      
      const ingredients = Array.isArray(data) ? data : [data];
      
      console.log(`  📊 Found ${ingredients.length} curated ingredients`);
      return ingredients.map(ingredient => ({
        name: ingredient.name.toLowerCase(),
        vegan: ingredient.vegan,
        category: ingredient.category,
        confidence: ingredient.confidence || 1.0,
        source: ingredient.source || 'curated',
        substitutes: ingredient.substitutes || [],
        common_uses: ingredient.common_uses || []
      }));
      
    } catch (error) {
      console.error(`❌ Error processing curated file ${filePath}:`, error.message);
      return [];
    }
  }

  /**
   * Assess vegan status of an ingredient based on name
   */
  assessVeganStatus(ingredientName) {
    const nonVeganKeywords = [
      'milk', 'cheese', 'butter', 'cream', 'yogurt', 'whey', 'casein', 'lactose',
      'egg', 'gelatin', 'honey', 'beef', 'chicken', 'pork', 'fish', 'seafood',
      'meat', 'lard', 'tallow', 'bone', 'blood', 'organ', 'liver', 'bacon'
    ];

    const veganKeywords = [
      'vegetable', 'fruit', 'grain', 'bean', 'pea', 'lentil', 'rice', 'wheat',
      'corn', 'oat', 'barley', 'quinoa', 'chia', 'flax', 'hemp', 'coconut',
      'almond', 'soy', 'tofu', 'tempeh', 'nutritional yeast', 'agave', 'maple'
    ];

    const lowerName = ingredientName.toLowerCase();

    // Check for non-vegan keywords
    for (const keyword of nonVeganKeywords) {
      if (lowerName.includes(keyword)) {
        return { vegan: false, confidence: 0.9 };
      }
    }

    // Check for vegan keywords
    for (const keyword of veganKeywords) {
      if (lowerName.includes(keyword)) {
        return { vegan: true, confidence: 0.8 };
      }
    }

    // Default to non-vegan for safety (can be manually reviewed)
    return { vegan: false, confidence: 0.3 };
  }

  /**
   * Categorize ingredient based on name
   */
  categorizeIngredient(ingredientName) {
    const categories = {
      'vegetables': ['vegetable', 'carrot', 'broccoli', 'spinach', 'kale', 'tomato', 'pepper', 'onion', 'garlic', 'lettuce'],
      'fruits': ['fruit', 'apple', 'banana', 'orange', 'berry', 'grape', 'lemon', 'lime', 'peach', 'strawberry'],
      'grains': ['wheat', 'rice', 'oat', 'barley', 'quinoa', 'corn', 'grain', 'flour', 'bread', 'pasta'],
      'legumes': ['bean', 'pea', 'lentil', 'chickpea', 'soy', 'tofu', 'tempeh', 'legume', 'pinto', 'navy'],
      'nuts_seeds': ['nut', 'seed', 'almond', 'walnut', 'cashew', 'peanut', 'sunflower', 'chia', 'flax', 'sesame'],
      'dairy': ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'dairy', 'whey', 'casein', 'lactose'],
      'meat': ['meat', 'beef', 'chicken', 'pork', 'fish', 'seafood', 'poultry', 'turkey', 'lamb'],
      'spices': ['spice', 'herb', 'salt', 'pepper', 'cumin', 'paprika', 'oregano', 'basil', 'thyme', 'rosemary'],
      'oils_fats': ['oil', 'fat', 'coconut oil', 'olive oil', 'vegetable oil', 'margarine', 'shortening']
    };

    const lowerName = ingredientName.toLowerCase();

    for (const [category, keywords] of Object.entries(categories)) {
      for (const keyword of keywords) {
        if (lowerName.includes(keyword)) {
          return category;
        }
      }
    }

    return 'other';
  }

  /**
   * Deduplicate ingredients, preferring higher confidence sources
   */
  deduplicateIngredients(ingredients) {
    const ingredientMap = new Map();

    for (const ingredient of ingredients) {
      const key = ingredient.name.toLowerCase().trim();
      
      if (ingredientMap.has(key)) {
        const existing = ingredientMap.get(key);
        
        // Prefer higher confidence or better source
        const sourceOrder = { 'curated': 3, 'usda': 2, 'openfoodfacts': 1, 'manual': 1 };
        const existingScore = (existing.confidence || 0) * (sourceOrder[existing.source] || 1);
        const newScore = (ingredient.confidence || 0) * (sourceOrder[ingredient.source] || 1);
        
        if (newScore > existingScore) {
          ingredientMap.set(key, ingredient);
        }
      } else {
        ingredientMap.set(key, ingredient);
      }
    }

    return Array.from(ingredientMap.values());
  }

  /**
   * Seed ingredients into database
   */
  async seedIngredients(ingredients) {
    console.log(`\n🌱 Seeding ${ingredients.length} ingredients into database...`);
    
    const chunkSize = 100;
    for (let i = 0; i < ingredients.length; i += chunkSize) {
      const chunk = ingredients.slice(i, i + chunkSize);
      
      try {
        const result = await this.db.bulkInsertIngredients(chunk);
        this.stats.inserted += result.inserted;
        this.stats.errors += result.errors;
        
        console.log(`  ✅ Processed batch ${Math.floor(i / chunkSize) + 1}/${Math.ceil(ingredients.length / chunkSize)} - Inserted: ${result.inserted}, Errors: ${result.errors}`);
        
        if (result.errorDetails && result.errorDetails.length > 0) {
          console.log(`    ⚠️  Errors in batch:`, result.errorDetails.slice(0, 3));
        }
      } catch (error) {
        console.error(`❌ Error seeding batch ${Math.floor(i / chunkSize) + 1}:`, error.message);
        this.stats.errors += chunk.length;
      }
    }
  }

  /**
   * Process multiple files from a directory
   */
  async processDirectory(directory, sourceType = 'auto') {
    console.log(`\n📂 Processing directory: ${directory}`);
    
    if (!fs.existsSync(directory)) {
      console.log(`⚠️  Directory not found: ${directory}`);
      return [];
    }

    const files = fs.readdirSync(directory).filter(file => file.endsWith('.json'));
    console.log(`  📄 Found ${files.length} JSON files`);

    let allIngredients = [];

    for (const file of files) {
      const filePath = path.join(directory, file);
      
      try {
        let ingredients = [];
        
        // Determine source type from filename or use parameter
        if (sourceType === 'auto') {
          if (file.includes('usda')) {
            ingredients = await this.processUSDA(filePath);
          } else if (file.includes('curated') || file.includes('manual')) {
            ingredients = await this.processCurated(filePath);
          } else {
            ingredients = await this.processOpenFoodFacts(filePath);
          }
        } else if (sourceType === 'usda') {
          ingredients = await this.processUSDA(filePath);
        } else if (sourceType === 'curated') {
          ingredients = await this.processCurated(filePath);
        } else {
          ingredients = await this.processOpenFoodFacts(filePath);
        }

        allIngredients = allIngredients.concat(ingredients);
        this.stats.processed += ingredients.length;
        
      } catch (error) {
        console.error(`❌ Error processing file ${file}:`, error.message);
      }
    }

    return allIngredients;
  }

  /**
   * Run the complete seeding process
   */
  async run(options = {}) {
    const {
      sources = ['./'],
      sourceTypes = ['auto'],
      deduplicate = true,
      verbose = false
    } = options;

    console.log('🌱 Starting ingredient database seeding...');
    console.log('=====================================');

    try {
      await this.initialize();

      let allIngredients = [];

      // Process each source
      for (let i = 0; i < sources.length; i++) {
        const source = sources[i];
        const sourceType = sourceTypes[i] || sourceTypes[0] || 'auto';
        
        if (fs.statSync(source).isDirectory()) {
          const ingredients = await this.processDirectory(source, sourceType);
          allIngredients = allIngredients.concat(ingredients);
        } else if (source.endsWith('.json')) {
          // Single file processing
          let ingredients = [];
          if (sourceType === 'usda') {
            ingredients = await this.processUSDA(source);
          } else if (sourceType === 'curated') {
            ingredients = await this.processCurated(source);
          } else {
            ingredients = await this.processOpenFoodFacts(source);
          }
          allIngredients = allIngredients.concat(ingredients);
        }
      }

      console.log(`\n📊 Total ingredients collected: ${allIngredients.length}`);

      // Deduplicate if requested
      if (deduplicate) {
        console.log('🔄 Deduplicating ingredients...');
        const originalCount = allIngredients.length;
        allIngredients = this.deduplicateIngredients(allIngredients);
        console.log(`  ✅ Deduplicated: ${originalCount} → ${allIngredients.length} (removed ${originalCount - allIngredients.length} duplicates)`);
      }

      // Seed the database
      if (allIngredients.length > 0) {
        await this.seedIngredients(allIngredients);
      }

      // Final statistics
      console.log('\n✅ Seeding complete!');
      console.log('==================');
      console.log(`📊 Statistics:`);
      console.log(`   Processed: ${this.stats.processed} ingredients`);
      console.log(`   Inserted: ${this.stats.inserted} ingredients`);
      console.log(`   Errors: ${this.stats.errors}`);
      
      // Get database stats
      const dbStats = await this.db.getStats();
      console.log(`\n📋 Database totals:`);
      console.log(`   Total ingredients: ${dbStats.total}`);
      console.log(`   Vegan: ${dbStats.vegan}`);
      console.log(`   Non-vegan: ${dbStats.non_vegan}`);
      console.log(`   Categories: ${dbStats.categories}`);
      console.log(`   Sources: ${dbStats.sources}`);

    } catch (error) {
      console.error('❌ Fatal error during seeding:', error);
    } finally {
      this.db.close();
    }
  }

  /**
   * Close database connection
   */
  async close() {
    this.db.close();
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  const options = {
    sources: ['./'],
    sourceTypes: ['auto'],
    deduplicate: true,
    verbose: args.includes('--verbose') || args.includes('-v')
  };

  // Parse command line arguments
  const sourceIndex = args.findIndex(arg => arg === '--source' || arg === '-s');
  if (sourceIndex !== -1 && args[sourceIndex + 1]) {
    options.sources = [args[sourceIndex + 1]];
  }

  const typeIndex = args.findIndex(arg => arg === '--type' || arg === '-t');
  if (typeIndex !== -1 && args[typeIndex + 1]) {
    options.sourceTypes = [args[typeIndex + 1]];
  }

  if (args.includes('--no-dedupe')) {
    options.deduplicate = false;
  }

  console.log('🚀 Running ingredient seeder with options:', options);
  
  const seeder = new IngredientSeeder();
  seeder.run(options);
}

module.exports = IngredientSeeder;
