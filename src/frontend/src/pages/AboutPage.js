import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Avatar,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  LocalFlorist,
  RestaurantMenu,
  SwapHoriz,
  Group,
  Star,
  Kitchen,
  Favorite,
  Public,
} from '@mui/icons-material';

const AboutPage = () => {

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
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h2" component="h1" gutterBottom>
                About Vwap
              </Typography>
              <Typography variant="h5" component="h2" gutterBottom sx={{ opacity: 0.9 }}>
                Recipe Veganizer Tool
              </Typography>
              <Typography variant="h6" paragraph sx={{ opacity: 0.8 }}>
                Vwap (Vegan Recipe Adapter) is a simple, powerful tool that transforms any recipe 
                into a delicious vegan version. Just paste your recipe or URL, and we'll automatically 
                replace non-vegan ingredients with perfect plant-based alternatives.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: 200,
                }}
              >
                <LocalFlorist sx={{ fontSize: 150, opacity: 0.3 }} />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Why Use Vwap Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          Why Use Vwap?
        </Typography>
        <Typography variant="h6" textAlign="center" color="text.secondary" paragraph sx={{ mb: 6 }}>
          Making plant-based cooking easier and more accessible for everyone
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 4, height: '100%' }}>
              <Typography variant="h5" gutterBottom color="primary.main">
                🕒 Save Time
              </Typography>
              <Typography variant="body1" color="text.secondary">
                No need to research each ingredient or figure out substitutions manually. 
                Our tool instantly converts any recipe in seconds.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 4, height: '100%' }}>
              <Typography variant="h5" gutterBottom color="secondary.main">
                🌱 Perfect Substitutions
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Get intelligent, tested plant-based alternatives that maintain the 
                flavor and texture of your favorite dishes.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 4, height: '100%' }}>
              <Typography variant="h5" gutterBottom color="primary.main">
                📱 Simple & Easy
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Just paste any recipe or URL - no account needed, no complicated steps. 
                Get your vegan version instantly.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 4, height: '100%' }}>
              <Typography variant="h5" gutterBottom color="secondary.main">
                💡 Learn & Explore
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Discover new ingredients and techniques while expanding your 
                plant-based cooking repertoire.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* How It Helps Section */}
      <Box sx={{ backgroundColor: 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
            Perfect for Everyone
          </Typography>
          
          <Grid container spacing={4} sx={{ mt: 4 }}>
            <Grid item xs={12} md={4}>
              <Card sx={{ textAlign: 'center', p: 3, height: '100%' }}>
                <LocalFlorist sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  New Vegans
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Transform your favorite family recipes into vegan versions you can still enjoy
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ textAlign: 'center', p: 3, height: '100%' }}>
                <Kitchen sx={{ fontSize: 50, color: 'secondary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Experienced Cooks
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Quickly adapt recipes you find online or in cookbooks to fit your plant-based lifestyle
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ textAlign: 'center', p: 3, height: '100%' }}>
                <Group sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Families & Friends
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Help loved ones enjoy vegan versions of dishes they already know and love
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default AboutPage;
