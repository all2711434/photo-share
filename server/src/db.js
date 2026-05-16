require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const { Pool } = require("@neondatabase/serverless");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}?sslmode=require`,
  max: 20,
});

const db = {
  async query(sql, params = []) {
    let pgSql = sql;
    let paramIndex = 0;
    pgSql = pgSql.replace(/\?/g, () => {
      paramIndex++;
      return `$${paramIndex}`;
    });
    const result = await pool.query(pgSql, params);
    if (result.rows) {
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

module.exports = db;
