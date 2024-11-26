const express = require('express');
const path = require('path');
const fs = require('fs');
const pool = require('./db');
const session = require('express-session');
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
async function getGuitars() {
    const [rows] = await pool.query('SELECT * FROM guitars');
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

// Головна сторінка (каталог гітар) - доступно тільки для авторизованих користувачів
app.get('/', isAuthenticated, async (req, res) => {
    const guitars = await getGuitars();
    const filePath = path.join(__dirname, 'views', 'index.html');

    fs.readFile(filePath, 'utf-8', (err, content) => {
        if (err) {
            res.status(500).send('Помилка сервера');
            return;
        }

        const guitarsHtml = guitars.map(guitar =>` 
            <div class="guitar">
                <h2>${guitar.name}</h2>
                <p>Ціна: ${guitar.price}</p>
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

// Реєстрація користувача (дані не зберігаються в базі)
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    // Створюємо сесію для нового користувача
    req.session.user = { username, password }; // Зберігаємо в сесії (без пароля в реальному застосунку)
    
    res.redirect('/');
});

// Сторінка для авторизації
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Авторизація користувача
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Для простоти тут просто перевіряємо введені дані (у реальному застосунку необхідна валідація)
    if (username === req.session.user?.username && password === req.session.user?.password) {
        req.session.user = { username, password };  // Зберігаємо користувача в сесії
        res.redirect('/');
    } else {
        // Якщо авторизація не вдалася, перенаправляємо на сторінку входу з повідомленням про помилку
        res.redirect('/login?error=Невірний логін або пароль');
    }
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