// ไฟล์ db.js
require('dotenv').config(); // 1. สั่งให้ระบบไปอ่านไฟล์ .env ที่เราซ่อนไว้
const { Pool } = require('pg');

// 2. ดึงค่า DATABASE_URL จากไฟล์ .env มาใช้งาน
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