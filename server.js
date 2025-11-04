// server.js — Delta Gruiului (rezervări de zi, locuri numerice)
// CommonJS (require), Express + SQLite

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const DB_PATH = path.join(__dirname, 'data', 'rezervari.db');

// asigură existența folderului data/
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// DB connection
const db = new sqlite3.Database(DB_PATH);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ------------------------ PUBLIC ------------------------
// GET: locuri ocupate pentru (bazin, data)
app.get('/api/rezervari/ocupate', (req, res) => {
  const { bazin, data } = req.query;
  if (!bazin || !data) {
    return res.status(400).json({ error: 'Parametri lipsă: bazin și data' });
  }

  db.all(
    'SELECT loc FROM rezervari WHERE bazin = ? AND data = ?',
    [bazin, data],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Eroare la citirea rezervărilor' });
      // returnăm ca numere
      const ocupate = (rows || []).map(r => Number(r.loc));
      res.json(ocupate);
    }
  );
});

// POST: creează rezervare (max 3 locuri, toate numerice)
app.post('/api/rezervari', (req, res) => {
  const { bazin, data, nume, telefon, locuri } = req.body || {};

  if (!bazin || !data || !nume || !telefon || !Array.isArray(locuri)) {
    return res.status(400).json({ error: 'Date de rezervare incomplete' });
  }
  if (locuri.length === 0 || locuri.length > 3) {
    return res.status(400).json({ error: 'Poți rezerva între 1 și 3 locuri' });
  }
  // validăm numericitatea locurilor
  const locuriNum = locuri.map(n => Number(n)).filter(n => Number.isInteger(n));
  if (locuriNum.length !== locuri.length) {
    return res.status(400).json({ error: 'Locurile trebuie să fie numere valide.' });
  }

  const placeholders = locuriNum.map(() => '?').join(',');
  const sqlChk = `SELECT loc FROM rezervari WHERE bazin = ? AND data = ? AND loc IN (${placeholders})`;

  db.all(sqlChk, [bazin, data, ...locuriNum], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Eroare la verificare locuri' });

    if (rows && rows.length > 0) {
      const deja = rows.map(r => r.loc).join(', ');
      return res.status(400).json({ error: 'Locuri deja ocupate: ' + deja });
    }

    const stmt = db.prepare(
      'INSERT INTO rezervari (bazin, data, nume, telefon, loc) VALUES (?, ?, ?, ?, ?)'
    );
    for (const loc of locuriNum) {
      stmt.run([bazin, data, nume, telefon, loc]);
    }
    stmt.finalize(err2 => {
      if (err2) return res.status(500).json({ error: 'Eroare la salvare' });
      res.json({ success: true, message: 'Rezervarea a fost înregistrată cu succes.' });
    });
  });
});

// ------------------------ ADMIN ------------------------
// GET: listare rezervări (filtre opționale: from, to, bazin)
app.get('/api/admin/rezervari', (req, res) => {
  const { from = '', to = '', bazin = '' } = req.query || {};
  const params = [];
  let where = '1=1';
  if (from) { where += ' AND date(data) >= date(?)'; params.push(from); }
  if (to)   { where += ' AND date(data) <= date(?)'; params.push(to); }
  if (bazin){ where += ' AND bazin = ?'; params.push(bazin); }

  const sql = `
    SELECT id, data, bazin, loc, nume, telefon
    FROM rezervari
    WHERE ${where}
    ORDER BY date(data) ASC, bazin ASC, CAST(loc AS INTEGER) ASC, id ASC
  `;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Eroare DB' });
    res.json({ rows: rows || [] });
  });
});

// DELETE: ștergere rezervare după id
app.delete('/api/admin/rezervari/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID invalid' });

  db.run('DELETE FROM rezervari WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Eroare DB la ștergere' });
    res.json({ success: true, deleted: this.changes });
  });
});

// UI admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ------------------------ START ------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serverul rulează pe portul ${PORT} — DB: ${DB_PATH}`);
});
