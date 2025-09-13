/**
 * Vwap Backend API Server
 * Express server with ingredient database and recipe veganization
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');

const VwapDatabase = require('./database');
const IngredientParser = require('./ingredient-parser');
const RecipeVeganizer = require('./recipe-veganizer');

class VwapServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3001;
    this.database = new VwapDatabase();
    this.parser = new IngredientParser();
    this.veganizer = null; // Will be initialized after database
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // Security and performance middleware
    this.app.use(helmet());
    this.app.use(compression());
    
    // CORS configuration - allow all origins for development
    this.app.use(cors({
      origin: '*', // Allow all origins for development
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    
    // Body parsing
    this.app.use(bodyParser.json({ limit: '10mb' }));
    this.app.use(bodyParser.urlencoded({ extended: true }));
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Setup API routes
   */
  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        message: 'Vwap Backend API is running',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
    });

    // Main veganize endpoint
    this.app.post('/api/veganize', async (req, res) => {
      try {
        const { recipe } = req.body;
        
        if (!recipe || typeof recipe !== 'string') {
          return res.status(400).json({
            error: 'Recipe text is required',
            message: 'Please provide a recipe as a string in the request body'
          });
        }

        if (!this.veganizer) {
          return res.status(500).json({
            error: 'Veganizer not initialized',
            message: 'Recipe veganization service is starting up'
          });
        }

        const result = await this.veganizer.veganizeRecipe(recipe);
        
        res.json({
          success: true,
          original_recipe: recipe,
          veganized_recipe: result.veganizedRecipe,
          substitutions: result.substitutions,
          stats: {
            original_length: recipe.length,
            veganized_length: result.veganizedRecipe.length,
            substitutions_made: result.substitutions.length,
            processing_time_ms: result.processingTime
          }
        });
        
      } catch (error) {
        console.error('❌ Error veganizing recipe:', error);
        res.status(500).json({
          error: 'Recipe processing failed',
          message: error.message,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
    });

    // Get ingredients with pagination and filters (for admin interface)
    this.app.get('/api/ingredients', async (req, res) => {
      try {
        const {
          page = 1,
          limit = 50,
          category = null,
          vegan = null,
          search = null
        } = req.query;

        const options = {
          page: parseInt(page),
          limit: Math.min(parseInt(limit), 100), // Max 100 per page
          category,
          vegan: vegan === 'true' ? true : vegan === 'false' ? false : null,
          search
        };

        const result = await this.database.getIngredients(options);
        
        res.json({
          success: true,
          ...result
        });
        
      } catch (error) {
        console.error('❌ Error fetching ingredients:', error);
        res.status(500).json({
          error: 'Failed to fetch ingredients',
          message: error.message
        });
      }
    });

    // Search ingredients by name
    this.app.get('/api/ingredients/search/:term', async (req, res) => {
      try {
        const { term } = req.params;
        const { limit = 10 } = req.query;
        
        const ingredients = await this.database.searchIngredients(term, parseInt(limit));
        
        res.json({
          success: true,
          query: term,
          results: ingredients.length,
          ingredients
        });
        
      } catch (error) {
        console.error('❌ Error searching ingredients:', error);
        res.status(500).json({
          error: 'Ingredient search failed',
          message: error.message
        });
      }
    });

    // Get all ingredients (for ingredient browser - no pagination limit)
    this.app.get('/api/ingredients/all', async (req, res) => {
      try {
        const {
          category = null,
          vegan = null,
          search = null
        } = req.query;

        const options = {
          page: 1,
          limit: 10000, // High limit for ingredient browser
          category,
          vegan: vegan === 'true' ? true : vegan === 'false' ? false : null,
          search
        };

        const result = await this.database.getIngredients(options);
        
        res.json({
          success: true,
          ingredients: result.ingredients,
          total: result.total
        });
        
      } catch (error) {
        console.error('❌ Error fetching all ingredients:', error);
        res.status(500).json({
          error: 'Failed to fetch all ingredients',
          message: error.message
        });
      }
    });

    // Get database statistics
    this.app.get('/api/stats', async (req, res) => {
      try {
        const stats = await this.database.getStats();
        
        res.json({
          success: true,
          database_stats: stats,
          server_info: {
            uptime: process.uptime(),
            memory_usage: process.memoryUsage(),
            node_version: process.version
          }
        });
        
      } catch (error) {
        console.error('❌ Error fetching stats:', error);
        res.status(500).json({
          error: 'Failed to fetch statistics',
          message: error.message
        });
      }
    });

    // Add new ingredient (admin only - could add auth later)
    this.app.post('/api/ingredients', async (req, res) => {
      try {
        const ingredient = req.body;
        
        // Basic validation
        if (!ingredient.name || typeof ingredient.vegan !== 'boolean' || !ingredient.category) {
          return res.status(400).json({
            error: 'Invalid ingredient data',
            message: 'Name, vegan status, and category are required'
          });
        }

        const result = await this.database.addIngredient(ingredient);
        
        res.json({
          success: true,
          message: 'Ingredient added successfully',
          ingredient_id: result.id
        });
        
      } catch (error) {
        console.error('❌ Error adding ingredient:', error);
        res.status(500).json({
          error: 'Failed to add ingredient',
          message: error.message
        });
      }
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        message: `${req.method} ${req.originalUrl} is not a valid API endpoint`,
        available_endpoints: [
          'POST /api/veganize',
          'GET /api/ingredients',
          'GET /api/ingredients/search/:term',
          'GET /api/stats',
          'POST /api/ingredients',
          'GET /health'
        ]
      });
    });

    // Error handler
    this.app.use((err, req, res, next) => {
      console.error('❌ Server error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: err.message,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    });
  }

  /**
   * Initialize database and start server
   */
  async start() {
    try {
      console.log('🌱 Starting Vwap Backend API...');
      
      // Initialize database
      await this.database.initialize();
      
      // Check if database needs seeding
      const stats = await this.database.getStats();
      console.log(`📊 Database contains ${stats.total} ingredients (${stats.vegan} vegan, ${stats.non_vegan} non-vegan)`);
      
      if (stats.total === 0) {
        console.log('🌱 Database is empty, consider running: npm run seed');
      }
      
      // Initialize recipe veganizer
      this.veganizer = new RecipeVeganizer(this.database);
      
      // Start server
      this.app.listen(this.port, () => {
        console.log('🚀 Vwap Backend API server started!');
        console.log(`📡 Server: http://localhost:${this.port}`);
        console.log(`🏥 Health: http://localhost:${this.port}/health`);
        console.log(`📊 Stats: http://localhost:${this.port}/api/stats`);
        console.log(`🔍 API: http://localhost:${this.port}/api/veganize`);
        console.log(`👨‍💻 Environment: ${process.env.NODE_ENV || 'development'}`);
      });
      
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  async stop() {
    console.log('🛑 Shutting down Vwap Backend API...');
    this.database.close();
  }
}

// Handle graceful shutdown
const server = new VwapServer();

process.on('SIGTERM', () => server.stop());
process.on('SIGINT', () => server.stop());

// Start server
server.start();
