import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// إنشاء اتصال واحد قابل لإعادة الاستخدام
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'reliq_db',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

/**
 * دالة تنفيذ الاستعلامات بأمان
 * @param {string} sql - جملة الاستعلام
 * @param {Array} params - معاملات الاستعلام
 * @returns {Promise<Array>} نتائج الاستعلام
 */
export const query = async (sql, params = []) => {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('❌ Database Query Error:', {
      sql,
      params,
      error: error.message,
      code: error.code
    });
    throw error;
  }
};

/**
 * دالة فحص اتصال قاعدة البيانات
 * @returns {Promise<boolean>} حالة الاتصال
 */
export const checkConnection = async () => {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Connected to MySQL database');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

export default pool;