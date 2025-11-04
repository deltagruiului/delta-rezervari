// db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'rezervari.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS rezervari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bazin TEXT,
      data TEXT,
      nume TEXT,
      telefon TEXT,
      loc INTEGER
    )
  `, (err) => {
    if (err) {
      console.error('❌ Eroare la crearea tabelei:', err.message);
    } else {
      console.log('✅ Tabela "rezervari" a fost creată sau exista deja.');
    }
  });
});

db.close();
