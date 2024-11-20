const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');

// Buat koneksi database
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '', // sesuaikan dengan password MySQL Anda
    database: 'oceancare',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Route untuk halaman komunitas
router.get('/komunitas', async (req, res) => {
    try {
        const [discussions] = await pool.query(`
            SELECT d.*, u.nama, u.foto_profil,
                   (SELECT COUNT(*) FROM comments WHERE discussion_id = d.id) as comment_count
            FROM discussions d
            JOIN users u ON d.author_id = u.id
            ORDER BY d.created_at DESC
        `);

        res.render('komunitas', {
            discussions: discussions,
            formatDate: (date) => {
                return new Date(date).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Terjadi kesalahan dalam memuat halaman komunitas');
    }
});

// Route untuk membuat diskusi baru
router.post('/api/discussions', async (req, res) => {
    try {
        const { title, content, userId } = req.body;
        const [result] = await pool.query(
            'INSERT INTO discussions (title, content, author_id) VALUES (?, ?, ?)',
            [title, content, userId]
        );

        res.status(201).json({
            id: result.insertId,
            title,
            content,
            author_id: userId
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(400).json({ message: 'Gagal membuat diskusi baru' });
    }
});

// Route untuk mendapatkan komentar
router.get('/api/discussions/:id/comments', async (req, res) => {
    try {
        const [comments] = await pool.query(`
            SELECT c.*, u.nama, u.foto_profil
            FROM comments c
            JOIN users u ON c.author_id = u.id
            WHERE c.discussion_id = ?
            ORDER BY c.created_at ASC
        `, [req.params.id]);

        res.json(comments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Route untuk menambah komentar
router.post('/api/discussions/:id/comments', async (req, res) => {
    try {
        const { content, userId } = req.body;
        const [result] = await pool.query(
            'INSERT INTO comments (content, author_id, discussion_id) VALUES (?, ?, ?)',
            [content, userId, req.params.id]
        );

        const [comment] = await pool.query(`
            SELECT c.*, u.nama, u.foto_profil
            FROM comments c
            JOIN users u ON c.author_id = u.id
            WHERE c.id = ?
        `, [result.insertId]);

        res.status(201).json(comment[0]);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
