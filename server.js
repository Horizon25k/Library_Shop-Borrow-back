const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('./config/db'); // นำเข้าตัวเชื่อมต่อ Database

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SECRET_KEY = 'MySuperSecretLibraryKey'; // กุญแจลับสำหรับเซิร์ฟเวอร์

const app = express();

// --- Middleware (ตั้งค่าพื้นฐาน) ---
app.use(express.json()); // ให้ Express อ่านข้อมูลแบบ JSON ได้
app.use(express.static('public')); // อนุญาตให้หน้าเว็บดึงไฟล์จากโฟลเดอร์ public (เช่น ไฟล์รูป, index.html)

// --- ตั้งค่าระบบอัปโหลดรูปภาพ (Multer) ---
const storage = multer.diskStorage({
    destination: './public/images/', 
    filename: (req, file, cb) => {
        cb(null,file.originalname);
    }
});
const upload = multer({ storage: storage });

// ==========================================
// API ROUTES (เส้นทางรับส่งข้อมูล)
// ==========================================

// [1] ดึงข้อมูลหนังสือทั้งหมดพร้อมชื่อหมวดหมู่และสถานะ
app.get('/api/libraryshop', async (req, res) => {
    try {
        const sql = `
            SELECT 
                b.*, 
                c.name AS categories, 
                s.name AS status_name
            FROM books b
            LEFT JOIN categories c ON b.category_id = c.id
            LEFT JOIN statuses s ON b.status_id = s.id
            ORDER BY b.id ASC
        `;
        const { rows: books } = await db.query(sql);
        res.json(books);
    } catch(err){
        res.status(500).json({error: err.message});
    }
});

// [2] เพิ่มหนังสือเล่มใหม่ (รับไฟล์รูป 'image')
app.post('/api/libraryshop', upload.single('image'), async (req, res) => {
    try {
        const { title, author, published_year, status_id, category_id } = req.body;
        const cover_image = req.file ? `/images/${req.file.filename}` : `/images/no-image.png`;

        const sql = `INSERT INTO books (title, author, published_year, cover_image, status_id, category_id) 
                    VALUES($1, $2, $3, $4, $5, $6)`;
        await db.query(sql, [title, author, published_year, cover_image, status_id || null, category_id || null]);

        res.json({ message: 'บันทึกข้อมูลสำเร็จ!' });
    } catch(err){
        res.status(500).json({error: err.message});
    }
});

// [3] ดึงรายการหมวดหมู่ (สำหรับ Dropdown)
app.get('/api/categories', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM categories');
        res.json(rows);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// [4] ดึงรายการสถานะ (สำหรับ Dropdown)
app.get('/api/statuses', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM statuses');
        res.json(rows);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// [5] ดึงข้อมูลหนังสือ 1 เล่ม (สำหรับป๊อปอัปแก้ไข)
app.get('/api/libraryshop/:id', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM books WHERE id = $1', [req.params.id]);
        res.json(rows[0]);
    } catch(err){
        res.status(500).json({error: err.message});
    }
});

// [6] บันทึกการแก้ไขข้อมูลหนังสือ (อัปเดต)
app.put('/api/libraryshop/:id', upload.single('images'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, author, published_year, status_id, category_id } = req.body;

        const finalTitle = title || null;
        const finalAuthor = author || null;
        const finalYear = published_year || null;
        const finalStatus = (status_id === "" || status_id === undefined) ? null : status_id;
        const finalCategory = (category_id === "" || category_id === undefined) ? null : category_id;

        let sql, params;

        // เช็กว่ามีการอัปโหลดรูปใหม่เข้ามาด้วยหรือไม่
        if (req.file) {
            const images_url = `/images/${req.file.filename}`;
            sql = `UPDATE books SET title=$1, author=$2, published_year=$3, cover_image=$4, status_id=$5, category_id=$6 WHERE id=$7`;
            params = [finalTitle, finalAuthor, finalYear, images_url, finalStatus, finalCategory, id];
        } else {
            sql = `UPDATE books SET title=$1, author=$2, published_year=$3, status_id=$4, category_id=$5 WHERE id=$6`;
            params = [finalTitle, finalAuthor, finalYear, finalStatus, finalCategory, id];
        }

        await db.query(sql, params);
        res.json({message: 'อัปเดตข้อมูลสำเร็จ'});
    } catch(err){
        console.error("Update Error:", err);
        res.status(500).json({error: err.message});
    }
});

// [7] ลบหนังสือ
app.delete('/api/books/:id', async (req, res) => {
    try {
        const bookid = req.params.id;
        const sql = "DELETE FROM books WHERE id = $1";
        await db.query(sql, [bookid]);
        res.send({ message: "ลบหนังสือสำเร็จ" });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// ==========================================
// 1. API สร้างบัญชีแอดมินอัตโนมัติ (แก้ปัญหารหัส Hash ผิด)
// ==========================================
app.get('/api/setup-admin', async (req, res) => {
    try {
        const plainPassword = 'password123'; 
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        
        await db.query("DELETE FROM users WHERE username = 'admin'");
        await db.query("INSERT INTO users (username, password) VALUES ('admin', $1)", [hashedPassword]);
        
        res.send(`<h2>สร้างบัญชีสำเร็จ!</h2><p>User: <b>admin</b></p><p>Pass: <b>${plainPassword}</b></p>`);
    } catch (err) {
        res.status(500).send("Error: " + err.message);
    }
});

// ==========================================
// 2. API สำหรับ Login
// ==========================================
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        
        const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ message: 'ไม่พบชื่อผู้ใช้งานนี้' });
        }

        const user = rows[0];

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
        }

        // สร้าง Token อายุ 1 วัน
        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1d' });
        
        res.json({ message: 'เข้าสู่ระบบสำเร็จ!', token: token });

    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' });
    }
});

// สั่งให้ Server เริ่มทำงาน
app.listen(3000, () => console.log(` Server running on port 3000`));