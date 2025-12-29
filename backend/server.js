
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3001;

// Configuració
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const DB_PATH = path.join(__dirname, 'database', 'harmonia.db');
const JWT_SECRET = process.env.JWT_SECRET || 'secret-de-prova-canvia-a-produccio';

// Inicialitzar directoris
async function initialize() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  
  // Crear base de dades si no existeix
  if (!(await fs.access(DB_PATH).then(() => true).catch(() => false))) {
    console.log('⚠️  Base de dades no trobada. Executant init-db.js...');
    require('./init-db.js');
  }
}

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

// Configuració multer per a pujar fitxers
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const today = new Date().toISOString().split('T')[0];
    const dayDir = path.join(UPLOAD_DIR, today);
    await fs.mkdir(dayDir, { recursive: true });
    cb(null, dayDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, uniqueName + ext);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif|bmp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Només es permeten imatges'));
    }
  }
});

// Connexió a SQLite
let db;
try {
  db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  console.log('📊 Connexió a SQLite establerta');
} catch (err) {
  console.error('❌ Error connectant a SQLite:', err);
  process.exit(1);
}

// Middleware per injectar db
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Middleware d'autenticació
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionat' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token invàlid' });
  }
};

// Middleware per obtenir usuari (opcional)
const getOptionalUser = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // Token invàlid, però no bloquegem la petició
      req.user = null;
    }
  }
  next();
};

// ===== RUTES D'AUTENTICACIÓ =====

// Registre
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, nom_usuari, password, nom_display } = req.body;

    // Validacions bàsiques
    if (!email || !nom_usuari || !password) {
      return res.status(400).json({ error: 'Falten camps obligatoris' });
    }

    // Verificar si l'usuari ja existeix
    const existingUser = req.db.prepare(
      'SELECT id FROM usuaris WHERE email = ? OR nom_usuari = ?'
    ).get(email, nom_usuari);

    if (existingUser) {
      return res.status(400).json({ error: 'Usuari o email ja existent' });
    }

    // Encriptar password
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear usuari
    const stmt = req.db.prepare(`
      INSERT INTO usuaris (email, nom_usuari, nom_display, password_hash, rol, verificat, actiu)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      email,
      nom_usuari,
      nom_display || nom_usuari,
      passwordHash,
      'usuari',
      0,
      1
    );

    // Generar token JWT
    const token = jwt.sign(
      { 
        sub: result.lastInsertRowid,
        email: email,
        nom_usuari: nom_usuari,
        rol: 'usuari'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: result.lastInsertRowid,
        email,
        nom_usuari,
        nom_display: nom_display || nom_usuari,
        rol: 'usuari'
      }
    });
  } catch (error) {
    console.error('Error en registre:', error);
    res.status(500).json({ error: 'Error en el registre' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email i contrasenya requerits' });
    }

    // Buscar usuari
    const user = req.db.prepare(
      'SELECT * FROM usuaris WHERE email = ? AND actiu = 1'
    ).get(email);

    if (!user) {
      return res.status(401).json({ error: 'Credencials incorrectes' });
    }

    // Verificar password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credencials incorrectes' });
    }

    // Generar token
    const token = jwt.sign(
      { 
        sub: user.id,
        email: user.email,
        nom_usuari: user.nom_usuari,
        rol: user.rol
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Actualitzar darrer login
    req.db.prepare(
      'UPDATE usuaris SET darrer_login = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(user.id);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        nom_usuari: user.nom_usuari,
        nom_display: user.nom_display,
        rol: user.rol
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error en el login' });
  }
});

// Perfil de l'usuari
app.get('/api/auth/profile', authenticateToken, (req, res) => {
  try {
    const user = req.db.prepare(
      'SELECT id, email, nom_usuari, nom_display, rol, creat_a FROM usuaris WHERE id = ?'
    ).get(req.user.sub);

    if (!user) {
      return res.status(404).json({ error: 'Usuari no trobat' });
    }

    res.json({
      success: true,
      user: {
        ...user,
        creat_a: new Date(user.creat_a).toISOString()
      }
    });
  } catch (error) {
    console.error('Error obtenint perfil:', error);
    res.status(500).json({ error: 'Error obtenint perfil' });
  }
});

// ===== RUTES DE PARTITURES =====

// Pujar partitura (requereix autenticació)
app.post('/api/partitures/upload', authenticateToken, upload.single('imatge'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Cap fitxer pujat' });
    }

    const { titol, descripcio = '', publica = true, permet_anotacions = true } = req.body;
    
    // Ruta relativa per a guardar a la BD
    const relPath = `/uploads/${path.basename(path.dirname(req.file.path))}/${req.file.filename}`;
    
    const stmt = req.db.prepare(`
      INSERT INTO partitures (usuari_id, titol, descripcio, nom_fitxer, ruta_fitxer, 
                             nom_original, mida, tipus_mime, publica, permet_anotacions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      req.user.sub,
      titol || path.parse(req.file.originalname).name,
      descripcio,
      req.file.filename,
      relPath,
      req.file.originalname,
      req.file.size,
      req.file.mimetype,
      publica ? 1 : 0,
      permet_anotacions ? 1 : 0
    );

    // Obtenir la partitura creada
    const partitura = req.db.prepare(`
      SELECT p.*, u.nom_usuari, u.nom_display 
      FROM partitures p
      LEFT JOIN usuaris u ON p.usuari_id = u.id
      WHERE p.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      partitura: {
        ...partitura,
        imatge_url: `http://${req.get('host')}${partitura.ruta_fitxer}`,
        creat_a: new Date(partitura.creat_a).toISOString(),
        actualitzat_a: new Date(partitura.actualitzat_a).toISOString(),
        publica: Boolean(partitura.publica),
        permet_anotacions: Boolean(partitura.permet_anotacions)
      }
    });
  } catch (error) {
    console.error('Error pujant partitura:', error);
    res.status(500).json({ error: 'Error pujant la partitura' });
  }
});

