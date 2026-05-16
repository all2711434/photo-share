-- ============================================
-- 摄影师图片分享网站 - 数据库建表脚本 (PostgreSQL)
-- 数据库: neondb
-- ============================================

-- 用户表
DROP TABLE IF EXISTS follows CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  avatar VARCHAR(500) DEFAULT '/uploads/avatars/default.png',
  bio VARCHAR(500) DEFAULT '',
  role VARCHAR(10) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- updated_at 自动更新触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- 图片分类表
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(200) DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 图片表
CREATE TABLE photos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  file_path VARCHAR(500) NOT NULL,
  thumbnail_path VARCHAR(500) DEFAULT '',
  category_id INTEGER DEFAULT NULL REFERENCES categories(id) ON DELETE SET NULL,
  tags VARCHAR(500) DEFAULT '',
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  width INTEGER DEFAULT 0,
  height INTEGER DEFAULT 0,
  file_size BIGINT DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER photos_updated_at
  BEFORE UPDATE ON photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_photos_user_id ON photos(user_id);
CREATE INDEX idx_photos_category_id ON photos(category_id);
CREATE INDEX idx_photos_created_at ON photos(created_at);
CREATE INDEX idx_photos_views ON photos(views);
CREATE INDEX idx_photos_likes ON photos(likes);

-- 收藏表
CREATE TABLE favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, photo_id)
);

CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_photo_id ON favorites(photo_id);

-- 点赞表
CREATE TABLE likes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, photo_id)
);

CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_photo_id ON likes(photo_id);

-- 评论表
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_comments_photo_id ON comments(photo_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);

-- 关注表
CREATE TABLE follows (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (follower_id, following_id)
);

CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);

-- ============================================
-- 插入默认分类数据
-- ============================================
INSERT INTO categories (name, description) VALUES
('风景', '自然风光、城市景观'),
('人像', '人物摄影、肖像'),
('街拍', '街头纪实、人文'),
('建筑', '建筑摄影、室内设计'),
('美食', '美食摄影'),
('动物', '野生动物、宠物'),
('黑白', '黑白摄影'),
('星空', '天文摄影、夜景'),
('微距', '微距摄影'),
('航拍', '无人机航拍');

-- ============================================
-- 插入测试用户 (密码: 123456 的bcrypt哈希)
-- ============================================
INSERT INTO users (username, email, password, avatar, bio, role) VALUES
('admin', 'admin@photoshare.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '/uploads/avatars/default.png', '系统管理员', 'admin'),
('photographer1', 'photo1@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '/uploads/avatars/default.png', '热爱风光摄影的自由摄影师', 'user'),
('photographer2', 'photo2@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '/uploads/avatars/default.png', '专注人像与街拍', 'user');
