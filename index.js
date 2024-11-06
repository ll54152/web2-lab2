const express = require('express');
const app = express();
const port = 3000;

const bodyParser = require('body-parser'); // Parser
const sqlite3 = require('sqlite3').verbose(); // SQLite3
const db = new sqlite3.Database(':memory:'); // In-Memory DB

app.use(bodyParser.urlencoded({ extended: true })); // Koristim Parser svugdje

db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT)');
    db.run('INSERT INTO users (username, password) VALUES ("MarkoC", "123456789")');
    db.run('INSERT INTO users (username, password) VALUES ("IvanL", "qwertzuiop")');
});



app.get('/', (req, res) => {
    res.send('Hello World!');
});



app.listen(port, () => {
    console.log(`Server radi na http://localhost:${port}`);
});