// Obtenir totes les partitures (amb autenticació opcional)
app.get('/api/partitures', getOptionalUser, (req, res) => {
  try {
    const { page = 1, limit = 20, usuari_id } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT p.*, u.nom_usuari, u.nom_display,
      (SELECT COUNT(*) FROM anotacions a WHERE a.partitura_id = p.id) as anotacions_count,
      (SELECT COUNT(*) FROM comentaris c WHERE c.partitura_id = p.id) as comentaris_count
      FROM partitures p
      LEFT JOIN usuaris u ON p.usuari_id = u.id
      WHERE p.publica = 1
    `;
    
    const params = [];
    
    // Si l'usuari està autenticat, pot veure les seves partitures no públiques
    if (req.user) {
      query = query.replace('WHERE p.publica = 1', 'WHERE (p.publica = 1 OR p.usuari_id = ?)');
      params.push(req.user.sub);
    }
    
    if (usuari_id) {
      query += ' AND p.usuari_id = ?';
      params.push(usuari_id);
    }
    
    query += ' ORDER BY p.creat_a DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const partitures = req.db.prepare(query).all(...params);
    
    // Total per a paginació
    let totalQuery = 'SELECT COUNT(*) as total FROM partitures WHERE publica = 1';
    let totalParams = [];
    
    if (req.user) {
      totalQuery = 'SELECT COUNT(*) as total FROM partitures WHERE publica = 1 OR usuari_id = ?';
      totalParams.push(req.user.sub);
    }
    
    const total = req.db.prepare(totalQuery).get(...totalParams).total;
    
    // Convertir dates i afegir URL completa
    const partituresProcessades = partitures.map(p => ({
      ...p,
      imatge_url: `http://${req.get('host')}${p.ruta_fitxer}`,
      creat_a: new Date(p.creat_a).toISOString(),
      actualitzat_a: new Date(p.actualitzat_a).toISOString(),
      publica: Boolean(p.publica),
      permet_anotacions: Boolean(p.permet_anotacions),
      anotacions_count: parseInt(p.anotacions_count),
      comentaris_count: parseInt(p.comentaris_count)
    }));
    
    res.json({
      success: true,
      partitures: partituresProcessades,
      paginacio: {
        pagina: parseInt(page),
        limit: parseInt(limit),
        total,
        pagines: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error obtenint partitures:', error);
    res.status(500).json({ error: 'Error obtenint partitures' });
  }
});

