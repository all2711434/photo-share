let app;
let loadError = null;

try {
  app = require('../server/src/app');
} catch (err) {
  console.error('Failed to load app:', err.message);
  console.error('Stack:', err.stack);
  loadError = err;
}

if (!app) {
  app = (req, res) => {
    res.status(500).json({
      success: false,
      error: 'App failed to load',
      message: loadError ? loadError.message : 'Unknown error',
      stack: loadError ? loadError.stack : undefined
    });
  };
}

module.exports = app;
