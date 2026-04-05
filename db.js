
require('dotenv').config(); // 
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: connectionString,
});

pool.connect((err, client, release) => {
    if (err) {
        return console.error('เชื่อมต่อฐานข้อมูล Neon ไม่สำเร็จ:', err.stack);
    }
        console.log('เชื่อมต่อฐานข้อมูล Neon สำเร็จแล้ว!');
        release();
    });

module.exports = pool;