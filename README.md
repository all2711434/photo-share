# 📸 PhotoShare - 摄影师图片分享平台

> 一个具有未来科幻风格的摄影师图片分享网站，支持用户注册登录、图片上传分享、收藏点赞和评论功能。

## 🌌 项目预览

- **科幻UI设计**：赛博朋克风格的深色主题，霓虹蓝紫渐变配色，发光边框和扫描线效果
- **响应式布局**：完美适配桌面端和移动端
- **流畅动效**：悬浮动画、渐入效果、脉冲发光等

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React + Vite + React Router |
| 后端 | Node.js + Express |
| 数据库 | MySQL |
| 认证 | JWT (JSON Web Token) |
| 文件上传 | Multer + Sharp (缩略图生成) |
| 密码加密 | bcryptjs |

## 📁 项目结构

```
摄影师图片分享网站/
├── database/              # 数据库脚本
│   └── init.sql           # 建表脚本 + 初始数据
├── server/                # 后端
│   ├── .env               # 环境变量配置
│   ├── package.json
│   ├── uploads/           # 上传文件目录
│   └── src/
│       ├── app.js         # 入口文件
│       ├── db.js          # 数据库连接
│       ├── middleware/
│       │   ├── auth.js    # JWT认证中间件
│       │   └── upload.js  # 文件上传中间件
│       └── routes/
│           ├── auth.js    # 用户认证API
│           ├── photos.js  # 图片API
│           ├── favorites.js # 收藏API
│           ├── likes.js   # 点赞API
│           └── comments.js # 评论API
└── client/                # 前端 (React + Vite)
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx       # 入口文件
        ├── App.jsx        # 路由配置
        ├── styles/
        │   └── global.css # 科幻风格全局样式
        ├── services/
        │   └── api.js     # API请求封装
        ├── contexts/
        │   └── AuthContext.jsx # 用户认证上下文
        ├── components/
        │   └── Navbar/    # 导航栏组件
        └── pages/
            ├── Auth/      # 登录注册页
            ├── Home/      # 首页（图片瀑布流）
            ├── Explore/   # 探索页
            ├── Upload/    # 上传页
            ├── PhotoDetail/ # 图片详情页
            ├── Favorites/ # 收藏页
            └── Profile/   # 个人主页
```

## 🚀 快速开始

### 1. 环境准备

- Node.js >= 16
- MySQL >= 5.7
- npm 或 yarn

### 2. 数据库初始化

```bash
# 登录MySQL，执行建表脚本
mysql -u root -p < database/init.sql
```

### 3. 配置后端

编辑 `server/.env` 文件，修改数据库连接信息：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=photo_share
JWT_SECRET=自定义一个安全的密钥
```

### 4. 安装依赖并启动

```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install

# 启动后端 (端口 3001)
cd ../server
npm run dev

# 启动前端 (端口 3000)
cd ../client
npm run dev
```

### 5. 访问网站

打开浏览器访问：**http://localhost:3000**

### 测试账户

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | 123456 | 管理员 |
| photographer1 | 123456 | 普通用户 |
| photographer2 | 123456 | 普通用户 |

## 📡 API 接口

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息
- `PUT /api/auth/profile` - 更新用户资料
- `GET /api/auth/:id` - 获取用户公开信息

### 图片相关
- `GET /api/photos` - 获取图片列表（支持分页、分类、搜索、排序）
- `GET /api/photos/featured` - 获取精选图片
- `GET /api/photos/:id` - 获取图片详情
- `POST /api/photos` - 上传图片（需登录）
- `DELETE /api/photos/:id` - 删除图片
- `GET /api/photos/categories/list` - 获取分类列表

### 收藏相关
- `GET /api/favorites` - 获取收藏列表
- `POST /api/favorites/:photoId` - 添加收藏
- `DELETE /api/favorites/:photoId` - 取消收藏
- `GET /api/favorites/check/:photoId` - 检查收藏状态

### 点赞相关
- `POST /api/likes/:photoId` - 点赞
- `DELETE /api/likes/:photoId` - 取消点赞

### 评论相关
- `POST /api/comments/:photoId` - 添加评论
- `DELETE /api/comments/:commentId` - 删除评论

## 🎨 设计特色

- **配色方案**：深空黑底 + 霓虹蓝(#00f0ff) + 星云紫(#7b2ff7) + 品红(#ff2d75)
- **字体**：Orbitron（标题展示）、Rajdhani（副标题）、Exo 2（正文）
- **视觉效果**：发光边框、渐变扫描线、脉冲动画、悬浮粒子背景
- **交互体验**：卡片悬浮上浮、图片缩放、平滑过渡
