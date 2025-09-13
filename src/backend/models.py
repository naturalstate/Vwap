"""
Vwap - Vegan Recipe Swap
Database Models

This module defines all database models for the application.
"""

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import json

db = SQLAlchemy()

class User(db.Model):
    """User model for authentication and profiles"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    
    # Profile information
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    bio = db.Column(db.Text)
    profile_picture = db.Column(db.String(255))
    
    # Preferences
    dietary_preferences = db.Column(db.Text)  # JSON string
    cooking_level = db.Column(db.String(20), default='beginner')  # beginner, intermediate, advanced
    
    # Account status
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    # Relationships
    recipes = db.relationship('Recipe', backref='author', lazy=True, cascade='all, delete-orphan')
    reviews = db.relationship('Review', backref='reviewer', lazy=True, cascade='all, delete-orphan')
    sent_swaps = db.relationship('RecipeSwap', foreign_keys='RecipeSwap.requester_id', backref='requester', lazy=True)
    received_swaps = db.relationship('RecipeSwap', foreign_keys='RecipeSwap.owner_id', backref='owner', lazy=True)
    
    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if provided password matches hash"""
        return check_password_hash(self.password_hash, password)
    
    def get_dietary_preferences(self):
        """Get dietary preferences as list"""
        if self.dietary_preferences:
            return json.loads(self.dietary_preferences)
        return []
    
    def set_dietary_preferences(self, preferences):
        """Set dietary preferences from list"""
        self.dietary_preferences = json.dumps(preferences)
    
    def to_dict(self, include_email=False):
        """Convert user to dictionary"""
        data = {
            'id': self.id,
            'username': self.username,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'bio': self.bio,
            'profile_picture': self.profile_picture,
            'dietary_preferences': self.get_dietary_preferences(),
            'cooking_level': self.cooking_level,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'recipe_count': len(self.recipes)
        }
        if include_email:
            data['email'] = self.email
        return data

