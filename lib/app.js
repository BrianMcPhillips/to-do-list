const express = require('express');
const cors = require('cors');
const client = require('./client.js');
const app = express();
const ensureAuth = require('./auth/ensure-auth');
const createAuthRoutes = require('./auth/create-auth-routes');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const authRoutes = createAuthRoutes();

// setup authentication routes to give user an auth token
// creates a /auth/signin and a /auth/signup POST route. 
// each requires a POST body with a .email and a .password
app.use('/auth', authRoutes);

// everything that starts with "/api" below here requires an auth token!
app.use('/api', ensureAuth);

// and now every request that has a token in the Authorization header will have a `req.userId` property for us to see who's talking
app.get('/api/test', (req, res) => {
  res.json({
    message: `in this proctected route, we get the user's id like so: ${req.userId}`
  });
});

app.get('/api/toDoList', async(req, res) => {
  const userId = req.userId;
  const data = await client.query(`
  SELECT * FROM
  toDoList
  WHERE owner_id=${userId}`);

  res.json(data.rows);
});

app.get('/api/toDoList/:id', async(req, res) => {
  const toDoId = req.params.id;
  const data = await client.query(`
  SELECT id, name, completed, importance, owner_id
  FROM toDoList 
  WHERE id=$1 AND owner_id=$2`,
  [toDoId, req.userId]);
  res.json(data.rows[0]);
});

app.delete('api/toDoList/id', async(req, res) => {
  const toDoId = req.params.id;

  const data = await client.query('DELETE FROM toDoList WHERE toDoList.id=$1 AND toDoList.owner_id=$2;', [toDoId, req.userId]);

  res.json(data.rows[0]);
});

app.put('/api/toDoList/:id', async(req, res) => {
  const toDoId = req.params.id;

  try {
    const updatedList = {
      name: req.body.name,
      completed: req.body.completed,
      importance: req.body.importance
    };
  
    const data = await client.query(`
      UPDATE toDoList
        SET name=$1, completed=$2, importance=$3
        WHERE toDoList.id = $4 AND toDoList.owner_id = $5
        RETURNING *
  `, [updatedList.name, updatedList.completed, updatedList.importance, toDoId, req.userId]); 
    
    res.json(data.rows[0]);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }});

app.post('/api/toDoList', async(req, res) => {
  try {
    const newList = {
      name: req.body.name,
      completed: req.body.completed,
      importance: req.body.importance
    };
  
    const data = await client.query(`
    INSERT INTO toDoList(name, completed, importance, owner_id)
    VALUES($1, $2, $3, $4)
    RETURNING *
  `, [newList.name, newList.completed, newList.importance, req.userId]); 
    
    res.json(data.rows[0]);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('*', (req, res) => {
  res.status(404).json({ message: 'No such endpoint!' });
});

app.use(require('./middleware/error'));

module.exports = app;
