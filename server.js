const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuration PostgreSQL (utilise les variables d'environnement)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'todo_user',
  password: process.env.DB_PASSWORD || 'todo_password',
  database: process.env.DB_NAME || 'tododb',
});

// Création de la table si elle n'existe pas
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table todos prête');
  } catch (err) {
    console.error('Erreur initialisation DB:', err.message);
  }
}

// ================== ROUTES API ==================

// GET /todos → lister toutes les tâches
app.get('/todos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM todos ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /todos → ajouter une tâche
app.post('/todos', async (req, res) => {
  const { title } = req.body;
  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Le titre est obligatoire' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO todos (title) VALUES ($1) RETURNING *',
      [title.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /todos/:id → modifier une tâche
app.put('/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { title, completed } = req.body;

  try {
    const result = await pool.query(
      `UPDATE todos 
       SET title = COALESCE($1, title), 
           completed = COALESCE($2, completed)
       WHERE id = $3 
       RETURNING *`,
      [title, completed, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tâche non trouvée' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /todos/:id → supprimer une tâche
app.delete('/todos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM todos WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tâche non trouvée' });
    }
    res.json({ message: 'Tâche supprimée', todo: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route de santé (utile pour Docker et Kubernetes plus tard)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Démarrage du serveur
app.listen(PORT, async () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  await initDB();
});