class Recipe(db.Model):
    """Recipe model for storing vegan recipes"""
    __tablename__ = 'recipes'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False, index=True)
    description = db.Column(db.Text)
    ingredients = db.Column(db.Text, nullable=False)  # JSON string
    instructions = db.Column(db.Text, nullable=False)
    
    # Recipe metadata
    prep_time = db.Column(db.Integer)  # in minutes
    cook_time = db.Column(db.Integer)  # in minutes
    total_time = db.Column(db.Integer)  # in minutes
    servings = db.Column(db.Integer, default=1)
    difficulty = db.Column(db.String(20), default='easy')  # easy, medium, hard
    
    # Categories and tags
    category = db.Column(db.String(50))  # breakfast, lunch, dinner, dessert, snack
    tags = db.Column(db.Text)  # JSON string of tags
    cuisine_type = db.Column(db.String(50))
    
    # Media
    image_url = db.Column(db.String(255))
    video_url = db.Column(db.String(255))
    
    # Nutritional info (optional)
    calories_per_serving = db.Column(db.Integer)
    nutritional_info = db.Column(db.Text)  # JSON string
    
    # Status and visibility
    is_public = db.Column(db.Boolean, default=True)
    is_swappable = db.Column(db.Boolean, default=True)
    
    # Ratings
    rating_sum = db.Column(db.Integer, default=0)
    rating_count = db.Column(db.Integer, default=0)
    
    # Foreign keys
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    reviews = db.relationship('Review', backref='recipe', lazy=True, cascade='all, delete-orphan')
    swaps = db.relationship('RecipeSwap', backref='recipe', lazy=True, cascade='all, delete-orphan')
    
    @property
    def average_rating(self):
        """Calculate average rating"""
        if self.rating_count == 0:
            return 0
        return round(self.rating_sum / self.rating_count, 1)
    
    def get_ingredients(self):
        """Get ingredients as list"""
        if self.ingredients:
            return json.loads(self.ingredients)
        return []
    
    def set_ingredients(self, ingredients):
        """Set ingredients from list"""
        self.ingredients = json.dumps(ingredients)
    
    def get_tags(self):
        """Get tags as list"""
        if self.tags:
            return json.loads(self.tags)
        return []
    
    def set_tags(self, tags):
        """Set tags from list"""
        self.tags = json.dumps(tags)
    
    def get_nutritional_info(self):
        """Get nutritional info as dict"""
        if self.nutritional_info:
            return json.loads(self.nutritional_info)
        return {}
    
    def set_nutritional_info(self, nutrition):
        """Set nutritional info from dict"""
        self.nutritional_info = json.dumps(nutrition)
    
    def to_dict(self, include_author=True):
        """Convert recipe to dictionary"""
        data = {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'ingredients': self.get_ingredients(),
            'instructions': self.instructions,
            'prep_time': self.prep_time,
            'cook_time': self.cook_time,
            'total_time': self.total_time,
            'servings': self.servings,
            'difficulty': self.difficulty,
            'category': self.category,
            'tags': self.get_tags(),
            'cuisine_type': self.cuisine_type,
            'image_url': self.image_url,
            'video_url': self.video_url,
            'calories_per_serving': self.calories_per_serving,
            'nutritional_info': self.get_nutritional_info(),
            'is_public': self.is_public,
            'is_swappable': self.is_swappable,
            'average_rating': self.average_rating,
            'rating_count': self.rating_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_author and self.author:
            data['author'] = self.author.to_dict()
        
        return data

class Review(db.Model):
    """Recipe review and rating model"""
    __tablename__ = 'reviews'
    
    id = db.Column(db.Integer, primary_key=True)
    rating = db.Column(db.Integer, nullable=False)  # 1-5 stars
    comment = db.Column(db.Text)
    
    # Helpful votes
    helpful_count = db.Column(db.Integer, default=0)
    
    # Foreign keys
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipes.id'), nullable=False)
    reviewer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Unique constraint to prevent multiple reviews from same user for same recipe
    __table_args__ = (db.UniqueConstraint('recipe_id', 'reviewer_id', name='unique_recipe_reviewer'),)
    
    def to_dict(self, include_reviewer=True):
        """Convert review to dictionary"""
        data = {
            'id': self.id,
            'rating': self.rating,
            'comment': self.comment,
            'helpful_count': self.helpful_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_reviewer and self.reviewer:
            data['reviewer'] = self.reviewer.to_dict()
        
        return data

class RecipeSwap(db.Model):
    """Recipe swap/exchange model"""
    __tablename__ = 'recipe_swaps'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Swap participants
    requester_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Recipe being requested
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipes.id'), nullable=False)
    
    # Swap details
    message = db.Column(db.Text)  # Optional message from requester
    offered_recipe_ids = db.Column(db.Text)  # JSON string of recipe IDs offered in exchange
    
    # Swap status
    status = db.Column(db.String(20), default='pending')  # pending, accepted, declined, completed
    
    # Response from owner
    response_message = db.Column(db.Text)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    
    def get_offered_recipe_ids(self):
        """Get offered recipe IDs as list"""
        if self.offered_recipe_ids:
            return json.loads(self.offered_recipe_ids)
        return []
    
    def set_offered_recipe_ids(self, recipe_ids):
        """Set offered recipe IDs from list"""
        self.offered_recipe_ids = json.dumps(recipe_ids)
    
    def to_dict(self, include_users=True, include_recipe=True):
        """Convert swap to dictionary"""
        data = {
            'id': self.id,
            'message': self.message,
            'offered_recipe_ids': self.get_offered_recipe_ids(),
            'status': self.status,
            'response_message': self.response_message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }
        
        if include_users:
            if self.requester:
                data['requester'] = self.requester.to_dict()
            if self.owner:
                data['owner'] = self.owner.to_dict()
        
        if include_recipe and self.recipe:
            data['recipe'] = self.recipe.to_dict(include_author=False)
        
        return data

# Association table for user follows (if implementing social features)
user_follows = db.Table('user_follows',
    db.Column('follower_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('followed_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('created_at', db.DateTime, default=datetime.utcnow)
)

# Association table for recipe collections (if implementing)
recipe_collections = db.Table('recipe_collections',
    db.Column('id', db.Integer, primary_key=True),
    db.Column('name', db.String(100), nullable=False),
    db.Column('description', db.Text),
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), nullable=False),
    db.Column('is_public', db.Boolean, default=False),
    db.Column('created_at', db.DateTime, default=datetime.utcnow)
)
