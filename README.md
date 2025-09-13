# 🌱 Vwap - Recipe Veganizer

**Transform any recipe into a delicious vegan version instantly!**

Vwap (Vegan Recipe Adapter) is a simple, powerful web tool that automatically converts traditional recipes to be 100% vegan-friendly by intelligently replacing non-vegan ingredients with perfect plant-based alternatives.

## ✨ Features

- 🔄 **Intelligent Substitution** - Automatically replaces dairy, eggs, meat, and hidden animal ingredients
- 📋 **Clear Change Summary** - Shows exactly what was substituted with alternative options
- 🗄️ **Comprehensive Database** - Powered by 70+ ingredient mappings (expanding to 10K+)
- 📱 **Mobile Responsive** - Works perfectly on phones, tablets, and desktop
- ⚡ **Instant Results** - No account needed, just paste and convert
- 🎨 **Beautiful UI** - Clean, intuitive interface built with Material-UI

## 🚀 How It Works

1. **Paste Recipe** - Copy any recipe text or URL from your favorite site
2. **Auto-Convert** - Our intelligent system identifies and replaces non-vegan ingredients
3. **Cook & Enjoy** - Get your perfectly converted vegan recipe with substitution notes

## 🏗️ Project Structure

```
src/
├── frontend/              # React application
│   ├── src/              # React components and logic
│   ├── public/           # Static assets
│   ├── build/            # Production build
│   ├── ingredient_database.json     # Current ingredient database
│   ├── ingredient_browser.html      # Admin database browser
│   └── serve_local.py              # Local development server
├── backend-api/          # Node.js/Express API (in development)
└── shared/               # Shared utilities and data
```

## 🛠️ Tech Stack

### Frontend
- **React** - Modern UI framework
- **Material-UI** - Beautiful, accessible components
- **JavaScript ES6+** - Modern language features

### Backend (In Development)
- **Node.js/Express** - Scalable API server
- **SQLite** - Fast, lightweight database
- **OpenFoodFacts** - Ingredient data source

## 🚦 Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn

### Frontend Development
```bash
cd src/frontend
npm install
npm start
```
Visit `http://localhost:3000`

### Production Build
```bash
npm run build
python serve_local.py  # Serves on local network
```

## 🎯 Current Status

### ✅ Completed
- Beautiful React frontend with substitution summary panel
- 70-ingredient database with intelligent matching
- Mobile-responsive design
- Local network serving capability
- Admin ingredient browser interface

### 🚧 In Development
- Massive ingredient database expansion (10K+ ingredients)
- Node.js/Express backend API
- URL recipe extraction feature
- Enhanced substitution intelligence

## 🤝 Contributing

This project is in active development. We welcome contributions for:
- Additional ingredient mappings
- UI/UX improvements
- Backend API development
- Recipe extraction algorithms

## 📝 Common Substitutions

Our intelligent system automatically handles:
- **Milk** → Oat, Almond, or Soy Milk
- **Butter** → Vegan Butter or Coconut Oil
- **Eggs** → Flax Eggs or Aquafaba
- **Cheese** → Nutritional Yeast or Vegan Cheese
- **Meat** → Tofu, Tempeh, or Mushrooms
- **Honey** → Maple Syrup or Agave Nectar

...and many more!

## 🌟 Vision

Making vegan cooking accessible to everyone by removing the guesswork from ingredient substitutions. Whether you're a new vegan, experienced cook, or cooking for loved ones, Vwap makes plant-based cooking simple and delicious.


---

**Happy Vegan Cooking! 🌱**
