/**
 * API Service for Vegan Recipe Swap Frontend
 * Handles all communication with the backend API server
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Generic API request handler with error handling
   */
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        // Try to get error details from response
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        throw new Error(errorData.message || errorData.error || 'API request failed');
      }

      return await response.json();
    } catch (error) {
      // Handle network errors, timeouts, etc.
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Unable to connect to the recipe server. Please ensure the backend is running.');
      }
      throw error;
    }
  }

  /**
   * Veganize a recipe using the backend API
   * @param {string} recipe - The original recipe text
   * @returns {Promise<Object>} - The veganized recipe with substitutions
   */
  async veganizeRecipe(recipe) {
    if (!recipe || typeof recipe !== 'string') {
      throw new Error('Recipe text is required');
    }

    const response = await this.makeRequest('/api/veganize', {
      method: 'POST',
      body: JSON.stringify({ recipe }),
    });

    return {
      success: response.success,
      originalRecipe: response.original_recipe,
      veganizedRecipe: response.veganized_recipe,
      substitutions: response.substitutions || [],
      stats: response.stats || {},
    };
  }

  /**
   * Get ingredients with pagination and filters
   * @param {Object} options - Query options (page, limit, category, etc.)
   * @returns {Promise<Object>} - Paginated ingredients list
   */
  async getIngredients(options = {}) {
    const queryParams = new URLSearchParams();
    
    if (options.page) queryParams.append('page', options.page);
    if (options.limit) queryParams.append('limit', options.limit);
    if (options.category) queryParams.append('category', options.category);
    if (options.vegan !== undefined) queryParams.append('vegan', options.vegan);
    if (options.search) queryParams.append('search', options.search);

    const endpoint = `/api/ingredients${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await this.makeRequest(endpoint);
  }

  /**
   * Search ingredients by name
   * @param {string} term - Search term
   * @param {number} limit - Maximum results to return
   * @returns {Promise<Object>} - Search results
   */
  async searchIngredients(term, limit = 10) {
    if (!term) {
      throw new Error('Search term is required');
    }

    const endpoint = `/api/ingredients/search/${encodeURIComponent(term)}?limit=${limit}`;
    return await this.makeRequest(endpoint);
  }

  /**
   * Get database statistics
   * @returns {Promise<Object>} - Database and server stats
   */
  async getStats() {
    return await this.makeRequest('/api/stats');
  }

  /**
   * Add a new ingredient (admin function)
   * @param {Object} ingredient - Ingredient data
   * @returns {Promise<Object>} - Success response
   */
  async addIngredient(ingredient) {
    if (!ingredient || !ingredient.name || typeof ingredient.vegan !== 'boolean' || !ingredient.category) {
      throw new Error('Invalid ingredient data. Name, vegan status, and category are required.');
    }

    return await this.makeRequest('/api/ingredients', {
      method: 'POST',
      body: JSON.stringify(ingredient),
    });
  }

  /**
   * Health check endpoint
   * @returns {Promise<Object>} - Server health status
   */
  async healthCheck() {
    return await this.makeRequest('/health');
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;

// Also export the class for testing or custom instances
export { ApiService };
