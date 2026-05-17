// Vercel Serverless Function 入口 - 内联所有依赖避免 ncc 打包冲突
const express = require('express');
const cors = require('cors');
const path = require('path');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

// 创建 Express 应用
const app = express();

// ==================== 中间件 ====================
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ==================== 数据库连接 ====================
const { Pool } = require('@neondatabase/serverless');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}?sslmode=require`,
  max: 20,
});

const db = {
  async query(sql, params = []) {
    let pgSql = sql;
    let paramIndex = 0;
    pgSql = pgSql.replace(/\?/g, () => {
      paramIndex++;
      return `$${paramIndex}`;
    });
    const result = await pool.query(pgSql, params);
    if (result.rows) {
      const compatibleResult = {
        ...result,
        insertId: result.rows[0]?.id || 0,
        affectedRows: result.rowCount || 0,
      };
      return [result.rows, compatibleResult];
    }
    return [result];
  }
};

// ==================== JWT 工具 ====================
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未登录' });
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: '登录已过期' });
  }
}

// ==================== 认证路由 ====================
const bcrypt = require('bcryptjs');

// 用户注册
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: '用户名、邮箱和密码不能为空' });
    }
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ success: false, message: '用户名长度应在3-50个字符之间' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: '密码长度不能少于6个字符' });
    }

    const [existing] = await db.query('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: '用户名或邮箱已被注册' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await db.query(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, 'user']
    );

    const token = generateToken({ id: result.insertId, username, role: 'user' });
    res.status(201).json({
      success: true,
      message: '注册成功',
      data: { id: result.insertId, username, email, role: 'user', token }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ success: false, message: '注册失败，请稍后重试' });
  }
});

// 用户登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const token = generateToken(user);
    res.json({
      success: true,
      message: '登录成功',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        token
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ success: false, message: '登录失败，请稍后重试' });
  }
});

// 获取当前用户信息
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    res.json({ success: true, data: users[0] });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ success: false, message: '获取用户信息失败' });
  }
});

// ==================== 照片路由 ====================

// 获取所有照片
app.get('/api/photos', async (req, res) => {
  try {
    const { category, page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE p.status = ?';
    const params = ['approved'];

    if (category && category !== 'all') {
      whereClause += ' AND p.category = ?';
      params.push(category);
    }

    const [photos] = await db.query(
      `SELECT p.*, u.username as author_name,
        (SELECT COUNT(*) FROM likes WHERE photo_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE photo_id = p.id) as comments_count
       FROM photos p
       LEFT JOIN users u ON p.user_id = u.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({ success: true, data: photos });
  } catch (error) {
    console.error('获取照片列表错误:', error);
    res.status(500).json({ success: false, message: '获取照片列表失败' });
  }
});

// 获取单张照片详情
app.get('/api/photos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [photos] = await db.query(
      `SELECT p.*, u.username as author_name,
        (SELECT COUNT(*) FROM likes WHERE photo_id = p.id) as likes_count,
        (SELECT COUNT(*) FROM comments WHERE photo_id = p.id) as comments_count
       FROM photos p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    if (photos.length === 0) {
      return res.status(404).json({ success: false, message: '照片不存在' });
    }

    res.json({ success: true, data: photos[0] });
  } catch (error) {
    console.error('获取照片详情错误:', error);
    res.status(500).json({ success: false, message: '获取照片详情失败' });
  }
});

// ==================== 收藏路由 ====================

// 获取用户收藏列表
app.get('/api/favorites', authMiddleware, async (req, res) => {
  try {
    const [favorites] = await db.query(
      `SELECT f.*, p.title, p.description, p.url, p.thumbnail_url, p.category, u.username as author_name
       FROM favorites f
       JOIN photos p ON f.photo_id = p.id
       LEFT JOIN users u ON p.user_id = u.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: favorites });
  } catch (error) {
    console.error('获取收藏列表错误:', error);
    res.status(500).json({ success: false, message: '获取收藏列表失败' });
  }
});