// Obtenir una partitura específica
app.get('/api/partitures/:id', getOptionalUser, (req, res) => {
  try {
    const { id } = req.params;
    
    const partitura = req.db.prepare(`
      SELECT p.*, u.nom_usuari, u.nom_display 
      FROM partitures p
      LEFT JOIN usuaris u ON p.usuari_id = u.id
      WHERE p.id = ?
    `).get(id);
    
    if (!partitura) {
      return res.status(404).json({ error: 'Partitura no trobada' });
    }
    
    // Verificar accés
    if (!partitura.publica && (!req.user || req.user.sub !== partitura.usuari_id)) {
      return res.status(403).json({ error: 'No tens accés a aquesta partitura' });
    }
    
    res.json({
      success: true,
      partitura: {
        ...partitura,
        imatge_url: `http://${req.get('host')}${partitura.ruta_fitxer}`,
        creat_a: new Date(partitura.creat_a).toISOString(),
        actualitzat_a: new Date(partitura.actualitzat_a).toISOString(),
        publica: Boolean(partitura.publica),
        permet_anotacions: Boolean(partitura.permet_anotacions)
      }
    });
  } catch (error) {
    console.error('Error obtenint partitura:', error);
    res.status(500).json({ error: 'Error obtenint partitura' });
  }
});

// Eliminar partitura (només propietari o admin)
app.delete('/api/partitures/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que la partitura existeix i pertany a l'usuari
    const partitura = req.db.prepare(
      'SELECT * FROM partitures WHERE id = ?'
    ).get(id);
    
    if (!partitura) {
      return res.status(404).json({ error: 'Partitura no trobada' });
    }
    
    // Verificar permisos
    if (partitura.usuari_id !== req.user.sub && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'No tens permís per eliminar aquesta partitura' });
    }
    
    // Eliminar anotacions i comentaris (cascade)
    // Eliminar fitxer físic
    const filePath = path.join(__dirname, partitura.ruta_fitxer);
    fs.unlink(filePath).catch(() => {}); // Ignorar errors si el fitxer no existeix
    
    // Eliminar de la base de dades
    req.db.prepare('DELETE FROM partitures WHERE id = ?').run(id);
    
    res.json({ success: true, message: 'Partitura eliminada' });
  } catch (error) {
    console.error('Error eliminant partitura:', error);
    res.status(500).json({ error: 'Error eliminant partitura' });
  }
});

// ===== RUTES D'ANOTACIONS =====

