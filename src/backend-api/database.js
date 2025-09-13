/**
 * Vwap Database Management
 * SQLite database setup and ingredient CRUD operations
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class VwapDatabase {
  constructor(dbPath = './vwap_ingredients.db') {
    this.dbPath = dbPath;
    this.db = null;
  }

  /**
   * Initialize database connection and create tables
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          reject(err);
        } else {
          console.log('📊 Connected to SQLite database:', this.dbPath);
          this.createTables()
            .then(resolve)
            .catch(reject);
        }
      });
    });
  }

  /**
   * Create ingredients table with proper indexing
   */
  createTables() {
    return new Promise((resolve, reject) => {
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS ingredients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          vegan BOOLEAN NOT NULL,
          category TEXT NOT NULL,
          substitutes TEXT, -- JSON array of substitutes
          common_uses TEXT, -- JSON array of common uses
          source TEXT DEFAULT 'manual', -- 'manual', 'openfoodfacts', 'curated'
          confidence REAL DEFAULT 1.0, -- confidence score 0-1
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `;

      const createIndexes = `
        CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);
        CREATE INDEX IF NOT EXISTS idx_ingredients_vegan ON ingredients(vegan);
        CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category);
        CREATE INDEX IF NOT EXISTS idx_ingredients_source ON ingredients(source);
      `;

      // Create table
      this.db.run(createTableSQL, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('✅ Ingredients table created/verified');
          
          // Create indexes
          this.db.exec(createIndexes, (err) => {
            if (err) {
              reject(err);
            } else {
              console.log('✅ Database indexes created/verified');
              resolve();
            }
          });
        }
      });
    });
  }

  /**
   * Add single ingredient to database
   */
  async addIngredient(ingredient) {
    return new Promise((resolve, reject) => {
      const { name, vegan, category, substitutes = [], common_uses = [], source = 'manual', confidence = 1.0 } = ingredient;
      
      const sql = `
        INSERT OR REPLACE INTO ingredients 
        (name, vegan, category, substitutes, common_uses, source, confidence, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;
      
      const params = [
        name.toLowerCase(),
        vegan,
        category,
        JSON.stringify(substitutes),
        JSON.stringify(common_uses),
        source,
        confidence
      ];

      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Bulk insert ingredients (more efficient for large datasets)
   */
  async bulkInsertIngredients(ingredients) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO ingredients 
        (name, vegan, category, substitutes, common_uses, source, confidence, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      this.db.serialize(() => {
        const stmt = this.db.prepare(sql);
        let successCount = 0;
        let errors = [];

        ingredients.forEach((ingredient, index) => {
          const { name, vegan, category, substitutes = [], common_uses = [], source = 'openfoodfacts', confidence = 0.8 } = ingredient;
          
          const params = [
            name.toLowerCase(),
            vegan,
            category,
            JSON.stringify(substitutes),
            JSON.stringify(common_uses),
            source,
            confidence
          ];

          stmt.run(params, function(err) {
            if (err) {
              errors.push({ index, ingredient: name, error: err.message });
            } else {
              successCount++;
            }
          });
        });

        stmt.finalize((err) => {
          if (err) {
            reject(err);
          } else {
            resolve({ 
              inserted: successCount, 
              errors: errors.length, 
              errorDetails: errors 
            });
          }
        });
      });
    });
  }

  /**
   * Search ingredients by name (for recipe parsing)
   */
  async searchIngredients(searchTerm, limit = 10) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM ingredients 
        WHERE name LIKE ? OR name LIKE ? OR name LIKE ?
        ORDER BY confidence DESC, name ASC
        LIMIT ?
      `;
      
      const term = searchTerm.toLowerCase();
      const params = [`${term}%`, `%${term}%`, `%${term.replace(/s$/, '')}%`, limit];

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const ingredients = rows.map(row => ({
            ...row,
            substitutes: JSON.parse(row.substitutes || '[]'),
            common_uses: JSON.parse(row.common_uses || '[]')
          }));
          resolve(ingredients);
        }
      });
    });
  }

  /**
   * Get ingredients with pagination (for admin interface)
   */
  async getIngredients(options = {}) {
    const { 
      page = 1, 
      limit = 50, 
      category = null, 
      vegan = null, 
      search = null 
    } = options;

    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM ingredients WHERE 1=1';
      let countSQL = 'SELECT COUNT(*) as total FROM ingredients WHERE 1=1';
      let params = [];

      // Add filters
      if (category) {
        sql += ' AND category = ?';
        countSQL += ' AND category = ?';
        params.push(category);
      }

      if (vegan !== null) {
        sql += ' AND vegan = ?';
        countSQL += ' AND vegan = ?';
        params.push(vegan);
      }

      if (search) {
        sql += ' AND name LIKE ?';
        countSQL += ' AND name LIKE ?';
        params.push(`%${search.toLowerCase()}%`);
      }

      // Add pagination
      const offset = (page - 1) * limit;
      sql += ' ORDER BY name ASC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      // Get total count first
      this.db.get(countSQL, params.slice(0, -2), (err, countRow) => {
        if (err) {
          reject(err);
          return;
        }

        // Get paginated results
        this.db.all(sql, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            const ingredients = rows.map(row => ({
              ...row,
              substitutes: JSON.parse(row.substitutes || '[]'),
              common_uses: JSON.parse(row.common_uses || '[]')
            }));

            resolve({
              ingredients,
              pagination: {
                page,
                limit,
                total: countRow.total,
                totalPages: Math.ceil(countRow.total / limit)
              }
            });
          }
        });
      });
    });
  }

  /**
   * Get database statistics
   */
  async getStats() {
    return new Promise((resolve, reject) => {
      const statsSQL = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN vegan = 1 THEN 1 ELSE 0 END) as vegan,
          SUM(CASE WHEN vegan = 0 THEN 1 ELSE 0 END) as non_vegan,
          COUNT(DISTINCT category) as categories,
          COUNT(DISTINCT source) as sources
        FROM ingredients
      `;

      this.db.get(statsSQL, (err, stats) => {
        if (err) {
          reject(err);
        } else {
          resolve(stats);
        }
      });
    });
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('📊 Database connection closed');
        }
      });
    }
  }
}

module.exports = VwapDatabase;
