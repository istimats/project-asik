const express = require('express'); 
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Konfigurasi multer untuk upload gambar
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = 'public/uploads';
        // Buat direktori jika belum ada
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Membuat nama file unik dengan timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 4 * 2048 * 2048 // 2MB limit
    },
    fileFilter: function (req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Hanya file gambar yang diperbolehkan!'));
        }
        cb(null, true);
    }
});

//halaman register
router.get ('/register', (req, res) => {
    res.render('register');
});


router.get('/landing', (req, res) => {
    res.render('landing');
})

router.post('/register', (req, res) => {
    const {username, email, password} = req.body;
    const hashPassword = bcrypt.hashSync(password, 10);
    const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
    db.query(query,[username, email, hashPassword], (err, result) => {
        if (err) throw err;
        res.redirect('/auth/login');
    });
});

router.get('/login', (req, res) => {
    res.render('login');
}); 


router.post('/login', (req, res) => {
    const {username, password} = req.body;
    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
            const user = result[0];
            if (bcrypt.compareSync(password, user.password)) {
                req.session.user = user;
                res.redirect('/auth/beranda');
            } else {
                res.send('Password salah');
            }
        } else {
            res.send('Username tidak ditemukan');
        }
    });
});

router.get('/beranda', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    // Data statis untuk kondisi laut
    const oceanData = {
        temperature: 28.5,
        ph: 8.2,
        salinity: 32.5,
        parameters: {
            temperature: {
                value: 28.5,
                unit: "°C",
                qualification: "Normal",
                color: "#09b24a",
                description: "Suhu air laut dalam kondisi normal untuk ekosistem laut"
            },
            ph: {
                value: 8.2,
                unit: "pH",
                qualification: "Baik",
                color: "#0074d9",
                description: "pH air laut dalam rentang ideal untuk kehidupan laut"
            },
            salinity: {
                value: 32.5,
                unit: "ppt",
                qualification: "Normal",
                color: "#09b24a",
                description: "Kadar garam air laut dalam kondisi normal"
            }
        }
    };

    try {
        res.render('beranda', {
            user: req.session.user,
            oceanData: oceanData
        });
    } catch (error) {
        console.error('Error:', error);
        res.render('beranda', {
            user: req.session.user,
            oceanData: null
        });
    }
});

router.get('/profil', (req, res) => {
    if (req.session.user) {
        res.render('profil', {user: req.session.user});
    } else {
        res.send('anda harus login terlebih dahulu');
        res.redirect('/auth/login');
    }
}); 
router.get('/editprofil', (req, res) => {
    if (req.session.user) {
        res.render('editprofil', {user: req.session.user});
    } else {
        res.send('anda harus login terlebih dahulu');
        res.redirect('/auth/login');
    }
}); 




router.get('/perkiraancuaca', (req, res) => {
    if (req.session.user) {
        res.render('perkiraancuaca', { user: req.session.user });
    } else {
        res.send('anda harus login terlebih dahulu');
        res.redirect('/auth/login');
    }
})
router.get('/komunitas', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    
    try {
        const [diskusi] = await db.promise().query(`
            SELECT d.*, u.username, COUNT(k.id) as jumlah_komentar 
            FROM diskusi d 
            LEFT JOIN users u ON d.user_id = u.id 
            LEFT JOIN komentar k ON d.id = k.diskusi_id 
            GROUP BY d.id 
            ORDER BY d.created_at DESC
        `);
        
        res.render('komunitas', { 
            user: req.session.user,
            diskusi: diskusi
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Terjadi kesalahan');
    }
});

router.get('/edukasi', (req, res) => {
    if (req.session.user) {
        res.render('edukasi', {user: req.session.user});
    } else {
        res.send('anda harus login terlebih dahulu');
        res.redirect('/auth/login');
    }
});



router.get('/logout', (req, res) => {    
    req.session.destroy();
    res.redirect('/auth/login');
})

// Route untuk update profil
router.post('/updateprofil', upload.single('gambar'), async (req, res) => {
    try {
        const { nama, email, telepon } = req.body;
        const userId = req.session.user.id; // Ambil ID dari session

        let updateData = {
            nama,
            email,
            telepon
        };

        // Jika ada file gambar yang diupload
        if (req.file) {
            // Hapus gambar lama jika ada
            const [user] = await db.promise().query('SELECT gambar FROM users WHERE id = ?', [userId]);
            
            if (user[0]?.gambar && user[0].gambar !== '/gambar/openocean.png') {
                const oldImagePath = path.join(__dirname, '..', 'public', user[0].gambar);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }

            // Update path gambar baru
            updateData.gambar = '/uploads/' + req.file.filename;
        }

        // Update database
        await db.promise().query('UPDATE users SET ? WHERE id = ?', [updateData, userId]);

        // Update session dengan data terbaru
        const [updatedUser] = await db.promise().query('SELECT * FROM users WHERE id = ?', [userId]);
        req.session.user = updatedUser[0];

        res.redirect('/auth/beranda');
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).send('Terjadi kesalahan saat memperbarui profil');
    }
});