// Crear anotació
app.post('/api/anotacions', authenticateToken, (req, res) => {
  try {
    const { partitura_id, dades_anotacio, color = '#ff0000', eina_utilitzada = 'llapis' } = req.body;
    
    // Verificar que la partitura existeix i permet anotacions
    const partitura = req.db.prepare(
      'SELECT * FROM partitures WHERE id = ?'
    ).get(partitura_id);
    
    if (!partitura) {
      return res.status(404).json({ error: 'Partitura no trobada' });
    }
    
    if (!partitura.permet_anotacions) {
      return res.status(403).json({ error: 'Aquesta partitura no permet anotacions' });
    }
    
    const stmt = req.db.prepare(`
      INSERT INTO anotacions (partitura_id, usuari_id, dades_anotacio, color, eina_utilitzada)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      partitura_id,
      req.user.sub,
      JSON.stringify(dades_anotacio),
      color,
      eina_utilitzada
    );
    
    // Obtenir l'anotació creada
    const anotacio = req.db.prepare(`
      SELECT a.*, u.nom_usuari, u.nom_display 
      FROM anotacions a
      LEFT JOIN usuaris u ON a.usuari_id = u.id
      WHERE a.id = ?
    `).get(result.lastInsertRowid);
    
    res.status(201).json({
      success: true,
      anotacio: {
        ...anotacio,
        dades_anotacio: JSON.parse(anotacio.dades_anotacio),
        creat_a: new Date(anotacio.creat_a).toISOString(),
        actualitzat_a: new Date(anotacio.actualitzat_a).toISOString(),
        acceptada: Boolean(anotacio.acceptada),
        revisada: Boolean(anotacio.revisada)
      }
    });
  } catch (error) {
    console.error('Error creant anotació:', error);
    res.status(500).json({ error: 'Error creant anotació' });
  }
});

// Obtenir anotacions d'una partitura
app.get('/api/anotacions', getOptionalUser, (req, res) => {
  try {
    const { partitura_id } = req.query;
    
    const anotacions = req.db.prepare(`
      SELECT a.*, u.nom_usuari, u.nom_display 
      FROM anotacions a
      LEFT JOIN usuaris u ON a.usuari_id = u.id
      WHERE a.partitura_id = ?
      ORDER BY a.creat_a ASC
    `).all(partitura_id);
    
    const anotacionsProcessades = anotacions.map(a => ({
      ...a,
      dades_anotacio: JSON.parse(a.dades_anotacio),
      creat_a: new Date(a.creat_a).toISOString(),
      actualitzat_a: new Date(a.actualitzat_a).toISOString(),
      acceptada: Boolean(a.acceptada),
      revisada: Boolean(a.revisada)
    }));
    
    res.json({
      success: true,
      anotacions: anotacionsProcessades
    });
  } catch (error) {
    console.error('Error obtenint anotacions:', error);
    res.status(500).json({ error: 'Error obtenint anotacions' });
  }
});

// Actualitzar anotació (marcar com acceptada/revisada)
app.patch('/api/anotacions/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { acceptada, revisada } = req.body;
    
    // Verificar que l'anotació existeix
    const anotacio = req.db.prepare(
      'SELECT * FROM anotacions WHERE id = ?'
    ).get(id);
    
    if (!anotacio) {
      return res.status(404).json({ error: 'Anotació no trobada' });
    }
    
    // Verificar permisos (només propietari de la partitura o admin)
    const partitura = req.db.prepare(
      'SELECT * FROM partitures WHERE id = ?'
    ).get(anotacio.partitura_id);
    
    if (partitura.usuari_id !== req.user.sub && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'No tens permís per modificar aquesta anotació' });
    }
    
    const stmt = req.db.prepare(`
      UPDATE anotacions 
      SET acceptada = ?, revisada = ?, actualitzat_a = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run(
      acceptada ? 1 : 0,
      revisada ? 1 : 0,
      id
    );
    
    res.json({ success: true, message: 'Anotació actualitzada' });
  } catch (error) {
    console.error('Error actualitzant anotació:', error);
    res.status(500).json({ error: 'Error actualitzant anotació' });
  }
});

// Eliminar anotació
app.delete('/api/anotacions/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que l'anotació existeix
    const anotacio = req.db.prepare(
      'SELECT * FROM anotacions WHERE id = ?'
    ).get(id);
    
    if (!anotacio) {
      return res.status(404).json({ error: 'Anotació no trobada' });
    }
    
    // Verificar permisos (només creador de l'anotació, propietari de la partitura o admin)
    if (anotacio.usuari_id !== req.user.sub) {
      const partitura = req.db.prepare(
        'SELECT * FROM partitures WHERE id = ?'
      ).get(anotacio.partitura_id);
      
      if (partitura.usuari_id !== req.user.sub && req.user.rol !== 'admin') {
        return res.status(403).json({ error: 'No tens permís per eliminar aquesta anotació' });
      }
    }
    
    req.db.prepare('DELETE FROM anotacions WHERE id = ?').run(id);
    
    res.json({ success: true, message: 'Anotació eliminada' });
  } catch (error) {
    console.error('Error eliminant anotació:', error);
    res.status(500).json({ error: 'Error eliminant anotació' });
  }
});

// ===== RUTES DE COMENTARIS =====

// Crear comentari
app.post('/api/comentaris', authenticateToken, (req, res) => {
  try {
    const { partitura_id, comentari, resposta_a = null } = req.body;
    
    // Verificar que la partitura existeix
    const partitura = req.db.prepare(
      'SELECT * FROM partitures WHERE id = ?'
    ).get(partitura_id);
    
    if (!partitura) {
      return res.status(404).json({ error: 'Partitura no trobada' });
    }
    
    const stmt = req.db.prepare(`
      INSERT INTO comentaris (partitura_id, usuari_id, comentari, resposta_a)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(partitura_id, req.user.sub, comentari, resposta_a);
    
    const nouComentari = req.db.prepare(`
      SELECT c.*, u.nom_usuari, u.nom_display 
      FROM comentaris c
      LEFT JOIN usuaris u ON c.usuari_id = u.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);
    
    res.status(201).json({
      success: true,
      comentari: {
        ...nouComentari,
        creat_a: new Date(nouComentari.creat_a).toISOString()
      }
    });
  } catch (error) {
    console.error('Error creant comentari:', error);
    res.status(500).json({ error: 'Error creant comentari' });
  }
});

