#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing JSON files and combining data...');

// Files that were created by PowerShell with potential BOM issues
const sourceFiles = [
  'dairy_multi.json',
  'meat_multi.json', 
  'plant_multi.json',
  'cheese_multi.json',
  'beverage_multi.json',
  'cereal_multi.json'
];

const workingDir = process.cwd();
let allProducts = [];
let totalProducts = 0;

console.log(`Working directory: ${workingDir}`);

for (const fileName of sourceFiles) {
  const filePath = path.join(workingDir, fileName);
  
  try {
    if (fs.existsSync(filePath)) {
      console.log(`📁 Processing ${fileName}...`);
      
      // Read raw content and clean BOM
      const rawContent = fs.readFileSync(filePath, 'utf8');
      const cleanContent = rawContent.replace(/^\uFEFF/, '').trim();
      
      // Parse JSON
      const data = JSON.parse(cleanContent);
      
      if (data.products && Array.isArray(data.products)) {
        console.log(`  ✅ Found ${data.products.length} products`);
        allProducts = allProducts.concat(data.products);
        totalProducts += data.products.length;
        
        // Write back clean version
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`  🔧 Cleaned ${fileName}`);
      } else {
        console.log(`  ⚠️ Invalid data structure in ${fileName}`);
      }
    } else {
      console.log(`  ❌ File not found: ${fileName}`);
    }
  } catch (error) {
    console.log(`  ❌ Error processing ${fileName}:`, error.message);
  }
}

// Create combined file
console.log(`\n📦 Creating combined file with ${totalProducts} products...`);
const combinedData = {
  count: totalProducts,
  products: allProducts
};

fs.writeFileSync('openfoodfacts_combined.json', JSON.stringify(combinedData, null, 2), 'utf8');
console.log(`✅ Created openfoodfacts_combined.json with ${totalProducts} products`);

console.log('\n🎉 JSON files fixed and combined!');
