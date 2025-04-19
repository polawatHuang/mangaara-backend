// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mangaRoutes = require('./routes/manga');
const testRoutes = require('./routes/test');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

app.use('/api/mangas', mangaRoutes);
app.use('/api/test', testRoutes);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});