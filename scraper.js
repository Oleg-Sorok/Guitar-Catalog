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
                
                // Не будемо парсити зображення

                if (name && price && link) {
                    results.push({ name, price, link, image: '' });  // Порожнє значення для зображення
                }
            }

            return results;
        });

        console.log('Зібрані гітари:', guitars);

        // Додавання гітари в базу даних без зображень
        for (const guitar of guitars) {
            await pool.execute(
                'INSERT INTO guitars (name, price, link, image_path) VALUES (?, ?, ?, ?)',
                [guitar.name, guitar.price, guitar.link, guitar.image]
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
