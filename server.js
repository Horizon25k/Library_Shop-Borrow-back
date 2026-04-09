const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('./config/db'); // นำเข้าตัวเชื่อมต่อ Database

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const findPrefix = require('npm2/lib/utils/find-prefix');
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
                a.name AS author, -- ดึงชื่อผู้แต่งจากตาราง authors มาโชว์
                c.name AS categories, 
                s.name AS status_name
            FROM books b
            LEFT JOIN categories c ON b.category_id = c.id
            LEFT JOIN statuses s ON b.status_id = s.id
            LEFT JOIN authors a ON b.author_id = a.id
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

        // 1. จัดการเรื่องผู้แต่ง (Author) ก่อน
        let finalAuthorId = null;
        if (author) {
            const checkAuthor = await db.query('SELECT id FROM authors WHERE name = $1', [author]);
            if (checkAuthor.rows.length > 0) {
                finalAuthorId = checkAuthor.rows[0].id; 
            } else {
                const newAuthor = await db.query('INSERT INTO authors (name) VALUES ($1) RETURNING id', [author]);
                finalAuthorId = newAuthor.rows[0].id;
            }
        }

        // 2. บันทึกหนังสือ 
        const sql = `INSERT INTO books (title, author_id, published_year, cover_image, status_id, category_id) 
                    VALUES($1, $2, $3, $4, $5, $6)`;
        await db.query(sql, [title, finalAuthorId, published_year, cover_image, status_id || null, category_id || null]);

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

        let finalAuthorId = null;
        if (author) {
            const checkAuthor = await db.query('SELECT id FROM authors WHERE name = $1', [author]);
            if (checkAuthor.rows.length > 0) {
                finalAuthorId = checkAuthor.rows[0].id;
            } else {
                const newAuthor = await db.query('INSERT INTO authors (name) VALUES ($1) RETURNING id', [author]);
                finalAuthorId = newAuthor.rows[0].id;
            }
        }

        const finalTitle = title || null;
        const finalYear = published_year || null;
        const finalStatus = (status_id === "" || status_id === undefined) ? null : status_id;
        const finalCategory = (category_id === "" || category_id === undefined) ? null : category_id;

        let sql, params;
        if (req.file) {
            const images_url = `/images/${req.file.filename}`;
            sql = `UPDATE books SET title=$1, author_id=$2, published_year=$3, cover_image=$4, status_id=$5, category_id=$6 WHERE id=$7`;
            params = [finalTitle, finalAuthorId, finalYear, images_url, finalStatus, finalCategory, id];
        } else {
            sql = `UPDATE books SET title=$1, author_id=$2, published_year=$3, status_id=$4, category_id=$5 WHERE id=$6`;
            params = [finalTitle, finalAuthorId, finalYear, finalStatus, finalCategory, id];
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

// [8] ยืมหนังสือ
app.post('/api/borrow', async(req,res) => {
    const client = await db.connect();

    try{
        const {book_id, Member_id} = req.body;
        
        const checkBook = await client.query('SELECT title, status_id FROM books WHERE id = $1' , [book_id]);
        if(checkBook.rows.length === 0) return res.status(400).json({message: 'ไม่พบรหัสหนังสือในระบบ'});
        if(checkBook.rows[0].status_id === 2) return res.status(400).json({message:'หนังสือนี้ถูกยืมไปเเล้ว'});
        if(checkBook.rows[0].status_id === 3) return res.status(400).json({message:'หนังสือนี้อยู่ระหว่างการส่งซ่อม'});

        const checkMember = await client.query('SELECT member_name FROM members WHERE id = $1', [Member_id]);
        if(checkMember.rows.length === 0) return res.status(400).json({message:'ไม่พบรหัสสมาชิกนี้'});
        const member_name = checkMember.rows[0].member_name;

        const checkQuota = await client.query(
            `SELECT COUNT(*) FROM borrow_records WHERE member_id = $1 AND actual_return_date IS NULL`, 
            [Member_id]
        );
        const borrowedCount = parseInt(checkQuota.rows[0].count);

        if(borrowedCount >= 5){
            return res.status(400).json({message: `คุณ ${member_name} ยืมครบโควต้า 5 เล่มแล้ว (กำลังยืมอยู่ ${borrowedCount} เล่ม)`});
        }
        
        const borrowDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(borrowDate.getDate() + 7); // วันกำหนดคืน (+7 วัน)

        await client.query('BEGIN');

        const sql = `INSERT INTO borrow_records (book_id, member_id, borrow_date, due_date)
                    VALUES ($1 , $2 , $3 , $4)`;
        await client.query(sql, [book_id, Member_id, borrowDate, dueDate]);

        await client.query(`UPDATE books SET status_id = 2 WHERE id = $1 `, [book_id] );
        await client.query('COMMIT');

        res.json ({
            message: 'บันทึกการยืมสำเร็จ',
            book_title: checkBook.rows[0].title,
            returnDate: dueDate.toLocaleDateString('th-TH')
        });
    }catch(err){
        await client.query('ROLLBACK');
        console.error('Borrow Error:',err);
        res.status(500).json({message:'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์'});
    } finally {
        client.release();
    }
});

// [9] คืนหนังสือ
app.post('/api/returnBook' , async (req,res) => {
    const client = await db.connect();

    try{
        const {book_id, Member_id} = req.body;

        const findRecord = await client.query(
            `SELECT b.id, b.due_date, m.member_name 
            FROM borrow_records b
            LEFT JOIN members m ON b.member_id = m.id 
            WHERE b.book_id = $1 AND b.actual_return_date IS NULL`, 
            [book_id]
        );
        
        if(findRecord.rows.length === 0 ) return res.status(400).json({message:'ไม่พบข้อมูลการยืมของหนังสือเล่มนี้'});

        const record = findRecord.rows[0];
        const dueDate = new Date(record.due_date); // เทียบกับวันกำหนดคืน
        const today = new Date(); // วันนี้ (วันที่นำมาคืนจริง)

        dueDate.setHours(0,0,0,0);
        let actualReturnCompare = new Date(today);
        actualReturnCompare.setHours(0,0,0,0);

        let overDueday = 0;
        let fine = 0;
        const finePriceDay = 10;

        // คำนวณค่าปรับ
        if(actualReturnCompare > dueDate){
            const diffTime = Math.abs(actualReturnCompare - dueDate);
            overDueday = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            fine = overDueday * finePriceDay;
        }

        await client.query('BEGIN');

        await client.query(`UPDATE borrow_records SET actual_return_date = $1 WHERE id = $2`, [today, record.id]);
        await client.query(`UPDATE books SET status_id = 1 WHERE id = $1`, [book_id]);
        
        await client.query('COMMIT');

        res.json({
            message: 'บันทึกการคืนสำเร็จ',
            borrower_name: record.member_name,
            overDueday: overDueday,
            fine: fine
        });
    } catch(err){
        await client.query('ROLLBACK');
        console.error('Return Error:' ,err);
        res.status(500).json({message:'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์'});
    } finally{
        client.release();
    }
});

// [10] ดึงรายการลูกค้าที่กำลังยืมหนังสืออยู่
app.get('/api/active-borrows', async (req, res) => {
    try {
        const sql = `
                SELECT 
                br.id AS borrow_id,
                b.id AS book_id,            
                m.id AS member_id,          
                m.member_name,
                m.member_contact,
                m.member_address,           
                b.title AS book_title,
                br.borrow_date,
                br.due_date
            FROM borrow_records br
            JOIN members m ON br.member_id = m.id
            JOIN books b ON br.book_id = b.id
            WHERE br.actual_return_date IS NULL
            ORDER BY br.due_date ASC  
        `;
        
        const { rows } = await db.query(sql);
        res.json(rows);
    } catch(err) {
        console.error('Fetch Active Borrows Error:', err);
        res.status(500).json({error: 'เกิดข้อผิดพลาดในการดึงข้อมูล'});
    }
});

// สั่งให้ Server เริ่มทำงาน
app.listen(3000, () => console.log(` Server running on port 3000`));