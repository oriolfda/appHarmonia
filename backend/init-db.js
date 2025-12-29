// backend/init-db.js
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Crear directori database si no existeix
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Conectar/crear base de dades
const db = new Database(path.join(dbDir, 'harmonia.db'));

// Habilitar claus foranes
db.pragma('foreign_keys = ON');

// Crear taules
db.exec(`
  -- Taula d'usuaris amb autenticació
  CREATE TABLE IF NOT EXISTS usuaris (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    nom_usuari TEXT UNIQUE NOT NULL,
    nom_display TEXT,
    -- Password encriptat amb bcrypt
    password_hash TEXT,
    -- Token d'accés per API (JWT o similar)
    access_token TEXT,
    token_expira DATETIME,
    -- Per a OAuth si es vol integrar Google/Github
    provider TEXT DEFAULT 'local',
    provider_id TEXT,
    -- Rol de l'usuari
    rol TEXT CHECK(rol IN ('admin', 'professor', 'alumne', 'usuari')) DEFAULT 'usuari',
    -- Estat del compte
    actiu BOOLEAN DEFAULT 1,
    verificat BOOLEAN DEFAULT 0,
    -- Dates
    creat_a DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualitzat_a DATETIME DEFAULT CURRENT_TIMESTAMP,
    darrer_login DATETIME
  );

  -- Taula de partitures
  CREATE TABLE IF NOT EXISTS partitures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuari_id INTEGER NOT NULL,
    titol TEXT NOT NULL,
    descripcio TEXT,
    nom_fitxer TEXT NOT NULL,
    ruta_fitxer TEXT NOT NULL,
    nom_original TEXT,
    mida INTEGER,
    tipus_mime TEXT,
    -- Visibilitat de la partitura
    publica BOOLEAN DEFAULT 1,
    permet_anotacions BOOLEAN DEFAULT 1,
    -- Dates
    creat_a DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualitzat_a DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE CASCADE
  );

  -- Taula d'anotacions
  CREATE TABLE IF NOT EXISTS anotacions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partitura_id INTEGER NOT NULL,
    usuari_id INTEGER NOT NULL,
    dades_anotacio TEXT NOT NULL,
    color TEXT DEFAULT '#ff0000',
    eina_utilitzada TEXT DEFAULT 'llapis',
    -- Estat de l'anotació
    acceptada BOOLEAN DEFAULT 0,
    revisada BOOLEAN DEFAULT 0,
    -- Dates
    creat_a DATETIME DEFAULT CURRENT_TIMESTAMP,
    actualitzat_a DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (partitura_id) REFERENCES partitures(id) ON DELETE CASCADE,
    FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE CASCADE
  );

  -- Taula de comentaris
  CREATE TABLE IF NOT EXISTS comentaris (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partitura_id INTEGER NOT NULL,
    usuari_id INTEGER NOT NULL,
    comentari TEXT NOT NULL,
    -- Si és resposta a un altre comentari
    resposta_a INTEGER,
    -- Dates
    creat_a DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (partitura_id) REFERENCES partitures(id) ON DELETE CASCADE,
    FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE CASCADE,
    FOREIGN KEY (resposta_a) REFERENCES comentaris(id) ON DELETE CASCADE
  );

  -- Taula de sessions (per a recordar sessions)
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuari_id INTEGER NOT NULL,
    token_sessio TEXT UNIQUE NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    expira DATETIME NOT NULL,
    creat_a DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuari_id) REFERENCES usuaris(id) ON DELETE CASCADE
  );

  -- Taula de recuperació de contrasenyes
  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expira DATETIME NOT NULL,
    utilitzat BOOLEAN DEFAULT 0,
    creat_a DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Índexs per millorar rendiment
  CREATE INDEX IF NOT EXISTS idx_usuaris_email ON usuaris(email);
  CREATE INDEX IF NOT EXISTS idx_usuaris_token ON usuaris(access_token);
  CREATE INDEX IF NOT EXISTS idx_partitures_usuari ON partitures(usuari_id);
  CREATE INDEX IF NOT EXISTS idx_partitures_publica ON partitures(publica);
  CREATE INDEX IF NOT EXISTS idx_anotacions_partitura ON anotacions(partitura_id);
  CREATE INDEX IF NOT EXISTS idx_comentaris_partitura ON comentaris(partitura_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_sessio);
  CREATE INDEX IF NOT EXISTS idx_sessions_expira ON sessions(expira);
  CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
  CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
`);

// Funció per generar hash de password
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// Funció per crear usuaris de prova
async function crearUsuarisProva() {
  const passwords = {
    'admin': await hashPassword('admin123'),
    'professor': await hashPassword('professor123'),
    'alumne1': await hashPassword('alumne123'),
    'alumne2': await hashPassword('alumne456')
  };

  const insertUsuari = db.prepare(`
    INSERT OR IGNORE INTO usuaris 
    (email, nom_usuari, nom_display, password_hash, rol, verificat, actiu)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const usuaris = [
    ['admin@harmonia.cat', 'admin', 'Administrador', passwords.admin, 'admin', 1, 1],
    ['professor@harmonia.cat', 'professor', 'Professor/a', passwords.professor, 'professor', 1, 1],
    ['alumne1@harmonia.cat', 'alumne1', 'Alumne 1', passwords.alumne1, 'alumne', 1, 1],
    ['alumne2@harmonia.cat', 'alumne2', 'Alumne 2', passwords.alumne2, 'alumne', 1, 1]
  ];

  usuaris.forEach(usuari => insertUsuari.run(usuari));
}

// Crear usuaris de prova
crearUsuarisProva().then(() => {
  console.log('✅ Base de dades appHarmonia inicialitzada!');
  console.log('📁 Base de dades creada a:', path.join(dbDir, 'harmonia.db'));

  // Mostrar estat
  const countUsuaris = db.prepare('SELECT COUNT(*) as total FROM usuaris').get();
  const countPartitures = db.prepare('SELECT COUNT(*) as total FROM partitures').get();
  
  console.log(`👥 Usuaris creats: ${countUsuaris.total}`);
  console.log(`🎵 Partitures: ${countPartitures.total}`);
  
  // Mostrar credencials de prova
  console.log('\n🔐 Credencials de prova:');
  console.log('----------------------');
  console.log('Admin: admin@harmonia.cat / admin123');
  console.log('Professor: professor@harmonia.cat / professor123');
  console.log('Alumnes: alumne1@harmonia.cat / alumne123');
  console.log('          alumne2@harmonia.cat / alumne456');
  
  db.close();
});