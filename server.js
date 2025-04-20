const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const mangaRoutes = require('./routes/manga');
const tagRoutes = require('./routes/tag');
const logRoutes = require("./routes/logs");
const { logRequest, logError } = require("./middleware/logger");
const { requireAdmin } = require("./middleware/auth");

const app = express();
const PORT = 443;

// ✅ trust proxy if using reverse proxy or HTTPS
app.set('trust proxy', 1);

// ✅ Rate limiting
// const limiter = rateLimit({
//   windowMs: 50 * 60 * 1000, // 50 minutes
//   max: 1000, // 1000 requests per IP
// });
// app.use(limiter);

// ✅ Security headers
app.use(helmet());

// ✅ CORS: restrict to known domains
app.use(cors({
  origin: ["https://www.mangaara.com", "https://mangaara.vercel.app"],
  methods: ["GET", "POST", "PUT", "DELETE"],
}));

// ✅ JSON body parser
app.use(bodyParser.json());

// ✅ Request logging
app.use(logRequest);

// ✅ Main routes
app.use('/api/mangas', mangaRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/logs', logRoutes);
//app.use('/api/logs', requireAdmin, logRoutes);

// ✅ Fallback 404
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// ✅ Error logger
app.use(logError);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});