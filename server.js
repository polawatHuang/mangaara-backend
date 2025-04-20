// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mangaRoutes = require('./routes/manga');
const tagRoutes = require('./routes/tag');

const app = express();
const PORT = 80;

app.use(cors());
app.use(bodyParser.json());

app.use('/api/mangas', mangaRoutes);
app.use('/api/tags', tagRoutes);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});