const express = require('express');
const path = require('path');
const fs = require('fs');
const pool = require('./db');
const bcrypt = require('bcrypt');
const session = require('express-session');
const { scrapeGuitars } = require('./scraper');  // Підключення функції парсингу
const app = express();

// Налаштування сесій
app.use(session({
    secret: 'secret-key', // Секретний ключ для підпису cookie
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // У продакшн середовищі використовуйте true і HTTPS
}));

// Мідлвар для обробки форм
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Статичні файли для CSS
app.use(express.static(path.join(__dirname, 'public')));

// Функція для отримання гітар з бази даних
async function getGuitars(query = '') {
    let sql = 'SELECT * FROM guitars';
    let params = [];

    if (query) {
        sql += ' WHERE name LIKE ?';
        params.push(`%${query}%`);  // Пошук за назвою гітари
    }

    const [rows] = await pool.query(sql, params);
    return rows;
}

// Мідлвар для перевірки, чи користувач авторизований
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next(); // Користувач авторизований, переходимо до наступного обробника
    } else {
        res.redirect('/login'); // Користувач не авторизований, перенаправляємо на сторінку авторизації
    }
}

// Функція для перевірки чи існує користувач
async function findUserByUsername(username) {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0];
}

// Головна сторінка (каталог гітар)
app.get('/', isAuthenticated, async (req, res) => {
    const searchQuery = req.query.search || '';  // Отримуємо значення з форми пошуку
    const guitars = await getGuitars();

    // Якщо є запит на пошук, фільтруємо гітари за назвою
    const filteredGuitars = guitars.filter(guitar =>
        guitar.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filePath = path.join(__dirname, 'views', 'index.html');

    fs.readFile(filePath, 'utf-8', (err, content) => {
        if (err) {
            res.status(500).send('Помилка сервера');
            return;
        }

        const guitarsHtml = filteredGuitars.map(guitar => `
            <div class="guitar">
                <h2>${guitar.name}</h2>
                <p>Ціна: ${guitar.price}</p>
                <a href="${guitar.link}" target="_blank">Детальніше</a>
                <img src="${guitar.image}" alt="${guitar.name}" class="guitar-image">
            </div>
        `).join('');

        const updatedContent = content.replace('{{guitars}}', guitarsHtml);
        const finalContent = updatedContent.replace('{{username}}', req.session.user.username);

        res.send(finalContent);  // Відправляємо оновлений HTML
    });
});

// Маршрут для пошуку гітар
app.get('/search', isAuthenticated, async (req, res) => {
    const query = req.query.query || '';  // Отримуємо параметр пошуку з запиту
    const guitars = await getGuitars(query);
    const filePath = path.join(__dirname, 'views', 'index.html');

    fs.readFile(filePath, 'utf-8', (err, content) => {
        if (err) {
            res.status(500).send('Помилка сервера');
            return;
        }

        const guitarsHtml = guitars.map(guitar => `
            <div class="guitar">
                <h2>${guitar.name}</h2>
                <p>Ціна: ${guitar.price}</p>
                <img src="${guitar.image_path}" alt="${guitar.name}" class="guitar-image">
                <a href="${guitar.link}" target="_blank">Детальніше</a>
            </div>
        `).join('');

        const updatedContent = content.replace('{{guitars}}', guitarsHtml);
        const finalContent = updatedContent.replace('{{username}}', req.session.user.username);

        res.send(finalContent);  // Відправляємо оновлений HTML
    });
});

// Сторінка для реєстрації
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

// Реєстрація нового користувача
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.redirect('/register?error=invalid'); // Передаємо параметр помилки
    }

    const existingUser = await findUserByUsername(username);
    if (existingUser) {
        return res.redirect('/register?error=invalid'); // Передаємо параметр помилки
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.execute('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);

    res.redirect('/login');
});

// Сторінка для авторизації
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Авторизація користувача
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const user = await findUserByUsername(username);
    if (!user) {
        return res.redirect('/login?error=invalid'); // Передаємо параметр помилки
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
        return res.redirect('/login?error=invalid'); // Передаємо параметр помилки
    }

    req.session.user = { id: user.id, username: user.username };
    res.redirect('/');
});

// Вихід з облікового запису
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.send('Помилка при виході');
        }
        // Після успішного виходу редирект на сторінку авторизації
        res.redirect('/login');
    });
});


// Запуск сервера на порту 2000
app.listen(2000, () => {
    console.log('Сервер працює на http://localhost:2000');
});