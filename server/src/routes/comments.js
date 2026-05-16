const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ==================== 添加评论 ====================
router.post('/:photoId', authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    const { photoId } = req.params;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '评论内容不能为空'
      });
    }

    // 检查图片是否存在
    const [photos] = await db.query('SELECT id FROM photos WHERE id = ?', [photoId]);
    if (photos.length === 0) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      });
    }

    const [result] = await db.query(
      'INSERT INTO comments (user_id, photo_id, content) VALUES (?, ?, ?)',
      [req.user.id, photoId, content.trim()]
    );

    // 返回新评论（含用户信息）
    const [comment] = await db.query(`
      SELECT c.*, u.username, u.avatar
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      message: '评论成功',
      data: comment[0]
    });
  } catch (error) {
    console.error('添加评论错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// ==================== 删除评论 ====================
router.delete('/:commentId', authMiddleware, async (req, res) => {
  try {
    const [comments] = await db.query(
      'SELECT user_id FROM comments WHERE id = ?',
      [req.params.commentId]
    );

    if (comments.length === 0) {
      return res.status(404).json({
        success: false,
        message: '评论不存在'
      });
    }

    if (comments[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权删除此评论'
      });
    }

    await db.query('DELETE FROM comments WHERE id = ?', [req.params.commentId]);

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除评论错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

module.exports = router;
