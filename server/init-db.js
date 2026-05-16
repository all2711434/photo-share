const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initDB() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '123456',
    multipleStatements: true,
    charset: 'utf8mb4'
  });

  try {
    console.log('✅ 数据库连接成功');

    const sqlFile = path.join(__dirname, '..', 'database', 'init.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    await connection.query(sql);
    console.log('✅ 数据库初始化完成！');

    const [tables] = await connection.query('SHOW TABLES');
    console.log('📋 已创建的表:', tables.map(t => Object.values(t)[0]).join(', '));

    const [users] = await connection.query('SELECT username, email FROM photo_share.users');
    console.log('👤 测试用户:', users.map(u => `${u.username} (${u.email})`).join(', '));

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
  } finally {
    await connection.end();
  }
}

initDB();
