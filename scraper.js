const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const pool = require('./db');  // Підключення до бази даних

async function scrapeGuitars() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto('https://rozetka.com.ua/ua/gitary/c4628348/', { waitUntil: 'networkidle2' });
        await page.waitForSelector('.goods-tile');

        const guitars = await page.evaluate(async () => {
            const results = [];
            const elements = document.querySelectorAll('.goods-tile');

            for (const element of elements) {
                const name = element.querySelector('.goods-tile__title')?.textContent.trim() || '';
                const price = element.querySelector('.goods-tile__price-value')?.textContent.trim() || '';
                const link = element.querySelector('.goods-tile__title')?.href || '';

                // Використовуємо XPath для отримання зображення
                const imgElement = await element.$x(".//a/img"); // Використовуємо XPath для зображення
                let image = '';
                if (imgElement.length > 0) {
                    image = await imgElement[0].getProperty('src').then(src => src.jsonValue());
                }

                // Якщо зображення не знайдено, пробуємо отримати data-src
                if (!image) {
                    image = element.querySelector('.goods-tile__img')?.getAttribute('data-src') || '';
                }

                // Перевірка, чи є зображення і коректний URL
                if (image && !image.startsWith('http')) {
                    image = 'https://rozetka.com.ua' + image;
                }

                if (name && price && link && image) {
                    results.push({ name, price, link, image });
                }
            }

            return results;
        });

        console.log('Зібрані гітари:', guitars);

        const imageFolderPath = path.join(__dirname, 'data', 'images');
        if (!fs.existsSync(imageFolderPath)) {
            fs.mkdirSync(imageFolderPath, { recursive: true });
        }

        for (const guitar of guitars) {
            if (guitar.image) {
                const imageName = path.basename(guitar.image);
                const imagePath = path.join(imageFolderPath, imageName);

                // Завантаження зображення
                await downloadImage(guitar.image, imagePath);

                // Оновлення шляху до зображення на сервері
                guitar.image = `/data/images/${imageName}`;
            }

            // Додавання гітари в базу даних
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

async function downloadImage(imageUrl, imagePath) {
    const writer = fs.createWriteStream(imagePath);
    const response = await axios({ url: imageUrl, method: 'GET', responseType: 'stream' });
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

module.exports = { scrapeGuitars };
