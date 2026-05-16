const express = require('express');
const db = require('../db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

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
const express = require('express');
const db = require('../db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const sharp = require('sharp');
const path = require('path');
const router = express.Router();

// 七牛云配置
const qiniu = require('qiniu');
const mac = new qiniu.auth.digest.Mac(
  process.env.QINIU_ACCESS_KEY,
  process.env.QINIU_SECRET_KEY
);
const config = new qiniu.conf.Config({
  zone: qiniu.zone.Zone_z0
});
const bucketManager = new qiniu.rs.BucketManager(mac, config);
const formUploader = new qiniu.form_up.FormUploader(config);
const putExtra = new qiniu.form_up.PutExtra();

const BUCKET = process.env.QINIU_BUCKET || 'photo-sharephotoshare';
const QINIU_DOMAIN = process.env.QINIU_DOMAIN || 'tf4xl457r.hn-bkt.clouddn.com';

// 生成七牛云上传凭证
function getUploadToken(key) {
  const options = {
    scope: BUCKET + ':' + key,
    expires: 3600
  };
  const putPolicy = new qiniu.rs.PutPolicy(options);
  return putPolicy.uploadToken(mac);
}

// 上传文件到七牛云
function uploadToQiniu(key, buffer) {
  return new Promise((resolve, reject) => {
    const token = getUploadToken(key);
    formUploader.put(token, key, buffer, putExtra, (err, body, info) => {
      if (err) {
        reject(err);
        return;
      }
      if (info.statusCode === 200) {
        resolve(body);
      } else {
        reject(new Error(body.error || 'Upload failed'));
      }
    });
  });
}

// 从七牛云删除文件
function deleteFromQiniu(key) {
  return new Promise((resolve, reject) => {
    bucketManager.delete(BUCKET, key, (err, respBody, respInfo) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(respInfo.statusCode === 200);
    });
  });
}

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

    if (category) {
      whereClause += ' AND p.category_id = ?';
      params.push(category);
    }

    if (user_id) {
      whereClause += ' AND p.user_id = ?';
      params.push(user_id);
    }

    if (search) {
      whereClause += ' AND (p.title LIKE ? OR p.description LIKE ? OR p.tags LIKE ?)';
      const searchPattern = '%' + search + '%';
      params.push(searchPattern, searchPattern, searchPattern);
    }

    let orderClause = 'ORDER BY p.created_at DESC';
    if (sort === 'popular') orderClause = 'ORDER BY p.views DESC';
    if (sort === 'most_liked') orderClause = 'ORDER BY p.likes DESC';

    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM photos p ' + whereClause,
      params
    );

    const [photos] = await db.query(
      `SELECT
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
    const [photos] = await db.query(
      `SELECT
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
    await db.query('UPDATE photos SET views = views + 1 WHERE id = ?', [req.params.id]);

    const [photos] = await db.query(
      `SELECT
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

    const [comments] = await db.query(
      `SELECT c.*, u.username, u.avatar
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.photo_id = ?
      ORDER BY c.created_at DESC
      LIMIT 50
    `, [req.params.id]);

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

    // 生成文件名
    const ext = path.extname(req.file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + ext;
    const photoKey = 'photos/' + filename;
    const thumbKey = 'thumbnails/thumb_' + filename;

    // 上传原图到七牛云
    await uploadToQiniu(photoKey, req.file.buffer);
    const filePath = 'https://' + QINIU_DOMAIN + '/' + photoKey;

    // 生成缩略图并上传
    const thumbnailBuffer = await sharp(req.file.buffer)
      .resize(400, 300, { fit: 'cover' })
      .toBuffer();
    await uploadToQiniu(thumbKey, thumbnailBuffer);
    const thumbnailFilePath = 'https://' + QINIU_DOMAIN + '/' + thumbKey;

    // 获取图片尺寸
    const metadata = await sharp(req.file.buffer).metadata();

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
        metadata.width,
        metadata.height,
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
      message: '服务器内部错误: ' + error.message
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

    // 从七牛云删除文件
    try {
      if (photos[0].file_path) {
        const url = new URL(photos[0].file_path);
        const photoKey = url.pathname.slice(1);
        await deleteFromQiniu(photoKey);
      }
      if (photos[0].thumbnail_path) {
        const url = new URL(photos[0].thumbnail_path);
        const thumbKey = url.pathname.slice(1);
        await deleteFromQiniu(thumbKey);
      }
    } catch (e) {
      console.warn('删除七牛云文件失败:', e.message);
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
    const [categories] = await db.query(
      `SELECT c.*, COUNT(p.id) as photo_count
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

module.exports = router;      LIMIT 50
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

    await sharp(req.file.path)
      .resize(400, 300, { fit: 'cover' })
      .toFile(thumbnailPath);

    const thumbnailFilePath = `/uploads/thumbnails/${thumbnailFilename}`;

    // 获取图片尺寸
    const metadata = await sharp(req.file.path).metadata();

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
        metadata.width,
        metadata.height,
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
