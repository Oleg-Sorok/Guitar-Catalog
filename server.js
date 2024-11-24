const http = require('http');
const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function getGuitars() {
    const [rows] = await pool.query('SELECT * FROM guitars');
    return rows;
}

const server = http.createServer(async (req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
        const filePath = path.join(__dirname, 'views', 'index.html');
        const guitars = await getGuitars();

        fs.readFile(filePath, 'utf-8', (err, content) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Помилка сервера');
                return;
            }

            const guitarsHtml = guitars.map(guitar => `
                <div class="guitar">
                    <img src="${guitar.image_path}" alt="${guitar.name}">
                    <h2>${guitar.name}</h2>
                    <p>Ціна: ${guitar.price}</p>
                    <a href="${guitar.link}" target="_blank">Детальніше</a>
                </div>
            `).join('');

            const updatedContent = content.replace('{{guitars}}', guitarsHtml);
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(updatedContent);
        });
    } else if (req.url.startsWith('/data/images/')) {
        const imagePath = path.join(__dirname, req.url);
        fs.readFile(imagePath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Зображення не знайдено');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'image/jpeg' });
            res.end(data);
        });
    } else if (req.url === '/styles.css') {
        const filePath = path.join(__dirname, 'public', 'styles.css');
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('CSS не знайдено');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/css' });
            res.end(data);
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Сторінка не знайдена');
    }
});

server.listen(2000, () => {
    console.log('Сервер працює на http://localhost:2000');
});
