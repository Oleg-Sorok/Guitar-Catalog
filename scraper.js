const puppeteer = require('puppeteer');
const axios = require('axios');
const path = require('path');
const pool = require('./db'); // Підключення до бази даних

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
                const name = element.querySelector('.goods-tile__title')?.textContent.trim() || '';
                const price = element.querySelector('.goods-tile__price-value')?.textContent.trim() || '';
                const link = element.querySelector('.goods-tile__title')?.href || '';
                
                // Просто збираємо без зображень
                if (name && price && link) {
                    results.push({ name, price, link });
                }
            });

            return results;
        });

        console.log('Зібрані гітари:', guitars);

        const insertPromises = [];

        for (const guitar of guitars) {
            // Перевірка наявності в базі перед вставкою
            const [rows] = await pool.execute(
                'SELECT * FROM guitars WHERE name = ? AND price = ? AND link = ?',
                [guitar.name, guitar.price, guitar.link]
            );

            if (rows.length === 0) {
                insertPromises.push(
                    pool.execute(
                        'INSERT INTO guitars (name, price, link) VALUES (?, ?, ?)',
                        [guitar.name, guitar.price, guitar.link]
                    )
                );
            } else {
                console.log(`Гітара "${guitar.name}" вже є в базі`);
            }
        }

        // Очікуємо завершення всіх вставок в базу
        await Promise.all(insertPromises);

        console.log('Дані успішно завантажено та збережено!');
    } catch (error) {
        console.error('Помилка під час збору даних:', error);
    } finally {
        await browser.close();
    }
}

module.exports = { scrapeGuitars };
