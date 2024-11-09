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

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});


app.listen(port, () => {
    console.log(`Server radi na http://localhost:${port}`);
});

app.post('/sql', (req, res) => {
    const { username, password } = req.body;

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


app.get('/home', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

const failedAttempts = {};
const blockedIPs = {};

app.use((req, res, next) => {
    const ip = req.ip;

    if (blockedIPs[ip] && blockedIPs[ip] > Date.now()) {
        res.status(403).send('IP adresa je blokirana. Pokušajte ponovno kasnije.');
    } else {
        next();
    }
});




const axios = require('axios');
const RECAPTCHA_SECRET_KEY = '6Lff7nkqAAAAAK2NrBOjuePpOW5ZtNJqC3ITTvq4';

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const ip = req.ip;

    const recaptchaResponse = req.body['g-recaptcha-response'];
    const recaptchaUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaResponse}&remoteip=${ip}`;

    try {
        const recaptchaResult = await axios.post(recaptchaUrl);
        if (!recaptchaResult.data.success) {
            return res.send('CAPTCHA verification failed');
        }
    } catch (error) {
        return res.send('Error validating CAPTCHA');
    }

    const query = `SELECT * FROM users WHERE username = ? AND password = ?`;
    db.get(query, [username, password], (err, row) => {
        if (err) {
            res.send('Query error');
            return;
        }
        if (row) {
            delete failedAttempts[ip];
            res.send(`Welcome, ${row.username}!`);
        } else {
            failedAttempts[ip] = (failedAttempts[ip] || 0) + 1;
            if (failedAttempts[ip] >= 3) {
                blockedIPs[ip] = Date.now() + 3 * 60 * 1000; // Block for 3 minutes
                res.status(403).send('Too many failed attempts. IP address is blocked for 3 minutes.');
            } else {
                res.send('Invalid input');
            }
        }
    });
});








app.post('/broken-login', (req, res) => {
    const { username, password } = req.body;

    const query = `SELECT * FROM users WHERE username = ?`;
    db.get(query, [username], (err, row) => {
        if (err) {
            res.send('Greška u upitu');
            return;
        }
        if (row) {
            if (row.password === password) {
                res.send(`Dobrodošao, ${row.username}!`);
            } else {
                res.send('Pogrešna lozinka');
            }
        } else {
            res.send('Pogrešno korisničko ime');
        }
    });
});
