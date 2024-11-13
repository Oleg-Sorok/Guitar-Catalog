const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const PORT = 2000;

async function scrapeGuitars() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto('https://rozetka.com.ua/ua/gitary/c4628348/', { waitUntil: 'networkidle2' });
        await page.waitForSelector('.goods-tile');

        const guitars = await page.evaluate(() => {
            const results = [];
            const elements = document.querySelectorAll('.goods-tile');

            elements.forEach(element => {
                const name = element.querySelector('.goods-tile__title') ? element.querySelector('.goods-tile__title').textContent.trim() : '';
                const price = element.querySelector('.goods-tile__price-value') ? element.querySelector('.goods-tile__price-value').textContent.trim() : '';
                const link = element.querySelector('.goods-tile__title') ? element.querySelector('.goods-tile__title').href : '';

                if (name && price) {
                    results.push({ name, price, link });
                }
            });

            return results;
        });

        const guitarsHTML = guitars.map(guitar => `
            <div class="guitar-box">
                <h3>${guitar.name}</h3>
                <p>Ціна: ${guitar.price}</p>
                <a href="${guitar.link}" target="_blank">Переглянути</a>
            </div>
        `).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="uk">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" href="/public/styles.css">
                <title>Каталог Гітар</title>
            </head>
            <body>
                <h1>Каталог Гітар</h1>
                <div class="guitar-container">
                    ${guitarsHTML}
                </div>
            </body>
            </html>
        `;

        fs.writeFileSync(path.join(__dirname, 'views', 'index.html'), htmlContent, 'utf-8');
        console.log('Data scraped and saved successfully!');
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        await browser.close();
    }
}

http.createServer(async (req, res) => {
    if (req.url === '/') {
        await scrapeGuitars();
        fs.readFile(path.join(__dirname, 'views', 'index.html'), 'utf-8', (err, content) => {
            if (err) {
                res.writeHead(500);
                return res.end('Error loading index.html');
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content, 'utf-8');
        });
    } else if (req.url.startsWith('/public/')) {
        const filePath = path.join(__dirname, req.url);
        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(404);
                res.end('File not found');
            } else {
                const ext = path.extname(filePath).slice(1);
                const contentType = ext === 'css' ? 'text/css' : 'text/plain';
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    } else {
        res.writeHead(404);
        res.end('<h1>404 Not Found</h1>');
    }
}).listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
