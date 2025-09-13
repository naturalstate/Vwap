const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./src/backend-api/vwap_ingredients.db');

console.log('🔍 Analyzing current OpenFoodFacts data quality...\n');

// Category analysis
db.all('SELECT category, COUNT(*) as count FROM ingredients GROUP BY category ORDER BY count DESC', (err, categories) => {
  if (err) {
    console.error('Error getting categories:', err);
    return;
  }
  console.log('📊 Current ingredient categories:');
  categories.forEach(cat => console.log(`  ${cat.category}: ${cat.count} ingredients`));
});

// Substitutes analysis
db.all('SELECT COUNT(*) as with_substitutes FROM ingredients WHERE substitutes IS NOT NULL AND substitutes != "[]"', (err, subs) => {
  if (err) {
    console.error('Error getting substitutes:', err);
    return;
  }
  console.log(`\n🔄 Ingredients with substitutes: ${subs[0].with_substitutes}`);
});

// Sources analysis  
db.all('SELECT source, COUNT(*) as count FROM ingredients GROUP BY source', (err, sources) => {
  if (err) {
    console.error('Error getting sources:', err);
    return;
  }
  console.log('\n📋 Data sources:');
  sources.forEach(src => console.log(`  ${src.source}: ${src.count} ingredients`));
});

// Sample some ingredients to see quality
db.all('SELECT name, vegan, category, confidence, substitutes FROM ingredients WHERE confidence > 0.7 LIMIT 10', (err, samples) => {
  if (err) {
    console.error('Error getting samples:', err);
    return;
  }
  console.log('\n🎯 Sample high-confidence ingredients:');
  samples.forEach(ing => {
    const subs = ing.substitutes ? JSON.parse(ing.substitutes).length : 0;
    console.log(`  ${ing.name} | ${ing.vegan ? 'Vegan' : 'Non-vegan'} | ${ing.category} | ${subs} substitutes`);
  });
});

// Confidence distribution
db.all('SELECT ROUND(confidence, 1) as conf_level, COUNT(*) as count FROM ingredients GROUP BY ROUND(confidence, 1) ORDER BY conf_level DESC', (err, confidence) => {
  if (err) {
    console.error('Error getting confidence:', err);
    return;
  }
  console.log('\n📈 Confidence score distribution:');
  confidence.forEach(c => console.log(`  ${c.conf_level}: ${c.count} ingredients`));
  
  db.close();
});
