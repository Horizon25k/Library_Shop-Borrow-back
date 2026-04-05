const express = require('express');
const multer = require('multer');
const path = require('path');
const app = express();
const db = require('./db');

app.use(express.json());
app.use(express.static('public'));


const storage = multer.diskStorage({
    destination: './public/images/',
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });


app.get('/api/libraryshop', async (req , res) => {
    try {
        const sql = `
            SELECT 
                b.*, 
                c.name AS categories, 
                s.name AS status_name
            FROM books b
            LEFT JOIN categories c ON b.category_id = c.id
            LEFT JOIN statuses s ON b.status_id = s.id
        `;
        
        const { rows: books } = await db.query(sql);
        res.json(books);
    } catch(err){
        res.status(500).json({error : err.message});
    }
});


app.post('/api/libraryshop', upload.single(`image`), async (req,res) => {
    try {
        const {title, author, published_year, status_id, category_id} = req.body;
        const cover_image = req.file ? `/images/${req.file.filename}` : `/images/no-image.png`;

        const sql = `INSERT INTO books (title, author, published_year, cover_image, status_id, category_id) VALUES($1, $2, $3, $4, $5, $6)`;
        await db.query(sql, [title, author, published_year, cover_image, status_id || null, category_id || null]);

        res.json({ message: 'บันทึกข้อมูลสำเร็จ!' });
    } catch(err){
        res.status(500).json({error:err.message});
    }
});

app.get('/api/categories', async (req,res) => {
    try {
        const { rows } = await db.query('SELECT * FROM categories');
        res.json(rows);
    } catch (err) {
        res.status(500).json({error:err.message});
    }
});

app.get('/api/statuses', async (req,res) => {
    try {
        const { rows } = await db.query('SELECT * FROM statuses');
        res.json(rows);
    } catch (err) {
        res.status(500).json({error:err.message});
    }
});

app.get('/api/libraryshop/:id', async (req,res) =>{
    try {
        // เปลี่ยน ? เป็น $1
        const { rows } = await db.query('SELECT * FROM books WHERE id = $1', [req.params.id]);
        res.json(rows[0]);
    } catch(err){
        res.status(500).json({error:err.message});
    }
});

app.put('/api/libraryshop/:id', upload.single('images'), async (req , res) => {
    try {
        const { id } = req.params;
        const { title, author, published_year, status_id, category_id } = req.body;

        const finalTitle = title || null;
        const finalAuthor = author || null;
        const finalYear = published_year || null;
        const finalStatus = (status_id === "" || status_id === undefined) ? null : status_id;
        const finalCategory = (category_id === "" || category_id === undefined) ? null : category_id;

        let sql, params;

        if (req.file){
            const images_url = `/images/${req.file.filename}`;

            sql = `UPDATE books SET title=$1, author=$2, published_year=$3, cover_image=$4, status_id=$5, category_id=$6 WHERE id=$7`;
            params = [finalTitle, finalAuthor, finalYear, images_url, finalStatus, finalCategory, id];
        } else {
            sql = `UPDATE books SET title=$1, author=$2, published_year=$3, status_id=$4, category_id=$5 WHERE id=$6`;
            params = [finalTitle, finalAuthor, finalYear, finalStatus, finalCategory, id];
        }

        await db.query(sql, params);
        res.json({message: 'Update Success'});
    } catch(err){
        console.error("Update Error:", err);
        res.status(500).json({error:err.message});
    }
});

app.delete('/api/books/:id', async (req,res) =>{
    try {
        const bookid = req.params.id;

        const sql = "DELETE FROM books WHERE id = $1";
        await db.query(sql, [bookid]);
        res.send({ message: "Book delete successfully" });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.listen(3000, () => console.log(`Server running on port 3000`));