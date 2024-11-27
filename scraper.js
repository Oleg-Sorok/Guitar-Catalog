const puppeteer = require('puppeteer');
const pool = require('./db');  // Підключення до бази даних

// Функція для запису даних у базу даних без перевірки на дублікати
async function saveGuitarsToDatabase(guitars) {
    for (const guitar of guitars) {
        const { name, price, link, image } = guitar;

        // SQL запит для оновлення або вставки нової гітари
        const upsertSql = `
            INSERT INTO guitars (name, price, link, image_path) 
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            price = VALUES(price), 
            image_path = VALUES(image_path), 
            link = VALUES(link)
        `;

        // Виконуємо upsert (вставка або оновлення)
        await pool.query(upsertSql, [name, price, link, image]);
        console.log(`Гітару "${name}" успішно оновлено або додано в базу даних.`);
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
            const image = guitar.querySelector('img')?.src;  // Парсимо URL зображення

            // Виведення кожної гітари для перевірки
            console.log(`Гітара: ${name}, Ціна: ${price}, Посилання: ${link}, Зображення: ${image}`);

            if (name && price && link) {
                guitars.push({
                    name,
                    price,  // Ціна зберігається як текст
                    link,
                    image_path: image,  // Зберігаємо URL зображення
                });
            }
        });

        return guitars;
    });

    console.log('Парсинг завершено. Результат:', guitars);

    // Закриваємо браузер після парсингу
    await browser.close();

    // Записуємо гітари в базу даних
    await saveGuitarsToDatabase(guitars);

    
})();


