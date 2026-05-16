const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ==================== 获取收藏列表 ====================
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM favorites WHERE user_id = ?',
      [req.user.id]
    );

    const [favorites] = await db.query(`
      SELECT
        f.id as favorite_id, f.created_at as favorited_at,
        p.id, p.title, p.description, p.file_path, p.thumbnail_path,
        p.category_id, p.tags, p.views, p.likes, p.width, p.height,
        p.created_at,
        c.name as category_name,
        u.id as user_id, u.username, u.avatar as user_avatar
      FROM favorites f
      LEFT JOIN photos p ON f.photo_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, parseInt(limit), offset]);

    res.json({
      success: true,
      data: {
        favorites,
        pagination: {
          total: countResult[0].total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(countResult[0].total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取收藏列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// ==================== 添加收藏 ====================
router.post('/:photoId', authMiddleware, async (req, res) => {
  try {
    const { photoId } = req.params;

    // 检查图片是否存在
    const [photos] = await db.query('SELECT id FROM photos WHERE id = ?', [photoId]);
    if (photos.length === 0) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      });
    }

    // 检查是否已收藏
    const [existing] = await db.query(
      'SELECT id FROM favorites WHERE user_id = ? AND photo_id = ?',
      [req.user.id, photoId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: '已经收藏了该图片'
      });
    }

    await db.query(
      'INSERT INTO favorites (user_id, photo_id) VALUES (?, ?)',
      [req.user.id, photoId]
    );

    res.status(201).json({
      success: true,
      message: '收藏成功'
    });
  } catch (error) {
    console.error('添加收藏错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// ==================== 取消收藏 ====================
router.delete('/:photoId', authMiddleware, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM favorites WHERE user_id = ? AND photo_id = ?',
      [req.user.id, req.params.photoId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到该收藏记录'
      });
    }

    res.json({
      success: true,
      message: '取消收藏成功'
    });
  } catch (error) {
    console.error('取消收藏错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// ==================== 检查是否已收藏 ====================
router.get('/check/:photoId', authMiddleware, async (req, res) => {
  try {
    const [result] = await db.query(
      'SELECT id FROM favorites WHERE user_id = ? AND photo_id = ?',
      [req.user.id, req.params.photoId]
    );

    res.json({
      success: true,
      data: {
        is_favorited: result.length > 0
      }
    });
  } catch (error) {
    console.error('检查收藏状态错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

module.exports = router;
