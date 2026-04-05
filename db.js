require('dotenv').config(); 
const { Pool } = require('pg');

// ดึงลิงก์เชื่อมต่อฐานข้อมูลจากไฟล์ .env
const connectionString = process.env.DATABASE_URL;

// สร้าง Connection Pool (ระบบจัดการคิวการเชื่อมต่อฐานข้อมูล)
const pool = new Pool({
    connectionString: connectionString,
});

// ทดสอบการเชื่อมต่อเมื่อเริ่มระบบ
pool.connect((err, client, release) => {
    if (err) {
        return console.error('เชื่อมต่อฐานข้อมูล Neon ไม่สำเร็จ:', err.stack);
    }
    console.log('เชื่อมต่อฐานข้อมูล Neon สำเร็จแล้ว!');
    release(); // คืนการเชื่อมต่อให้ Pool
});

// ส่งออก pool ไปให้ไฟล์อื่น (เช่น server.js) ใช้งานต่อ
module.exports = pool;