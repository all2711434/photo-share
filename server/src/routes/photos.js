const express = require('express');
const db = require('../db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

// sharp 仅在上传时按需加载（Vercel 环境可能不支持）
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('sharp 模块加载失败，图片上传功能将不可用:', e.message);
}

const router = express.Router();

// ==================== 获取图片列表（瀑布流） ====================
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      sort = 'latest',
      search,
      user_id
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let whereClause = 'WHERE 1=1';
    const params = [];

    // 分类筛选
    if (category) {
      whereClause += ' AND p.category_id = ?';
      params.push(category);
    }

    // 用户筛选
    if (user_id) {
      whereClause += ' AND p.user_id = ?';
      params.push(user_id);
    }

    // 搜索
    if (search) {
      whereClause += ' AND (p.title LIKE ? OR p.description LIKE ? OR p.tags LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // 排序
    let orderClause = 'ORDER BY p.created_at DESC';
    if (sort === 'popular') orderClause = 'ORDER BY p.views DESC';
    if (sort === 'most_liked') orderClause = 'ORDER BY p.likes DESC';

    // 查询总数
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM photos p ${whereClause}`,
      params
    );

    // 查询图片列表
    const [photos] = await db.query(`
      SELECT
        p.id, p.title, p.description, p.file_path, p.thumbnail_path,
        p.category_id, p.tags, p.views, p.likes, p.width, p.height,
        p.is_featured, p.created_at,
        c.name as category_name,
        u.id as user_id, u.username, u.avatar as user_avatar
      FROM photos p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    // 如果用户已登录，查询收藏状态
    let favoriteIds = new Set();
    if (req.user) {
      const [favorites] = await db.query(
        'SELECT photo_id FROM favorites WHERE user_id = ?',
        [req.user.id]
      );
      favoriteIds = new Set(favorites.map(f => f.photo_id));
    }

    const photosWithStatus = photos.map(photo => ({
      ...photo,
      is_favorited: favoriteIds.has(photo.id)
    }));

    res.json({
      success: true,
      data: {
        photos: photosWithStatus,
        pagination: {
          total: countResult[0].total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(countResult[0].total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取图片列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// ==================== 获取精选图片 ====================
router.get('/featured', optionalAuth, async (req, res) => {
  try {
    const [photos] = await db.query(`
      SELECT
        p.id, p.title, p.description, p.file_path, p.thumbnail_path,
        p.category_id, p.tags, p.views, p.likes, p.width, p.height,
        p.is_featured, p.created_at,
        c.name as category_name,
        u.id as user_id, u.username, u.avatar as user_avatar
      FROM photos p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.is_featured = true
      ORDER BY p.created_at DESC
      LIMIT 10
    `);

    let favoriteIds = new Set();
    if (req.user) {
      const [favorites] = await db.query(
        'SELECT photo_id FROM favorites WHERE user_id = ?',
        [req.user.id]
      );
      favoriteIds = new Set(favorites.map(f => f.photo_id));
    }

    const photosWithStatus = photos.map(photo => ({
      ...photo,
      is_favorited: favoriteIds.has(photo.id)
    }));

    res.json({
      success: true,
      data: photosWithStatus
    });
  } catch (error) {
    console.error('获取精选图片错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// ==================== 获取单张图片详情 ====================
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    // 增加浏览量
    await db.query('UPDATE photos SET views = views + 1 WHERE id = ?', [req.params.id]);

    const [photos] = await db.query(`
      SELECT
        p.*,
        c.name as category_name,
        u.id as user_id, u.username, u.avatar as user_avatar, u.bio as user_bio
      FROM photos p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (photos.length === 0) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      });
    }

    const photo = photos[0];

    // 获取评论
    const [comments] = await db.query(`
      SELECT c.*, u.username, u.avatar
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.photo_id = ?
      ORDER BY c.created_at DESC
      LIMIT 50
    `, [req.params.id]);

    // 收藏状态
    let is_favorited = false;
    let is_liked = false;
    if (req.user) {
      const [fav] = await db.query(
        'SELECT id FROM favorites WHERE user_id = ? AND photo_id = ?',
        [req.user.id, req.params.id]
      );
      is_favorited = fav.length > 0;

      const [like] = await db.query(
        'SELECT id FROM likes WHERE user_id = ? AND photo_id = ?',
        [req.user.id, req.params.id]
      );
      is_liked = like.length > 0;
    }

    res.json({
      success: true,
      data: {
        ...photo,
        is_favorited,
        is_liked,
        comments
      }
    });
  } catch (error) {
    console.error('获取图片详情错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// ==================== 上传图片 ====================
router.post('/', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    const { title, description, category_id, tags } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的图片'
      });
    }

    if (!title) {
      return res.status(400).json({
        success: false,
        message: '请输入图片标题'
      });
    }

    const filePath = `/uploads/photos/${req.file.filename}`;

    // 生成缩略图
    const thumbnailFilename = `thumb_${req.file.filename}`;
    const thumbnailPath = path.join(__dirname, '../../uploads/thumbnails', thumbnailFilename);

    if (sharp) {
      await sharp(req.file.path)
        .resize(400, 300, { fit: 'cover' })
        .toFile(thumbnailPath);
    }

    const thumbnailFilePath = `/uploads/thumbnails/${thumbnailFilename}`;

    // 获取图片尺寸
    let width = 0, height = 0;
    if (sharp) {
      const metadata = await sharp(req.file.path).metadata();
      width = metadata.width;
      height = metadata.height;
    }

    // 保存到数据库
    const [result] = await db.query(
      `INSERT INTO photos (user_id, title, description, file_path, thumbnail_path, category_id, tags, width, height, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        title,
        description || '',
        filePath,
        thumbnailFilePath,
        category_id || null,
        tags || '',
        width,
        height,
        req.file.size
      ]
    );

    res.status(201).json({
      success: true,
      message: '上传成功',
      data: {
        id: result.insertId,
        title,
        file_path: filePath,
        thumbnail_path: thumbnailFilePath
      }
    });
  } catch (error) {
    console.error('上传图片错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// ==================== 删除图片 ====================
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [photos] = await db.query(
      'SELECT user_id, file_path, thumbnail_path FROM photos WHERE id = ?',
      [req.params.id]
    );

    if (photos.length === 0) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      });
    }

    if (photos[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权删除此图片'
      });
    }

    // 删除文件
    const basePath = path.join(__dirname, '../..');
    try {
      if (photos[0].file_path) {
        fs.unlinkSync(path.join(basePath, photos[0].file_path));
      }
      if (photos[0].thumbnail_path) {
        fs.unlinkSync(path.join(basePath, photos[0].thumbnail_path));
      }
    } catch (e) {
      console.warn('删除文件失败:', e.message);
    }

    await db.query('DELETE FROM photos WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除图片错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// ==================== 获取分类列表 ====================
router.get('/categories/list', async (req, res) => {
  try {
    const [categories] = await db.query(`
      SELECT c.*, COUNT(p.id) as photo_count
      FROM categories c
      LEFT JOIN photos p ON c.id = p.category_id
      GROUP BY c.id
      ORDER BY photo_count DESC
    `);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('获取分类列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

module.exports = router;
