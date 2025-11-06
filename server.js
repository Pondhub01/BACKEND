require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const app = express();

// Middleware
app.use(cors()); // เปิดใช้ CORS สำหรับทุก origin
app.use(express.json());

// สร้าง Database Connection Pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

// ==================== Routes ====================

// ทดสอบการเชื่อมต่อ Database
app.get('/ping', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT NOW() AS now');
    res.json({ status: 'ok', time: rows[0].now });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET: ดึงข้อมูลผู้ใช้ทั้งหมด
app.get('/users', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, firstname, fullname, lastname FROM tbl_users'
    );
    res.json(rows);
  } catch (err) {
    console.error('Query error:', err);
    res.status(500).json({ error: 'Query failed' });
  }
});

// GET: ดึงข้อมูลผู้ใช้ตาม ID
app.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT id, firstname, fullname, lastname FROM tbl_users WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Query error:', err);
    res.status(500).json({ error: 'Query failed' });
  }
});

// POST: เพิ่มผู้ใช้ใหม่พร้อม hash password
app.post('/users', async (req, res) => {
  const { firstname, fullname, lastname, password } = req.body;

  try {
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }
    if (!firstname || !lastname) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    // เข้ารหัส password
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO tbl_users (firstname, fullname, lastname, password) VALUES (?, ?, ?, ?)',
      [firstname, fullname, lastname, hashedPassword]
    );

    res.status(201).json({
      id: result.insertId,
      firstname,
      fullname,
      lastname,
      message: 'User created successfully'
    });
  } catch (err) {
    console.error('Insert error:', err);
    res.status(500).json({ error: 'Insert failed' });
  }
});

// PUT: อัปเดตข้อมูลผู้ใช้ (สามารถเปลี่ยนรหัสผ่านได้)
app.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { firstname, fullname, lastname, password } = req.body;

  try {
    let query = 'UPDATE tbl_users SET firstname = ?, fullname = ?, lastname = ?';
    const params = [firstname, fullname, lastname];

    // ถ้ามี password ใหม่ ให้ hash แล้วอัปเดตด้วย
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ', password = ?';
      params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(id);

    const [result] = await db.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// DELETE: ลบผู้ใช้
app.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM tbl_users WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ==================== Start Server ====================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});