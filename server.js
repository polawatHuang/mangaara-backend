// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mangaRoutes = require('./routes/manga');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

app.use('/api/mangas', mangaRoutes);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});