// Obtenir comentaris d'una partitura
app.get('/api/comentaris', getOptionalUser, (req, res) => {
  try {
    const { partitura_id } = req.query;
    
    const comentaris = req.db.prepare(`
      SELECT c.*, u.nom_usuari, u.nom_display 
      FROM comentaris c
      LEFT JOIN usuaris u ON c.usuari_id = u.id
      WHERE c.partitura_id = ?
      ORDER BY c.creat_a DESC
    `).all(partitura_id);
    
    res.json({
      success: true,
      comentaris: comentaris.map(c => ({
        ...c,
        creat_a: new Date(c.creat_a).toISOString()
      }))
    });
  } catch (error) {
    console.error('Error obtenint comentaris:', error);
    res.status(500).json({ error: 'Error obtenint comentaris' });
  }
});

// ===== RUTES D'USUARIS =====

// Obtenir informació d'un usuari
app.get('/api/usuaris/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const usuari = req.db.prepare(`
      SELECT id, nom_usuari, nom_display, rol, creat_a
      FROM usuaris 
      WHERE id = ? AND actiu = 1
    `).get(id);
    
    if (!usuari) {
      return res.status(404).json({ error: 'Usuari no trobat' });
    }
    
    res.json({
      success: true,
      usuari: {
        ...usuari,
        creat_a: new Date(usuari.creat_a).toISOString()
      }
    });
  } catch (error) {
    console.error('Error obtenint usuari:', error);
    res.status(500).json({ error: 'Error obtenint usuari' });
  }
});

// ===== RUTES D'ESTADÍSTIQUES =====

app.get('/api/estadistiques', (req, res) => {
  try {
    const stats = req.db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM usuaris WHERE actiu = 1) as usuaris_actius,
        (SELECT COUNT(*) FROM partitures WHERE publica = 1) as partitures_publiques,
        (SELECT COUNT(*) FROM anotacions) as total_anotacions,
        (SELECT COUNT(*) FROM comentaris) as total_comentaris,
        (SELECT COUNT(*) FROM partitures WHERE date(creat_a) = date('now')) as partitures_avui
    `).get();
    
    res.json({ success: true, estadistiques: stats });
  } catch (error) {
    console.error('Error obtenint estadístiques:', error);
    res.status(500).json({ error: 'Error obtenint estadístiques' });
  }
});

// ===== RUTES DE SALUT =====

app.get('/api/salut', (req, res) => {
  res.json({ 
    success: true, 
    missatge: '🎵 API appHarmonia funcionant correctament',
    versio: '1.0.0',
    hora: new Date().toISOString()
  });
});

// Error handler per a multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'El fitxer és massa gran. Màxim 15MB' });
    }
    return res.status(400).json({ error: 'Error pujant el fitxer' });
  }
  next(error);
});

// Ruta 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no trobada' });
});

// Error handler global
app.use((error, req, res, next) => {
  console.error('Error global:', error);
  res.status(500).json({ error: 'Error intern del servidor' });
});

// Iniciar servidor
initialize().then(() => {
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 appHarmonia Backend en execució`);
    console.log(`📡 Port: ${port}`);
    console.log(`📁 Uploads: ${UPLOAD_DIR}`);
    console.log(`💾 Base de dades: ${DB_PATH}`);
    console.log(`🌐 URL: http://localhost:${port}`);
    console.log(`🔐 JWT Secret: ${JWT_SECRET === 'secret-de-prova-canvia-a-produccio' ? '⚠️ ENTORN DE PROVA' : '✅ CONFIGURAT'}`);
  });
}).catch(err => {
  console.error('❌ Error inicialitzant:', err);
  process.exit(1);
});