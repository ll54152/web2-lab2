const express = require('express');
const app = express();
const port = 3000;

const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');

const session = require('express-session');

app.use(session({
    secret: 'tajna',
    resave: false,
    saveUninitialized: true,
    cookie: {maxAge: 30 * 60 * 1000}
}));

app.use(bodyParser.urlencoded({extended: true}));

db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT)');
    db.run('INSERT INTO users (username, password, role) VALUES ("MarkoC", "123456789", "admin")');
    db.run('INSERT INTO users (username, password, role) VALUES ("IvanL", "qwertzuiop", "user")');
});

app.use((req, res, next) => {
    const ip = req.ip;

    req.session.blockedIPs = req.session.blockedIPs || {};

    if (req.session.blockedIPs[ip] && req.session.blockedIPs[ip] > Date.now()) {
        res.status(403).send('IP adresa je blokirana. Pokušajte ponovno kasnije.');
    } else {
        next();
    }
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

app.listen(port, () => {
    console.log(`Server radi na http://localhost:${port}`);
});

app.get('/sql', (req, res) => {
    res.sendFile(__dirname + '/sql.html');
});

app.post('/sql', (req, res) => {
    const {username, password} = req.body;

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
    const {username, password} = req.body;

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

const axios = require('axios');
const RECAPTCHA_SECRET_KEY = '6Lff7nkqAAAAAK2NrBOjuePpOW5ZtNJqC3ITTvq4';

app.post('/login', async (req, res) => {
    const {username, password} = req.body;
    const ip = req.ip;
    const recaptchaResponse = req.body['g-recaptcha-response'];
    const recaptchaUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaResponse}&remoteip=${ip}`;

    if (!req.session.failedAttempts) {
        req.session.failedAttempts = {};
    }

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
            delete req.session.failedAttempts[ip];
            req.session.user = {
                username: row.username,
                role: row.role
            };

            res.send(`Welcome, ${row.username}!`);
        } else {
            req.session.failedAttempts[ip] = (req.session.failedAttempts[ip] || 0) + 1;

            if (req.session.failedAttempts[ip] >= 3) {
                req.session.blockedIPs = req.session.blockedIPs || {};
                req.session.blockedIPs[ip] = Date.now() + 3 * 60 * 1000;
                res.status(403).send('Too many failed attempts. IP address is blocked for 3 minutes.');
            } else {
                res.send('Invalid input');
            }
        }
    });
});


app.post('/broken-login', (req, res) => {
    const {username, password} = req.body;

    const query = `SELECT * FROM users WHERE username = ?`;
    db.get(query, [username], (err, row) => {
        if (err) {
            res.send('Greška u upitu');
            return;
        }

        if (!row) {
            res.send('Pogrešno korisničko ime');
            return;
        }

        if (row.password !== password) {
            res.send('Pogrešno lozinka');
            return;
        }

        res.send(`Dobrodošao, ${row.username}!`);
    });
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.send('Error logging out');
        }
        res.send('Successfully logged out');
    });
});
