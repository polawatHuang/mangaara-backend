// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mangaRoutes = require('./routes/manga');
const tagRoutes = require('./routes/tag');
const logRoutes = require("./routes/logs");
const { logRequest, logError } = require("./middleware/logger");

const app = express();
const PORT = 80;

app.use(cors());
app.use(bodyParser.json());

// ✅ Log all requests before routing
app.use(logRequest);

// ✅ Main API routes
app.use('/api/mangas', mangaRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/logs', logRoutes); // This is the API to view logs

// ✅ Catch all unhandled errors after routes
app.use(logError);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});