// 添加收藏
app.post('/api/favorites', authMiddleware, async (req, res) => {
  try {
    const { photo_id } = req.body;
    if (!photo_id) {
      return res.status(400).json({ success: false, message: '照片ID不能为空' });
    }

    const [existing] = await db.query(
      'SELECT id FROM favorites WHERE user_id = ? AND photo_id = ?',
      [req.user.id, photo_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: '已经收藏过该照片' });
    }

    await db.query('INSERT INTO favorites (user_id, photo_id) VALUES (?, ?)', [req.user.id, photo_id]);
    res.status(201).json({ success: true, message: '收藏成功' });
  } catch (error) {
    console.error('添加收藏错误:', error);
    res.status(500).json({ success: false, message: '收藏失败' });
  }
});

// 取消收藏
app.delete('/api/favorites/:photo_id', authMiddleware, async (req, res) => {
  try {
    const { photo_id } = req.params;
    await db.query('DELETE FROM favorites WHERE user_id = ? AND photo_id = ?', [req.user.id, photo_id]);
    res.json({ success: true, message: '取消收藏成功' });
  } catch (error) {
    console.error('取消收藏错误:', error);
    res.status(500).json({ success: false, message: '取消收藏失败' });
  }
});

// ==================== 评论路由 ====================

// 获取照片评论
app.get('/api/comments/:photo_id', async (req, res) => {
  try {
    const { photo_id } = req.params;
    const [comments] = await db.query(
      `SELECT c.*, u.username as author_name
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.photo_id = ?
       ORDER BY c.created_at DESC`,
      [photo_id]
    );
    res.json({ success: true, data: comments });
  } catch (error) {
    console.error('获取评论错误:', error);
    res.status(500).json({ success: false, message: '获取评论失败' });
  }
});

// 添加评论
app.post('/api/comments', authMiddleware, async (req, res) => {
  try {
    const { photo_id, content } = req.body;
    if (!photo_id || !content) {
      return res.status(400).json({ success: false, message: '照片ID和评论内容不能为空' });
    }

    const [result] = await db.query(
      'INSERT INTO comments (photo_id, user_id, content) VALUES (?, ?, ?)',
      [photo_id, req.user.id, content]
    );

    res.status(201).json({
      success: true,
      message: '评论成功',
      data: { id: result.insertId, photo_id, user_id: req.user.id, content }
    });
  } catch (error) {
    console.error('添加评论错误:', error);
    res.status(500).json({ success: false, message: '评论失败' });
  }
});

// ==================== 点赞路由 ====================

// 点赞/取消点赞
app.post('/api/likes', authMiddleware, async (req, res) => {
  try {
    const { photo_id } = req.body;
    if (!photo_id) {
      return res.status(400).json({ success: false, message: '照片ID不能为空' });
    }

    const [existing] = await db.query(
      'SELECT id FROM likes WHERE user_id = ? AND photo_id = ?',
      [req.user.id, photo_id]
    );

    if (existing.length > 0) {
      await db.query('DELETE FROM likes WHERE user_id = ? AND photo_id = ?', [req.user.id, photo_id]);
      res.json({ success: true, message: '取消点赞成功', liked: false });
    } else {
      await db.query('INSERT INTO likes (user_id, photo_id) VALUES (?, ?)', [req.user.id, photo_id]);
      res.json({ success: true, message: '点赞成功', liked: true });
    }
  } catch (error) {
    console.error('点赞操作错误:', error);
    res.status(500).json({ success: false, message: '操作失败' });
  }
});

// 检查是否已点赞
app.get('/api/likes/:photo_id', authMiddleware, async (req, res) => {
  try {
    const { photo_id } = req.params;
    const [existing] = await db.query(
      'SELECT id FROM likes WHERE user_id = ? AND photo_id = ?',
      [req.user.id, photo_id]
    );
    res.json({ success: true, liked: existing.length > 0 });
  } catch (error) {
    console.error('检查点赞状态错误:', error);
    res.status(500).json({ success: false, message: '检查失败' });
  }
});

// ==================== 健康检查 ====================
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'PhotoShare API 运行正常',
    timestamp: new Date().toISOString()
  });
});

// ==================== 错误处理 ====================
app.use((req, res) => {
  res.status(404).json({ success: false, message: '接口不存在' });
});

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: '文件大小超过限制（最大10MB）' });
  }
  res.status(500).json({ success: false, message: err.message || '服务器内部错误' });
});

module.exports = app;
