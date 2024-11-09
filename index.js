const express = require('express');
const app = express();
const port = 3000;

const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');

app.use(bodyParser.urlencoded({ extended: true }));

db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT)');
    db.run('INSERT INTO users (username, password, role) VALUES ("MarkoC", "123456789", "admin")');
    db.run('INSERT INTO users (username, password, role) VALUES ("IvanL", "qwertzuiop", "user")');
});





app.get('/', (req, res) => {
    res.send('Hello World!');
});


app.listen(port, () => {
    console.log(`Server radi na http://localhost:${port}`);
});

app.post('/sql', (req, res) => {
    const { username, password } = req.body;

    // **OPASNO** - SQL Injection ranjivo
    const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

    db.all(query, (err, rows) => {
        if (err) {
            res.send('Greška u upitu');
            return;
        }
        if (rows.length > 0) {
            res.json(rows);
        } else {
            res.send('Neispravno korisničko ime ili lozinka');
        }
    });
});

app.post('/sqlfix', (req, res) => {
    const { username, password } = req.body;

    const query = `SELECT * FROM users WHERE username = ? AND password = ?`;

    db.get(query, [username, password], (err, row) => {
        if (err) {
            res.send('Greška u upitu');
            return;
        }
        if (row) {
            res.send(`Dobrodošao, ${row.username}!`);
        } else {
            res.send('Neispravno korisničko ime ili lozinka');
        }
    });
});

app.get('/toggle', (req, res) => {
    vulnerable = !vulnerable;
    res.send(`SQL Injection vulnerability is now ${vulnerable ? 'enabled' : 'disabled'}`);
});

app.get('/home', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

let authenticated = "none";

app.get('/sensitive', (req, res) => {
    res.send('ADMIN!');
});

app.get('/sensitive-secure', (req, res) => {
    if (authenticated === "admin") {
        res.send('ADMIN!');
    } else if(authenticated === "user"){
        res.send('USER!');
    }
    else {
        res.status(403).send('Pristup zabranjen: Niste prijavljeni.');
    }
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const query = `SELECT * FROM users WHERE username = ? AND password = ?`;

    db.get(query, [username, password], (err, row) => {
        if (err) {
            res.send('Greška u upitu');
            return;
        }
        if (row) {
            if(row.role === "admin"){
                authenticated = "admin";
            }

            if(row.role === "user"){
                authenticated = "user";
            }

            res.send(`Dobrodošao, ${row.username}!`);
        } else {
            res.send('Neispravno korisničko ime ili lozinka');
        }
    });


});

app.post('/logout', (req, res) => {
    authenticated = "none";
    res.send('Odjava uspješna!');
});
