require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check (no auth)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/records',   require('./routes/records'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Finance backend running on http://localhost:${PORT}`);
  console.log(`   Env: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;