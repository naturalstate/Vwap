#!/usr/bin/env python3
"""
Vwap - Vegan Recipe Swap
Main Flask Application Entry Point
"""

import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_app(config_name='development'):
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.getenv('APP_SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET', 'jwt-secret-key-change-in-production')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400  # 24 hours
    app.config['DATABASE_URL'] = os.getenv('DATABASE_URL', 'sqlite:///vegan_recipe_swap.db')
    app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_PATH', './uploads')
    app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB max file size
    
    # Initialize extensions
    CORS(app)
    jwt = JWTManager(app)
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'message': 'Vwap - Vegan Recipe Swap API is running',
            'version': '1.0.0'
        })
    
    # API root endpoint
    @app.route('/api/')
    def api_root():
        return jsonify({
            'message': 'Welcome to Vwap - Vegan Recipe Swap API',
            'version': '1.0.0',
            'endpoints': {
                'health': '/health',
                'auth': '/api/auth',
                'users': '/api/users',
                'recipes': '/api/recipes',
                'swaps': '/api/swaps',
                'reviews': '/api/reviews'
            }
        })
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'error': 'Not found',
            'message': 'The requested resource was not found'
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            'error': 'Internal server error',
            'message': 'An unexpected error occurred'
        }), 500
    
    # Register blueprints (when created)
    # from .routes.auth import auth_bp
    # from .routes.users import users_bp
    # from .routes.recipes import recipes_bp
    # from .routes.swaps import swaps_bp
    # from .routes.reviews import reviews_bp
    
    # app.register_blueprint(auth_bp, url_prefix='/api/auth')
    # app.register_blueprint(users_bp, url_prefix='/api/users')
    # app.register_blueprint(recipes_bp, url_prefix='/api/recipes')
    # app.register_blueprint(swaps_bp, url_prefix='/api/swaps')
    # app.register_blueprint(reviews_bp, url_prefix='/api/reviews')
    
    return app

def main():
    """Run the application in development mode"""
    app = create_app()
    
    port = int(os.getenv('APP_PORT', 3000))
    host = os.getenv('APP_HOST', 'localhost')
    debug = os.getenv('DEBUG', 'true').lower() == 'true'
    
    print(f"🌱 Starting Vwap - Vegan Recipe Swap")
    print(f"🚀 Server running at http://{host}:{port}")
    print(f"🔧 Debug mode: {debug}")
    print(f"📖 API documentation: http://{host}:{port}/api/")
    
    app.run(host=host, port=port, debug=debug)

if __name__ == '__main__':
    main()
