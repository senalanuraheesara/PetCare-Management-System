require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const seedAdminUser = require('./seeds/adminSeed');
const { errorHandler } = require('./middleware/errorMiddleware');
const authController = require('./controllers/authController');

const app = express();

// Railway / reverse proxies (correct client IP, secure cookies if you add them later)
app.set('trust proxy', 1);

const SERVER_BUILD_TAG = `pet-care-backend@${new Date().toISOString().slice(0, 10)}`; // sanity check from phone/browser

const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

app.use('/uploads', express.static(uploadsPath));

// Middleware — allow Expo web, dev servers, and mobile (often no Origin header)
app.use(
  cors({
    origin: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  })
);
app.use(express.json()); // Body parser

// Hit this from the LAN to confirm THIS process is what's bound (no DB required).
app.get('/api/build-info', (req, res) => {
  res.json({
    service: SERVER_BUILD_TAG,
    postPwReset: true,
    listenPort: Number(process.env.PORT) || 5000,
    node: process.version,
    now: new Date().toISOString(),
  });
});
app.get('/build-info', (req, res) => {
  res.redirect(307, '/api/build-info');
});

// Register password reset on the app first so POST /api/auth/pw-reset always resolves
// (avoids "Cannot POST /api/auth/pw-reset" if an old auth router bundle is cached).
app.post('/api/auth/pw-reset', authController.resetPassword);
app.post('/api/auth/reset-password', authController.resetPassword);

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/pets', require('./routes/petRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/vets', require('./routes/vetRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/vaccines', require('./routes/vaccineRoutes'));
app.use('/api/grooming', require('./routes/groomingRoutes'));
app.use('/api/boarding', require('./routes/boardingRoutes'));
app.use('/api/diet', require('./routes/dietRoutes'));
app.use('/api/medications', require('./routes/medicationRoutes'));

app.get('/', (req, res) => {
  res.send('API is running...');
});

// Unknown /api/* → JSON (mobile Alert won't show raw HTML)
app.use((req, res, next) => {
  if (!req.originalUrl.startsWith('/api')) {
    return next();
  }
  res.status(404).json({
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await seedAdminUser();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (0.0.0.0)`);
  });
};

startServer().catch((error) => {
  console.error('Server failed to start:', error?.message || error);
  if (error?.stack) console.error(error.stack);
  process.exit(1);
});
