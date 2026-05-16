const mysql = require('mysql2/promise');

async function updatePasswords() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '123456',
    database: 'photo_share',
    charset: 'utf8mb4'
  });

  try {
    // 先用bcryptjs生成哈希
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('123456', 10);
    console.log('新密码哈希:', hash);

    // 更新所有用户密码
    await connection.query(
      'UPDATE users SET password = ?',
      [hash]
    );
    console.log('✅ 所有用户密码已更新为 123456');

    // 验证
    const [users] = await connection.query('SELECT username FROM users');
    console.log('已更新用户:', users.map(u => u.username).join(', '));
  } catch (error) {
    console.error('❌ 更新失败:', error.message);
  } finally {
    await connection.end();
  }
}

updatePasswords();
