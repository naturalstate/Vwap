#!/usr/bin/env node
/**
 * Vwap Database Seeding Script
 * Populates the ingredient database from OpenFoodFacts and existing data
 */

const path = require('path');
const VwapDatabase = require('../database');
const IngredientParser = require('../ingredient-parser');

class DatabaseSeeder {
  constructor() {
    this.database = new VwapDatabase();
    this.parser = new IngredientParser();
  }

  async run() {
    console.log('🌱 Starting Vwap Database Seeding...\n');
    
    try {
      // Initialize database
      await this.database.initialize();
      
      // Check current state
      const initialStats = await this.database.getStats();
      console.log(`📊 Current database: ${initialStats.total} ingredients\n`);
      
      // Load existing curated ingredients first (highest priority)
      await this.seedFromExistingDatabase();
      
      // Load OpenFoodFacts ingredients (lower priority)
      await this.seedFromOpenFoodFacts();
      
      // Show final statistics
      const finalStats = await this.database.getStats();
      console.log('\n📈 Final Database Statistics:');
      console.log(`  Total ingredients: ${finalStats.total}`);
      console.log(`  Vegan ingredients: ${finalStats.vegan}`);
      console.log(`  Non-vegan ingredients: ${finalStats.non_vegan}`);
      console.log(`  Categories: ${finalStats.categories}`);
      console.log(`  Sources: ${finalStats.sources}`);
      
      console.log('\n✅ Database seeding completed successfully!');
      
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      process.exit(1);
    } finally {
      this.database.close();
    }
  }

  async seedFromExistingDatabase() {
    console.log('📚 Loading curated ingredients from existing database...');
    
    try {
      const existingDbPath = path.join(__dirname, '../../../frontend/ingredient_database.json');
      const curatedIngredients = await this.parser.parseExistingDatabase(existingDbPath);
      
      if (curatedIngredients.length > 0) {
        const result = await this.database.bulkInsertIngredients(curatedIngredients);
        console.log(`✅ Inserted ${result.inserted} curated ingredients`);
        
        if (result.errors > 0) {
          console.log(`⚠️  ${result.errors} insertion errors`);
          if (process.env.DEBUG === 'true') {
            console.log('Error details:', result.errorDetails.slice(0, 5));
          }
        }
      }
      
    } catch (error) {
      console.log('⚠️  Could not load existing database:', error.message);
      console.log('   This is normal if the file doesn\'t exist yet');
    }
  }

  async seedFromOpenFoodFacts() {
    console.log('\n🥫 Processing OpenFoodFacts data...');
    
    // List of all our downloaded JSON files
    const openFoodFactsFiles = [
      'openfoodfacts_combined.json', // Our combined 5000 products file
      'openfoodfacts_sample.json' // Keep the original as fallback
    ];
    
    let allExtractedIngredients = [];
    let totalProductsProcessed = 0;
    
    for (const fileName of openFoodFactsFiles) {
      try {
        const filePath = path.join(__dirname, '../../../', fileName);
        
        // Check if file exists
        if (!require('fs').existsSync(filePath)) {
          console.log(`⏭️  Skipping ${fileName} (file not found)`);
          continue;
        }
        
        console.log(`📁 Processing ${fileName}...`);
        const extractedIngredients = await this.parser.parseOpenFoodFacts(filePath);
        
        if (extractedIngredients.length > 0) {
          allExtractedIngredients = allExtractedIngredients.concat(extractedIngredients);
          totalProductsProcessed += extractedIngredients.length;
          console.log(`   ✅ Extracted ${extractedIngredients.length} ingredients`);
        } else {
          console.log(`   ⚠️  No ingredients found in ${fileName}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error processing ${fileName}:`, error.message);
      }
    }
    
    console.log(`\n📊 Total ingredients extracted from all files: ${allExtractedIngredients.length}`);
    
    if (allExtractedIngredients.length > 0) {
      // Remove duplicates by name (keep highest confidence)
      const uniqueIngredients = new Map();
      for (const ingredient of allExtractedIngredients) {
        const key = ingredient.name;
        if (!uniqueIngredients.has(key) || uniqueIngredients.get(key).confidence < ingredient.confidence) {
          uniqueIngredients.set(key, ingredient);
        }
      }
      
      const deduplicatedIngredients = Array.from(uniqueIngredients.values());
      console.log(`🔍 After deduplication: ${deduplicatedIngredients.length} unique ingredients`);
      
      // Filter out ingredients with very low confidence
      const qualityIngredients = deduplicatedIngredients.filter(ing => 
        ing.confidence >= 0.3 && 
        ing.name.length >= 3 &&
        ing.name.length <= 50 // Increased limit for compound ingredient names
      );
      
      console.log(`🔍 After quality filtering: ${qualityIngredients.length} high-quality ingredients`);
      
      if (qualityIngredients.length > 0) {
        // Insert in batches to avoid memory issues
        const batchSize = 500; // Smaller batches for stability
        let totalInserted = 0;
        let totalErrors = 0;
        
        for (let i = 0; i < qualityIngredients.length; i += batchSize) {
          const batch = qualityIngredients.slice(i, i + batchSize);
          const result = await this.database.bulkInsertIngredients(batch);
          
          totalInserted += result.inserted;
          totalErrors += result.errors;
          
          console.log(`  📦 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(qualityIngredients.length / batchSize)}: ${result.inserted} inserted, ${result.errors} errors`);
          
          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`✅ Total OpenFoodFacts: ${totalInserted} inserted, ${totalErrors} errors`);
      }
    } else {
      console.log('⚠️  No OpenFoodFacts data found. Make sure to download the data files first.');
    }
  }

  async downloadMoreData() {
    console.log('\n🌐 Would you like to download more OpenFoodFacts data? (This is optional)');
    console.log('   You can run additional downloads to expand the database:');
    console.log('   curl "https://world.openfoodfacts.org/cgi/search.pl?action=process&tagtype_0=categories&tag_contains_0=contains&tag_0=dairy&json=1&page_size=5000" > dairy_products.json');
    console.log('   curl "https://world.openfoodfacts.org/cgi/search.pl?action=process&tagtype_0=categories&tag_contains_0=contains&tag_0=meat&json=1&page_size=5000" > meat_products.json');
  }
}

// Run seeder if called directly
if (require.main === module) {
  const seeder = new DatabaseSeeder();
  seeder.run();
}

module.exports = DatabaseSeeder;
