const crypto = require('crypto');

// Масив для зберігання користувачів (замінює базу даних для простоти)
const users = [];

// Об'єкт для зберігання сесій
const sessions = {};

// Хешування паролів
function hashPassword(password) {
    const hash = crypto.createHash('sha256');
    hash.update(password);
    return hash.digest('hex');
}

// Перевірка пароля
function verifyPassword(storedHash, password) {
    return storedHash === hashPassword(password);
}

// Реєстрація користувача
function registerUser(email, password) {
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        throw new Error('Користувач з таким email вже існує');
    }

    const hashedPassword = hashPassword(password);
    users.push({ email, password: hashedPassword });
}

// Логін користувача
function loginUser(email, password) {
    const user = users.find(u => u.email === email);
    if (user && verifyPassword(user.password, password)) {
        return true;
    }
    return false;
}

// Створення сесії
function createSession(userEmail) {
    const sessionId = crypto.randomBytes(16).toString('hex');
    sessions[sessionId] = { userEmail };
    return sessionId;
}

// Отримання сесії
function getSession(sessionId) {
    return sessions[sessionId] || null;
}

module.exports = {
    registerUser,
    loginUser,
    createSession,
    getSession
};
