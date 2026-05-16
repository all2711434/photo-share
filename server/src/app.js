const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const authRoutes = require('./routes/auth');
const photoRoutes = require('./routes/photos');
const favoriteRoutes = require('./routes/favorites');
const commentRoutes = require('./routes/comments');
const likeRoutes = require('./routes/likes');

const app = express();

// ==================== 中间件 ====================
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（上传的图片）
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ==================== API路由 ====================
app.use('/api/auth', authRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/likes', likeRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'PhotoShare API 运行正常',
    timestamp: new Date().toISOString()
  });
});

// ==================== 错误处理 ====================
// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);

  // Multer文件大小错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: '文件大小超过限制（最大10MB）'
    });
  }

  res.status(500).json({
    success: false,
    message: err.message || '服务器内部错误'
  });
});

// ==================== 启动服务 ====================
const PORT = process.env.PORT || 3001;

// 只在本地开发时启动服务器（Vercel Serverless 不需要）
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════════════╗
  ║     📸 PhotoShare API Server                 ║
  ║     🚀 服务已启动                             ║
  ║     📍 http://localhost:${PORT}                 ║
  ║     🔗 API: http://localhost:${PORT}/api       ║
  ╚══════════════════════════════════════════════╝
    `);
  });
}

module.exports = app;
