const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const pool = require('./db');
const { registerUser, loginUser, createSession, getSession } = require('./auth');

const app = express();
const PORT = 2000;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Функція для отримання гітар з бази даних
async function getGuitars() {
    const [rows] = await pool.query('SELECT * FROM guitars');
    return rows;
}

// Middleware для перевірки авторизації
function isAuthenticated(req, res, next) {
    const sessionId = req.cookies.sessionId;
    const session = sessionId ? getSession(sessionId) : null;

    if (session) {
        req.user = session.userEmail;
        next();
    } else {
        res.redirect('/login');
    }
}

// Головна сторінка (Каталог гітар)
app.get('/', isAuthenticated, async (req, res) => {
    try {
        // Отримуємо дані про гітари з бази
        const guitars = await getGuitars();

        // Відправляємо HTML файл
        res.sendFile(path.join(__dirname, 'views', 'index.html'), function (err, content) {
            if (err) {
                res.status(500).send('Помилка сервера');
            } else {
                // Створюємо HTML для кожної гітари
                const guitarsHtml = guitars.map(guitar => `
                    <div class="guitar">
                        <h2>${guitar.name}</h2>
                        <p>Ціна: ${guitar.price}</p>
                        <a href="${guitar.link}" target="_blank">Детальніше</a>
                    </div>
                `).join(''); // З'єднуємо всі елементи в один рядок

                // Заміна шаблонних змінних на реальні значення
                const pageContent = content.replace('{{guitars}}', guitarsHtml).replace('{{user}}', `Вітаємо, ${req.user.name}`);
                
                // Відправляємо модифікований HTML
                res.send(pageContent);
            }
        });
    } catch (err) {
        console.error('Помилка при отриманні гітар:', err);
        res.status(500).send('Щось пішло не так');
    }
});


// Сторінка реєстрації
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

// Обробка реєстрації
app.post('/register', (req, res) => {
    const { email, password } = req.body;
    try {
        registerUser(email, password);
        const sessionId = createSession(email);
        res.cookie('sessionId', sessionId, { httpOnly: true });
        res.redirect('/');
    } catch (e) {
        res.status(400).send('Користувач з таким email вже існує');
    }
});

// Сторінка авторизації
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Обробка авторизації
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const isAuthenticated = loginUser(email, password);
    if (isAuthenticated) {
        const sessionId = createSession(email);
        res.cookie('sessionId', sessionId, { httpOnly: true });
        res.redirect('/');
    } else {
        res.status(400).send('Невірний email або пароль');
    }
});

// Вихід з акаунту
app.get('/logout', (req, res) => {
    res.clearCookie('sessionId');
    res.redirect('/login');
});

// Сервер слухає порт
app.listen(PORT, () => {
    console.log(`Сервер працює на http://localhost:${PORT}`);
});
