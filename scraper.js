const puppeteer = require('puppeteer');
const pool = require('./db');  // Підключення до бази даних

async function scrapeGuitars() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto('https://rozetka.com.ua/ua/gitary/c4628348/', { waitUntil: 'networkidle2' });
        await page.waitForSelector('.goods-tile');

        const guitars = await page.evaluate(() => {
            const results = [];
            const elements = document.querySelectorAll('.goods-tile');

            for (const element of elements) {
                const name = element.querySelector('.goods-tile__title')?.textContent.trim() || '';
                const price = element.querySelector('.goods-tile__price-value')?.textContent.trim() || '';
                const link = element.querySelector('.goods-tile__title')?.href || '';
                const image = element.querySelector('.goods-tile__image img')?.src || ''; // XPath для зображення

                if (name && price && link && image) {
                    results.push({ name, price, link, image_path: image });
                }
            }

            return results;
        });

        console.log('Зібрані гітари:', guitars);

        // Додавання гітари в базу даних
        for (const guitar of guitars) {
            await pool.execute(
                'INSERT INTO guitars (name, price, link, image_path) VALUES (?, ?, ?, ?)',
                [guitar.name, guitar.price, guitar.link, guitar.image_path]
            );
        }

        console.log('Дані успішно завантажено та збережено!');
    } catch (error) {
        console.error('Помилка під час збору даних:', error);
    } finally {
        await browser.close();
    }
}

module.exports = { scrapeGuitars };
