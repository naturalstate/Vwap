import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  TextField,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  LocalFlorist,
  Kitchen,
  AutoFixHigh,
  ContentPaste,
  Link as LinkIcon,
  SwapHoriz,
  CheckCircle,
} from '@mui/icons-material';

const HomePage = () => {
  const [inputText, setInputText] = useState('');
  const [veganizedRecipe, setVeganizedRecipe] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [ingredientDatabase, setIngredientDatabase] = useState(null);
  const [substitutions, setSubstitutions] = useState([]);

  // Load ingredient database on component mount
  useEffect(() => {
    loadIngredientDatabase();
  }, []);

  const loadIngredientDatabase = async () => {
    try {
      const response = await fetch('/ingredient_database.json');
      const data = await response.json();
      setIngredientDatabase(data);
    } catch (error) {
      console.error('Failed to load ingredient database:', error);
    }
  };

  // Intelligent veganization function using ingredient database
  const veganizeRecipe = async (recipeText) => {
    setIsLoading(true);
    setError('');
    
    try {
      if (!ingredientDatabase) {
        throw new Error('Ingredient database not loaded');
      }

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      let veganized = recipeText;
      const foundSubstitutions = [];
      
      // Process all non-vegan ingredients from database
      for (const [categoryKey, categoryData] of Object.entries(ingredientDatabase.ingredients)) {
        for (const [ingredientKey, ingredientData] of Object.entries(categoryData)) {
          if (!ingredientData.vegan && ingredientData.substitutes.length > 0) {
            // Create regex pattern for ingredient (handle variations)
            const ingredientName = ingredientKey.replace(/_/g, ' ');
            const patterns = [
              // Exact match
              new RegExp(`\\b${ingredientName}\\b`, 'gi'),
              // Plural forms
              new RegExp(`\\b${ingredientName}s\\b`, 'gi'),
              // Handle compound words (e.g., "sour_cream" -> "sour cream")
              ...ingredientName.split(' ').length > 1 ? 
                [new RegExp(`\\b${ingredientName.replace(/ /g, '\\s+')}\\b`, 'gi')] : []
            ];
            
            patterns.forEach(pattern => {
              if (pattern.test(veganized)) {
                // Get best substitute (first one in the list)
                const bestSubstitute = ingredientData.substitutes[0];
                const oldText = veganized;
                veganized = veganized.replace(pattern, bestSubstitute);
                
                if (oldText !== veganized) {
                  foundSubstitutions.push({
                    from: ingredientName,
                    to: bestSubstitute,
                    alternatives: ingredientData.substitutes.slice(1)
                  });
                }
              }
            });
          }
        }
      }
      
      // Store substitutions in state
      setSubstitutions(foundSubstitutions);
      
      // Format the recipe output (cleaner, without substitution details)
      if (foundSubstitutions.length > 0) {
        const output = "🌱 **Vegan Version:**\n\n" + veganized + 
                      "\n\n💡 **Tip:** Check the substitution summary below for details about what was changed and alternative options.";
        setVeganizedRecipe(output);
      } else {
        setVeganizedRecipe("🌱 **Great news!** This recipe appears to already be vegan-friendly!\n\n" + veganized);
      }
      
    } catch (err) {
      console.error('Veganization error:', err);
      setError('Sorry, there was an error processing your recipe. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!inputText.trim()) {
      setError('Please enter a recipe or URL to veganize.');
      return;
    }
    veganizeRecipe(inputText);
  };

  const handleClear = () => {
    setInputText('');
    setVeganizedRecipe('');
    setError('');
    setSubstitutions([]);
  };

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
          color: 'white',
          py: 8,
        }}
      >
        <Container maxWidth="lg">
          <Box textAlign="center">
            <LocalFlorist sx={{ fontSize: 80, mb: 2 }} />
            <Typography variant="h2" component="h1" gutterBottom>
              Vwap - Recipe Veganizer
            </Typography>
            <Typography variant="h5" paragraph sx={{ opacity: 0.9, mb: 4 }}>
              Transform any recipe into a delicious vegan version instantly!
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.8, maxWidth: 600, mx: 'auto' }}>
              Simply paste a recipe or URL below, and our tool will automatically replace 
              non-vegan ingredients with plant-based alternatives.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Main Tool Section */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Grid container spacing={4}>
          {/* Input Section */}
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3, height: 'fit-content' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ContentPaste sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Paste Your Recipe</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Paste your recipe text or enter a URL from a recipe website
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={12}
                variant="outlined"
                placeholder={`Paste your recipe here or enter a URL like:\n\nhttps://example.com/recipe\n\nOr paste the full recipe text:\n\nIngredients:\n- 2 cups milk\n- 3 eggs\n- 1/2 cup butter\n- 1 tsp vanilla\n\nInstructions:\n1. Mix ingredients...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                sx={{ mb: 3 }}
              />
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleSubmit}
                  disabled={isLoading || !inputText.trim()}
                  startIcon={isLoading ? <CircularProgress size={20} /> : <AutoFixHigh />}
                  sx={{ flexGrow: 1 }}
                >
                  {isLoading ? 'Veganizing...' : 'Veganize Recipe'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleClear}
                  disabled={isLoading}
                >
                  Clear
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Output Section */}
          <Grid item xs={12} md={6}>
            <Paper elevation={3} sx={{ p: 3, height: 'fit-content', minHeight: 400 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Kitchen sx={{ mr: 1, color: 'secondary.main' }} />
                <Typography variant="h6">Vegan Version</Typography>
              </Box>
              
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              
              {isLoading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                  <CircularProgress size={40} sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    Converting your recipe to be vegan-friendly...
                  </Typography>
                </Box>
              ) : veganizedRecipe ? (
                <Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={12}
                    variant="outlined"
                    value={veganizedRecipe}
                    InputProps={{
                      readOnly: true,
                    }}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="outlined"
                    onClick={() => navigator.clipboard.writeText(veganizedRecipe)}
                    startIcon={<ContentPaste />}
                    size="small"
                    sx={{ mb: 2 }}
                  >
                    Copy to Clipboard
                  </Button>
                  
                  {/* Substitution Summary Panel */}
                  {substitutions.length > 0 && (
                    <Paper 
                      elevation={1} 
                      sx={{ 
                        p: 3, 
                        backgroundColor: 'rgba(76, 175, 80, 0.05)',
                        border: '1px solid rgba(76, 175, 80, 0.2)'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <SwapHoriz sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6" color="primary.main">
                          Vwap Made {substitutions.length} Substitution{substitutions.length > 1 ? 's' : ''}
                        </Typography>
                      </Box>
                      
                      <List dense>
                        {substitutions.map((sub, index) => (
                          <ListItem key={index} sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <CheckCircle sx={{ fontSize: 20, color: 'success.main' }} />
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                  <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
                                    {sub.from}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    →
                                  </Typography>
                                  <Typography variant="body2" component="span" color="primary.main" sx={{ fontWeight: 500 }}>
                                    {sub.to}
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                sub.alternatives.length > 0 && (
                                  <Box sx={{ mt: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                                      Other options:
                                    </Typography>
                                    {sub.alternatives.map((alt, altIndex) => (
                                      <Chip
                                        key={altIndex}
                                        label={alt}
                                        size="small"
                                        variant="outlined"
                                        sx={{ 
                                          mr: 0.5, 
                                          mb: 0.5,
                                          fontSize: '0.7rem',
                                          height: '24px'
                                        }}
                                      />
                                    ))}
                                  </Box>
                                )
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  )}
                </Box>
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  minHeight: 300,
                  color: 'text.secondary',
                  textAlign: 'center'
                }}>
                  <LocalFlorist sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    Your vegan recipe will appear here
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    Paste a recipe in the left panel and click "Veganize Recipe" to get started
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* How It Works Section */}
      <Box sx={{ backgroundColor: 'grey.50', py: 6 }}>
        <Container maxWidth="lg">
          <Typography variant="h4" textAlign="center" gutterBottom>
            How It Works
          </Typography>
          <Typography variant="body1" textAlign="center" color="text.secondary" paragraph sx={{ mb: 4 }}>
            Our intelligent recipe converter identifies non-vegan ingredients and suggests perfect plant-based alternatives
          </Typography>
          
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Card sx={{ textAlign: 'center', p: 3, height: '100%' }}>
                <ContentPaste sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  1. Paste Recipe
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Copy and paste any recipe text or enter a URL from your favorite recipe website
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ textAlign: 'center', p: 3, height: '100%' }}>
                <AutoFixHigh sx={{ fontSize: 50, color: 'secondary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  2. Auto-Convert
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Our tool identifies non-vegan ingredients and replaces them with suitable plant-based alternatives
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ textAlign: 'center', p: 3, height: '100%' }}>
                <Kitchen sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  3. Cook & Enjoy
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Get your perfectly converted vegan recipe with helpful substitution notes and cooking tips
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Common Substitutions */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Typography variant="h4" textAlign="center" gutterBottom>
          Common Vegan Substitutions
        </Typography>
        <Typography variant="body1" textAlign="center" color="text.secondary" paragraph sx={{ mb: 4 }}>
          Here are some of the intelligent substitutions our tool makes automatically
        </Typography>
        
        <Grid container spacing={3}>
          {[
            { from: 'Milk', to: 'Oat, Almond, or Soy Milk' },
            { from: 'Butter', to: 'Vegan Butter or Coconut Oil' },
            { from: 'Eggs', to: 'Flax Eggs or Aquafaba' },
            { from: 'Cheese', to: 'Nutritional Yeast or Vegan Cheese' },
            { from: 'Meat', to: 'Tofu, Tempeh, or Mushrooms' },
            { from: 'Honey', to: 'Maple Syrup or Agave Nectar' },
          ].map((sub, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 500, minWidth: 60 }}>
                  {sub.from}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  →
                </Typography>
                <Typography variant="body2" color="primary.main" sx={{ flexGrow: 1 }}>
                  {sub.to}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default HomePage;
