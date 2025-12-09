require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const mangaRoutes = require('./routes/manga');
const tagRoutes = require('./routes/tag');
const logRoutes = require("./routes/logs");
const episodeRoutes = require("./routes/episodes");
const episodeRoute = require("./routes/episode"); // Single episode creation route
const commentRoutes = require("./routes/comments");
const recommendRoutes = require("./routes/recommend");
const advertiseRoutes = require("./routes/advertise");
const menubarRoutes = require("./routes/menubar");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const favoriteRoutes = require("./routes/favorites");
const uploadRoute = require("./routes/upload");
const testConnectionRoute = require("./routes/test-connection");
const statusRoutes = require("./routes/status");
const { logRequest, logError } = require("./middleware/logger");
// const { requireAdmin } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 443;

// ✅ Trust proxy if using reverse proxy or HTTPS
app.set('trust proxy', 1);

// ✅ Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 50 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
  message: "Too many requests, please try again later.",
});

app.use(limiter);

// ✅ Security headers using Helmet
app.use(helmet());

// ✅ CORS: Restrict to known domains
const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ["https://www.mangaara.com", "https://mangaara.vercel.app"];
app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
}));

// ✅ JSON body parser with limit
app.use(bodyParser.json({ limit: '10mb' })); // Adjust the limit based on your use case

// ✅ Request logging middleware
app.use(logRequest);

// ✅ Main API Routes
app.use('/api/auth', authRoutes);
app.use('/api/mangas', mangaRoutes);
app.use('/api/manga', mangaRoutes); // Support both /api/mangas and /api/manga
app.use('/api/tags', tagRoutes);
app.use('/api/episodes', episodeRoutes);
app.use('/api/episode', episodeRoute); // Single episode creation
app.use('/api/comments', commentRoutes);
app.use('/api/recommend', recommendRoutes);
app.use('/api/advertise', advertiseRoutes);
app.use('/api/menubar', menubarRoutes);
app.use('/api/users', userRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/upload', uploadRoute);
app.use('/api/test-connection', testConnectionRoute);
app.use('/api/status', statusRoutes);
app.use('/api/logs', logRoutes); // Uncomment if you want to require admin for logs

// ✅ Fallback 404 for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// ✅ Error logging middleware
app.use(logError);

app.listen(PORT, () => {
  console.log(`Server running at https://localhost:${PORT}`);
});