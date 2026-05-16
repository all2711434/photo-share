const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ==================== 点赞 ====================
router.post('/:photoId', authMiddleware, async (req, res) => {
  try {
    const { photoId } = req.params;

    const [existing] = await db.query(
      'SELECT id FROM likes WHERE user_id = ? AND photo_id = ?',
      [req.user.id, photoId]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: '已经点赞了该图片'
      });
    }

    await db.query(
      'INSERT INTO likes (user_id, photo_id) VALUES (?, ?)',
      [req.user.id, photoId]
    );

    // 更新图片点赞数
    await db.query(
      'UPDATE photos SET likes = likes + 1 WHERE id = ?',
      [photoId]
    );

    res.status(201).json({
      success: true,
      message: '点赞成功'
    });
  } catch (error) {
    console.error('点赞错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// ==================== 取消点赞 ====================
router.delete('/:photoId', authMiddleware, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM likes WHERE user_id = ? AND photo_id = ?',
      [req.user.id, req.params.photoId]
    );

    if (result.affectedRows > 0) {
      await db.query(
        'UPDATE photos SET likes = GREATEST(likes - 1, 0) WHERE id = ?',
        [req.params.photoId]
      );
    }

    res.json({
      success: true,
      message: '取消点赞成功'
    });
  } catch (error) {
    console.error('取消点赞错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

module.exports = router;
