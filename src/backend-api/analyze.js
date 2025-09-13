const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./vwap_ingredients.db');

console.log('🔍 Current OpenFoodFacts Database Analysis:\n');

// Basic stats
db.get('SELECT COUNT(*) as total, COUNT(CASE WHEN vegan = 1 THEN 1 END) as vegan_count, COUNT(CASE WHEN vegan = 0 THEN 1 END) as non_vegan FROM ingredients', (err, stats) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log('📊 Basic Statistics:');
  console.log(`  Total ingredients: ${stats.total}`);
  console.log(`  Vegan ingredients: ${stats.vegan_count}`);
  console.log(`  Non-vegan ingredients: ${stats.non_vegan}`);
});

// Category breakdown  
db.all('SELECT category, COUNT(*) as count FROM ingredients GROUP BY category ORDER BY count DESC', (err, categories) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log('\n📋 Categories:');
  categories.forEach(cat => console.log(`  ${cat.category}: ${cat.count} ingredients`));
});

// Sample ingredients
db.all('SELECT name, vegan, category FROM ingredients ORDER BY RANDOM() LIMIT 10', (err, samples) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log('\n🎲 Random sample:');
  samples.forEach(ing => {
    console.log(`  ${ing.name} (${ing.vegan ? 'vegan' : 'non-vegan'}) - ${ing.category}`);
  });
  
  db.close();
});
