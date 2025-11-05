// server.js — Delta Gruiului (rezervări de zi, locuri numerice + validări)
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'rezervari.db');

// ——— Utils
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// Harta oficială de locuri (security: validăm și pe server)
const LOCURI = {
  'Balta Mare': range(1, 43),
  'Balta de la capre': range(44, 53),
  'Balta de la râme': range(54, 61),
  'Balta de la autobuz': range(62, 83),
  'Balta de păstrăv': range(101, 122),
  'Balta de undiță cu copac': range(123, 139),
};
const BAZINE = Object.keys(LOCURI);

// ——— Asigură folderul DB
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// ——— DB connect + minim schema safety
const db = new sqlite3.Database(DB_PATH);
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS rezervari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bazin TEXT NOT NULL,
      data TEXT NOT NULL,       -- format YYYY-MM-DD
      nume TEXT NOT NULL,
      telefon TEXT NOT NULL,
      loc INTEGER NOT NULL
    )
  `);
});

// ——— Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ——— Helpers de validare
const isValidDateStr = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());
const isPastDate = (s) => {
  const d = new Date(s); d.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);
  return d < today;
};
const isValidPhoneRO = (p) => /^0\d{9}$/.test(p);

// ——— PUBLIC: locuri ocupate pentru (bazin, data)
app.get('/api/rezervari/ocupate', (req, res) => {
  const { bazin, data } = req.query;

  if (!bazin || !data) {
    return res.status(400).json({ error: 'Parametri lipsă: bazin și data.' });
  }
  if (!BAZINE.includes(bazin)) {
    return res.status(400).json({ error: 'Bazin invalid.' });
  }
  if (!isValidDateStr(data)) {
    return res.status(400).json({ error: 'Format dată invalid (YYYY-MM-DD).' });
  }

  db.all(
    'SELECT loc FROM rezervari WHERE bazin = ? AND data = ?',
    [bazin, data],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Eroare DB la citirea rezervărilor.' });
      const ocupate = (rows || []).map(r => Number(r.loc));
      res.json(ocupate);
    }
  );
});

// ——— PUBLIC: creează rezervare (max 3 locuri, numerice, valide pentru bazin)
app.post('/api/rezervari', (req, res) => {
  const { bazin, data, nume, telefon, locuri } = req.body || {};

  if (!bazin || !data || !nume || !telefon || !Array.isArray(locuri)) {
    return res.status(400).json({ error: 'Date de rezervare incomplete.' });
  }
  if (!BAZINE.includes(bazin)) {
    return res.status(400).json({ error: 'Bazin invalid.' });
  }
  if (!isValidDateStr(data)) {
    return res.status(400).json({ error: 'Format dată invalid (YYYY-MM-DD).' });
  }
  if (isPastDate(data)) {
    return res.status(400).json({ error: 'Data selectată este în trecut.' });
  }
  if (!isValidPhoneRO(telefon)) {
    return res.status(400).json({ error: 'Telefon invalid (ex: 07xxxxxxxx).' });
  }
  if (locuri.length === 0 || locuri.length > 3) {
    return res.status(400).json({ error: 'Poți rezerva între 1 și 3 locuri.' });
  }

  // numeric + în intervalul bazei + fără duplicate în payload
  const allowed = new Set(LOCURI[bazin]);
  const locuriNum = locuri.map(n => Number(n));
  if (locuriNum.some(n => !Number.isInteger(n))) {
    return res.status(400).json({ error: 'Locurile trebuie să fie numere întregi.' });
  }
  if (new Set(locuriNum).size !== locuriNum.length) {
    return res.status(400).json({ error: 'Ai selectat același loc de mai multe ori.' });
  }
  if (locuriNum.some(n => !allowed.has(n))) {
    return res.status(400).json({ error: 'Unul sau mai multe locuri nu aparțin acestei bălți.' });
  }

  // Conflict check
  const placeholders = locuriNum.map(() => '?').join(',');
  const sqlChk = `SELECT loc FROM rezervari WHERE bazin = ? AND data = ? AND loc IN (${placeholders})`;

  db.all(sqlChk, [bazin, data, ...locuriNum], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Eroare DB la verificarea locurilor.' });

    if (rows && rows.length > 0) {
      const deja = rows.map(r => r.loc).join(', ');
      return res.status(400).json({ error: 'Locuri deja ocupate: ' + deja });
    }

    // Inserăm în tranzacție
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      const stmt = db.prepare(
        'INSERT INTO rezervari (bazin, data, nume, telefon, loc) VALUES (?, ?, ?, ?, ?)'
      );
      try {
        for (const loc of locuriNum) {
          stmt.run([bazin, data, nume, telefon, loc]);
        }
      } catch (e) {
        stmt.finalize(() => db.run('ROLLBACK'));
        return res.status(500).json({ error: 'Eroare la salvare.' });
      }
      stmt.finalize((e2) => {
        if (e2) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Eroare la salvare.' });
        }
        db.run('COMMIT', (e3) => {
          if (e3) return res.status(500).json({ error: 'Eroare la commit.' });
          return res.json({ success: true, message: 'Rezervarea a fost înregistrată cu succes.' });
        });
      });
    });
  });
});

// ——— ADMIN: listare (filtre: from, to, bazin)
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

// ——— ADMIN: ștergere după id
app.delete('/api/admin/rezervari/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID invalid' });

  db.run('DELETE FROM rezervari WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Eroare DB la ștergere' });
    res.json({ success: true, deleted: this.changes });
  });
});

// ——— UI Admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ——— START
app.listen(PORT, () => {
  console.log(`Serverul rulează pe portul ${PORT} — DB: ${DB_PATH}`);
});
