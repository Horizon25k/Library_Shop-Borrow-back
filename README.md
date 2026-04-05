คำสั่งในการสร้างProject
npm init -y
npm install express pg dotenv multer mysql2

คำสั่งrun Project
node server.js

โครงสร้างข้อมูล
ใช้ ภาษา java scrip และ html และ express js 

Database ใช้ Neon 
คำสั่งสร้าง DB
Name BD library_db

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    published_year INTEGER NOT NULL,
    cover_image VARCHAR(255) DEFAULT '/images/no-cover.png',
    status_id INTEGER,
    category_id INTEGER,
    CONSTRAINT fk_status FOREIGN KEY (status_id) REFERENCES statuses(id) ON DELETE SET NULL,
    CONSTRAINT fk_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

--Data categories

INSERT INTO categories (name) VALUES 
('นวนิยาย/วรรณกรรม'), 
('วิทยาศาสตร์/เทคโนโลยี'), 
('ประวัติศาสตร์'), 
('จิตวิทยา/พัฒนาตัวเอง'),
('ธุรกิจ/การลงทุน');

--Data statuses

INSERT INTO statuses (name) VALUES 
('ว่าง (Available)'), 
('ถูกยืม (Borrowed)'),
('ส่งซ่อม (Repairing)');

Data Book

INSERT INTO books (title, author, published_year, cover_image, status_id, category_id) VALUES 
('แฮร์รี่ พอตเตอร์ กับศิลาอาถรรพ์', 'J.K. Rowling', 2540, '/images/harry.png', 1, 1),
('Sapiens: เซเปียนส์ ประวัติย่อมนุษยชาติ', 'Yuval Noah Harari', 2554, '/images/sapiens.png', 2, 3),
('Atomic Habits: เพราะชีวิตดีได้กว่าที่เป็น', 'James Clear', 2561, '/images/atomic.png', 1, 4);
