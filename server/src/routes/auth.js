const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { generateToken, authMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// ==================== 用户注册 ====================
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 参数验证
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名、邮箱和密码不能为空'
      });
    }

    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({
        success: false,
        message: '用户名长度应在3-50个字符之间'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码长度不能少于6个字符'
      });
    }

    // 检查用户名和邮箱是否已存在
    const [existing] = await db.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: '用户名或邮箱已被注册'
      });
    }

    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 插入用户
    const [result] = await db.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    // 生成令牌
    const token = generateToken({
      id: result.insertId,
      username,
      email,
      role: 'user'
    });

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        token,
        user: {
          id: result.insertId,
          username,
          email,
          avatar: '/uploads/avatars/default.png',
          role: 'user'
        }
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// ==================== 用户登录 ====================
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    // 查找用户
    const [users] = await db.query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, username]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    const user = users[0];

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 生成令牌
    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          bio: user.bio,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// ==================== 获取当前用户信息 ====================
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, username, email, avatar, bio, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const user = users[0];

    // 获取统计数据
    const [stats] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM photos WHERE user_id = ?) as photo_count,
        (SELECT COUNT(*) FROM favorites WHERE user_id = ?) as favorite_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as following_count,
        (SELECT COUNT(*) FROM follows WHERE following_id = ?) as followers_count
    `, [user.id, user.id, user.id, user.id]);

    res.json({
      success: true,
      data: {
        ...user,
        stats: stats[0]
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// ==================== 更新用户信息 ====================
router.put('/profile', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    const { bio } = req.body;
    const updates = [];
    const params = [];

    if (bio !== undefined) {
      updates.push('bio = ?');
      params.push(bio);
    }

    if (req.file) {
      updates.push('avatar = ?');
      params.push(`/uploads/avatars/${req.file.filename}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有需要更新的内容'
      });
    }

    params.push(req.user.id);
    await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const [users] = await db.query(
      'SELECT id, username, email, avatar, bio, role FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({
      success: true,
      message: '更新成功',
      data: users[0]
    });
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// ==================== 获取用户公开信息 ====================
router.get('/:id', async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, username, avatar, bio, role, created_at FROM users WHERE id = ?',
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const user = users[0];

    const [stats] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM photos WHERE user_id = ?) as photo_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as following_count,
        (SELECT COUNT(*) FROM follows WHERE following_id = ?) as followers_count
    `, [user.id, user.id, user.id]);

    res.json({
      success: true,
      data: {
        ...user,
        stats: stats[0]
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

module.exports = router;
