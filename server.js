const express = require('express');
const cors = require('cors');
const next = require('next');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const orderRoutes = require('./routes/orders');
const cartRoutes = require('./routes/cart');
const reviewRoutes = require('./routes/reviews');

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.SERVER_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/reviews', reviewRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running!', timestamp: new Date() });
});

// Handle all Next.js requests
app.all('*', (req, res) => {
  return handle(req, res);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

nextApp.prepare().then(() => {
  app.listen(PORT, () => {
    console.log(`> Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Error starting server:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
