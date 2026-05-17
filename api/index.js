// 使用动态 require 避免 ncc 打包时的静态分析冲突
const path = require('path');

let app;
let loadError = null;

try {
  // 使用动态路径加载，避免 ncc 静态分析时内联所有依赖
  const appPath = path.join(__dirname, '..', 'server', 'src', 'app');
  app = require(appPath);
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
