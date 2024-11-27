const puppeteer = require('puppeteer');
const mysql = require('mysql2');

// Підключення до бази даних MySQL
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',   // замініть на ваше ім'я користувача
    password: '0000', // замініть на ваш пароль
    database: 'guitars_catalog' // замініть на назву вашої бази
});

// Функція для запису даних у базу даних
async function saveGuitarsToDatabase(guitars) {
    for (const guitar of guitars) {
        const { name, price, link, imagePath } = guitar;

        // Якщо зображення відсутнє, передаємо порожній рядок
        const image = imagePath || '';

        // SQL запит для вставки даних в таблицю
        const sql = 'INSERT INTO guitars (name, price, link, image_path) VALUES (?, ?, ?, ?)';

        // Виконання запиту
        await pool.promise().query(sql, [name, price, link, image]);
        console.log(`Гітару "${name}" успішно додано в базу даних.`);
    }
}

// Основна функція парсингу та запису в базу
(async () => {
    const browser = await puppeteer.launch({ headless: false }); // Запуск в режимі не headless для дебагу
    const page = await browser.newPage();

    console.log('Підключаємось до сторінки...');

    // Переходимо на сторінку
    await page.goto('https://rozetka.com.ua/ua/gitary/c4628348/', { waitUntil: 'networkidle2' });

    // Чекаємо, поки елементи з'являться на сторінці
    await page.waitForSelector('.goods-tile');  // Чекаємо, поки з'являться елементи гітар
    console.log('Елементи завантажено');

    // Оцінюємо сторінку та витягуємо дані
    const guitars = await page.evaluate(() => {
        const guitarElements = document.querySelectorAll('.goods-tile');  // Знайдемо всі елементи гітар
        console.log(`Знайдено ${guitarElements.length} гітар`);

        const guitars = [];

        guitarElements.forEach(guitar => {
            const name = guitar.querySelector('.goods-tile__title')?.textContent?.trim();
            const price = guitar.querySelector('.goods-tile__price-value')?.textContent?.trim();
            const link = guitar.querySelector('a')?.href;
            const imagePath = guitar.querySelector('img')?.src;  // Парсимо URL зображення

            // Виведення кожної гітари для перевірки
            console.log(`Гітара: ${name}, Ціна: ${price}, Посилання: ${link}, Зображення: ${imagePath}`);

            if (name && price && link) {
                guitars.push({
                    name,
                    price,  // Ціна зберігається як текст
                    link,
                    image_path: imagePath,  // Зберігаємо URL зображення
                });
            }
        });

        return guitars;
    });

    console.log('Парсинг завершено. Результат:', guitars);

    // Закриваємо браузер після парсингу
    await browser.close();

    // Записуємо гітари в базу даних
    //await saveGuitarsToDatabase(guitars);

    // Закриваємо з'єднання з базою даних
    pool.end();
})();
