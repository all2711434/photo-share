const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'require' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// 兼容层：让 MySQL 风格的 const [rows] = await db.query(sql, params) 继续工作
const db = {
  async query(sql, params = []) {
    // 将 MySQL 风格的 ? 占位符转换为 PostgreSQL 的 $1, $2, ...
    let pgSql = sql;
    let paramIndex = 0;
    pgSql = pgSql.replace(/\?/g, () => {
      paramIndex++;
      return `$${paramIndex}`;
    });

    const result = await pool.query(pgSql, params);
    // 对于 SELECT 语句，返回 [rows] 格式（兼容 MySQL 的 db.query 返回值）
    // 对于 INSERT/UPDATE/DELETE，返回 [result] 格式，其中 result 包含 insertId, affectedRows
    if (result.rows) {
      // PostgreSQL 的 INSERT 返回的 rows 中包含 inserted 数据
      // 需要构造兼容 MySQL 的返回格式
      const compatibleResult = {
        ...result,
        insertId: result.rows[0]?.id || 0,
        affectedRows: result.rowCount || 0,
      };
      return [result.rows, compatibleResult];
    }
    return [result];
  }
};

// 测试数据库连接
pool.query('SELECT NOW()')
  .then(res => {
    console.log('数据库连接成功');
  })
  .catch(err => {
    console.error('数据库连接失败:', err.message);
    console.error('请检查 .env 配置文件中的数据库连接信息');
  });

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
  process.exit(-1);
});

module.exports = db;