// Tambah diskusi baru
router.post('/diskusi/baru', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { judul, konten, kategori } = req.body;
    
    try {
        await db.promise().query(
            'INSERT INTO diskusi (judul, konten, kategori, user_id) VALUES (?, ?, ?, ?)',
            [judul, konten, kategori, req.session.user.id]
        );
        res.redirect('/auth/komunitas');
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Terjadi kesalahan' });
    }
});

// Ambil komentar untuk diskusi tertentu
router.get('/diskusi/:id/komentar', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const [komentar] = await db.promise().query(`
            SELECT k.*, u.username 
            FROM komentar k
            JOIN users u ON k.user_id = u.id
            WHERE k.diskusi_id = ?
            ORDER BY k.created_at ASC
        `, [req.params.id]);
        
        res.json(komentar);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Terjadi kesalahan' });
    }
});

// Tambah komentar baru
router.post('/diskusi/:id/komentar', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/auth/login');
        }

        const diskusiId = req.params.id;
        const userId = req.session.user.id;
        const { konten } = req.body;

        // Simpan komentar
        await db.promise().query(
            'INSERT INTO komentar (diskusi_id, user_id, konten) VALUES (?, ?, ?)',
            [diskusiId, userId, konten]
        );

        // Redirect kembali ke halaman diskusi
        res.redirect('/auth/komunitas');

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Terjadi kesalahan saat menambahkan komentar');
    }
});

router.get('/api/water-quality', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        const response = await axios.get("https://api.meersens.com/environment/public/water/current", {
            params: { lat, lng },
            headers: {'apikey': 'rMz2IwA6CSKDn8Lv09ffoDr2L6RiXiCc'}
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching water quality data:', error);
        res.status(500).json({ error: 'Failed to fetch water quality data' });
    }
});

// Data statis kapal untuk contoh
const dataKapal = [
    {
        type: "Feature",
        properties: {
            id: "KP001",
            nama: "Kapal Nelayan 1",
            jenis: "Kapal Penangkap Ikan",
            grid_code: 1
        },
        geometry: {
            type: "Point",
            coordinates: [106.8456, -6.2088]
        }
    },
    {
        type: "Feature",
        properties: {
            id: "KP002",
            nama: "Kapal Nelayan 2",
            jenis: "Kapal Penangkap Ikan",
            grid_code: 2
        },
        geometry: {
            type: "Point",
            coordinates: [106.8256, -6.1988]
        }
    },
    // Tambahkan data kapal lainnya sesuai kebutuhan
];

// Endpoint untuk mendapatkan data kapal
router.get('/api/kapal', (req, res) => {
    try {
        res.json({
            type: "FeatureCollection",
            features: dataKapal
        });
    } catch (error) {
        console.error('Error fetching kapal data:', error);
        res.status(500).json({ error: 'Gagal mengambil data kapal' });
    }
});

module.exports = router;