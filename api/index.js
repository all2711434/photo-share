let app;
try {
  app = require('../server/src/app');
} catch (err) {
  console.error('Failed to load app:', err.message);
  console.error('Stack:', err.stack);
  const express = require('express');
  app = express();
  app.get('/api/health', (req, res) => {
    res.status(500).json({
      success: false,
      error: 'App failed to load',
      message: err.message,
      stack: err.stack
    });
  });
  app.use((req, res) => {
    res.status(500).json({
      success: false,
      error: 'App failed to load',
      message: err.message
    });
  });
}
module.exports = app;
