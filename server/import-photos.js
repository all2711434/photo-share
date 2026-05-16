const mysql = require('mysql2/promise');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const photoData = [
  { file: 'P10601590.jpg', title: '古城外卖骑手', desc: '美团外卖骑手穿行于古城街巷中', category: '街拍', tags: '街拍,古城,外卖,人文' },
  { file: 'P10602229.jpg', title: '纳西族服饰', desc: '身着传统民族服饰的纳西族妇女', category: '人像', tags: '人像,民族,纳西族,传统文化' },
  { file: 'P1060231.jpg', title: '古城中的民族风情', desc: '纳西族妇女身着盛装行走在古城之中', category: '街拍', tags: '街拍,民族,古城,文化' },
  { file: 'P1060233.jpg', title: '银饰与传承', desc: '纳西族老人头戴精美银饰', category: '人像', tags: '人像,民族,银饰,传统文化' },
  { file: 'P1060239.jpg', title: '火炬节庆典', desc: '手持花饰火炬的庆典参与者', category: '街拍', tags: '街拍,节日,庆典,火炬' },
  { file: 'P1060240.jpg', title: '摄影师的视角', desc: '摄影师举起相机记录精彩瞬间', category: '人像', tags: '人像,摄影,相机,纪实' },
  { file: 'P10602415.jpg', title: '火炬祈福', desc: '众人合力举起花饰火炬', category: '街拍', tags: '街拍,节日,火炬,祈福' },
  { file: 'P1060245.jpg', title: '火光映天', desc: '暮色中点燃的花饰火炬', category: '街拍', tags: '街拍,节日,火炬,暮色' },
  { file: 'P1082667-HDR.jpg', title: '银河拱桥', desc: 'HDR长曝光拍摄的银河拱桥', category: '星空', tags: '星空,银河,夜景,长曝光' },
  { file: '图片色调统一.png', title: '粉色拱廊', desc: '柔和粉色调的拱廊建筑', category: '建筑', tags: '建筑,拱廊,对称,极简' },
];
async function importPhotos() {
  const connection = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: '123456', database: 'photo_share', charset: 'utf8mb4' });
  const sourceDir = 'D:\\test\\摄影师图片分享网站\\图片';
  const uploadDir = path.join(__dirname, 'uploads', 'photos');
  const thumbDir = path.join(__dirname, 'uploads', 'thumbnails');
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.mkdirSync(thumbDir, { recursive: true });
  try {
    const [categories] = await connection.query('SELECT id, name FROM categories');
    const catMap = {}; categories.forEach(c => catMap[c.name] = c.id);
    const [users] = await connection.query("SELECT id FROM users WHERE username = 'photographer1'");
    const userId = users[0]?.id || 2;
    for (const photo of photoData) {
      const srcPath = path.join(sourceDir, photo.file);
      if (!fs.existsSync(srcPath)) { console.log('SKIP: ' + photo.file); continue; }
      const ext = path.extname(photo.file);
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
      fs.copyFileSync(srcPath, path.join(uploadDir, uniqueName));
      const thumbName = 'thumb_' + uniqueName;
      try { await sharp(path.join(uploadDir, uniqueName)).resize(400, 300, { fit: 'cover' }).toFile(path.join(thumbDir, thumbName)); } catch (e) {}
      let width = 0, height = 0;
      try { const m = await sharp(path.join(uploadDir, uniqueName)).metadata(); width = m.width; height = m.height; } catch(e) {}
      const isFeatured = photoData.indexOf(photo) < 3 ? 1 : 0;
      await connection.query('INSERT INTO photos (user_id, title, description, file_path, thumbnail_path, category_id, tags, width, height, file_size, is_featured, views, likes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [userId, photo.title, photo.desc, '/uploads/photos/' + uniqueName, '/uploads/thumbnails/' + thumbName, catMap[photo.category] || null, photo.tags, width, height, fs.statSync(path.join(uploadDir, uniqueName)).size, isFeatured, Math.floor(Math.random()*500)+100, Math.floor(Math.random()*50)+5]);
      console.log('OK: ' + photo.file + ' -> [' + photo.category + '] ' + photo.title);
    }
    const [result] = await connection.query('SELECT COUNT(*) as total FROM photos');
    console.log('Done! Total: ' + result[0].total);
  } catch (error) { console.error('Error:', error.message); } finally { await connection.end(); }
}
importPhotos();
