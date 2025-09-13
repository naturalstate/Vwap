import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Button,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  IconButton,
} from '@mui/material';
import {
  Search,
  Kitchen,
  Star,
  SwapHoriz,
  FilterList,
  Add,
} from '@mui/icons-material';

const RecipesPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Sample recipe data
  const recipes = [
    {
      id: 1,
      title: 'Creamy Mushroom Risotto',
      description: 'A rich and creamy plant-based risotto with wild mushrooms and herbs.',
      category: 'dinner',
      tags: ['Italian', 'Comfort Food', 'Gluten-Free'],
      rating: 4.8,
      author: 'Sarah Green',
      prepTime: 15,
      cookTime: 30,
      difficulty: 'Medium',
      swappable: true,
    },
    {
      id: 2,
      title: 'Rainbow Buddha Bowl',
      description: 'Colorful and nutritious bowl packed with quinoa, vegetables, and tahini dressing.',
      category: 'lunch',
      tags: ['Healthy', 'Quick', 'Protein-Rich'],
      rating: 4.6,
      author: 'Mike Plant',
      prepTime: 20,
      cookTime: 0,
      difficulty: 'Easy',
      swappable: true,
    },
    {
      id: 3,
      title: 'Chocolate Avocado Mousse',
      description: 'Decadent chocolate dessert made with ripe avocados and cocoa.',
      category: 'dessert',
      tags: ['Dessert', 'Raw', 'No-Bake'],
      rating: 4.9,
      author: 'Lisa Bloom',
      prepTime: 10,
      cookTime: 0,
      difficulty: 'Easy',
      swappable: false,
    },
    {
      id: 4,
      title: 'Spicy Lentil Curry',
      description: 'Warming curry with red lentils, coconut milk, and aromatic spices.',
      category: 'dinner',
      tags: ['Indian', 'Spicy', 'One-Pot'],
      rating: 4.7,
      author: 'Raj Patel',
      prepTime: 15,
      cookTime: 25,
      difficulty: 'Easy',
      swappable: true,
    },
    {
      id: 5,
      title: 'Green Smoothie Bowl',
      description: 'Refreshing breakfast bowl with spinach, banana, and tropical fruits.',
      category: 'breakfast',
      tags: ['Healthy', 'Raw', 'Quick'],
      rating: 4.4,
      author: 'Emma Fresh',
      prepTime: 10,
      cookTime: 0,
      difficulty: 'Easy',
      swappable: true,
    },
    {
      id: 6,
      title: 'Stuffed Bell Peppers',
      description: 'Colorful bell peppers stuffed with quinoa, vegetables, and herbs.',
      category: 'dinner',
      tags: ['Mediterranean', 'Stuffed', 'Protein-Rich'],
      rating: 4.5,
      author: 'Maria Sol',
      prepTime: 25,
      cookTime: 35,
      difficulty: 'Medium',
      swappable: true,
    },
  ];

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'dessert', label: 'Dessert' },
    { value: 'snack', label: 'Snack' },
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'title', label: 'Alphabetical' },
  ];

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recipe.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || recipe.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            Vegan Recipes
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph>
            Discover and share amazing plant-based recipes from our community
          </Typography>
        </Box>

        {/* Search and Filters */}
        <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search recipes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  label="Category"
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  {categories.map((category) => (
                    <MenuItem key={category.value} value={category.value}>
                      {category.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  label="Sort By"
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  {sortOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={<Add />}
                sx={{ height: 56 }}
              >
                Add Recipe
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Results Summary */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body1">
            Found {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''}
          </Typography>
          {searchTerm && (
            <Chip
              label={`Search: "${searchTerm}"`}
              onDelete={() => setSearchTerm('')}
              color="primary"
              variant="outlined"
            />
          )}
          {categoryFilter !== 'all' && (
            <Chip
              label={`Category: ${categories.find(c => c.value === categoryFilter)?.label}`}
              onDelete={() => setCategoryFilter('all')}
              color="secondary"
              variant="outlined"
            />
          )}
        </Box>

        {/* Recipe Grid */}
        <Grid container spacing={3}>
          {filteredRecipes.map((recipe) => (
            <Grid item xs={12} sm={6} lg={4} key={recipe.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  component="div"
                  sx={{
                    height: 200,
                    backgroundColor: 'grey.200',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <Kitchen sx={{ fontSize: 60, color: 'grey.400' }} />
                  {recipe.swappable && (
                    <Chip
                      label="Swappable"
                      color="secondary"
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                      }}
                    />
                  )}
                </CardMedia>
                
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {recipe.title}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {recipe.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    {recipe.tags.map((tag, index) => (
                      <Chip
                        key={index}
                        label={tag}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Star sx={{ color: 'orange', fontSize: 16 }} />
                      <Typography variant="body2">{recipe.rating}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {recipe.difficulty}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Prep: {recipe.prepTime}min
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Cook: {recipe.cookTime}min
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary">
                    by {recipe.author}
                  </Typography>
                </CardContent>
                
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button size="small" color="primary" fullWidth>
                    View Recipe
                  </Button>
                  {recipe.swappable && (
                    <IconButton color="secondary" aria-label="request swap">
                      <SwapHoriz />
                    </IconButton>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Empty State */}
        {filteredRecipes.length === 0 && (
          <Paper
            elevation={2}
            sx={{
              p: 6,
              textAlign: 'center',
              backgroundColor: 'grey.50',
              mt: 4,
            }}
          >
            <Kitchen sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              No recipes found
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Try adjusting your search or filters to find more recipes.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </Paper>
        )}
      </Container>
    </Box>
  );
};

export default RecipesPage;
