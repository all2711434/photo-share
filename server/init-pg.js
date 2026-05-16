const { Pool } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_NeMGZW9A8nDL@ep-noisy-flower-aql7jurh-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

async function initDatabase() {
  let client;
  try {
    console.log('正在连接到 Neon 数据库 (WebSocket)...');
    client = await pool.connect();
    console.log('连接成功！');

    // Read init.sql
    const initSql = fs.readFileSync(path.join(__dirname, '..', 'database', 'init.sql'), 'utf8');

    console.log('开始执行建表脚本...\n');

    await client.query(initSql);

    console.log('\n建表脚本执行成功！');

    // Verify
    console.log('\n========== 验证结果 ==========');

    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('已创建的表:', tables.rows.map(t => t.table_name).join(', '));

    const categories = await client.query('SELECT name FROM categories ORDER BY id');
    console.log('分类数据:', categories.rows.map(c => c.name).join(', '));

    const users = await client.query('SELECT username, role FROM users ORDER BY id');
    console.log('用户数据:', users.rows.map(u => `${u.username}(${u.role})`).join(', '));

  } catch (error) {
    console.error('初始化失败:', error.message);
    if (error.code) console.error('SQL 错误代码:', error.code);
    if (error.detail) console.error('详细信息:', error.detail);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

initDatabase();
