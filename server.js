const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const mangaRoutes = require('./routes/manga');
const tagRoutes = require('./routes/tag');
const logRoutes = require("./routes/logs");
const { logRequest, logError } = require("./middleware/logger");
// const { requireAdmin } = require("./middleware/auth");

const app = express();
const PORT = 443;

// ✅ Trust proxy if using reverse proxy or HTTPS
app.set('trust proxy', 1);

// ✅ Rate limiting
const limiter = rateLimit({
  windowMs: 50 * 60 * 1000, // 50 minutes
  max: 1000, // Limit to 1000 requests per IP
  message: "Too many requests, please try again later.",
});

app.use(limiter);

// ✅ Security headers using Helmet
app.use(helmet());

// ✅ CORS: Restrict to known domains
app.use(cors({
  origin: ["https://www.mangaara.com", "https://mangaara.vercel.app"], // Update with your valid domains
  methods: ["GET", "POST", "PUT", "DELETE"],
}));

// ✅ JSON body parser with limit
app.use(bodyParser.json({ limit: '10mb' })); // Adjust the limit based on your use case

// ✅ Request logging middleware
app.use(logRequest);

// ✅ Main API Routes
app.use('/api/mangas', mangaRoutes);
app.use('/api/tags', tagRoutes);
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