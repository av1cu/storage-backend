// middleware/authorization.js

const jwt = require('jsonwebtoken');
require('dotenv').config();  // Для загрузки переменных из .env

const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');  // Извлекаем токен из заголовка

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);  // Проверяем токен
    req.user = decoded;  // Добавляем информацию о пользователе в объект запроса
    next();  // Переходим к следующему middleware или обработчику маршрута
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = authenticate;
