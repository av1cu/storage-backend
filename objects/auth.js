
const express = require('express');
const { login,register } = require('../auth/authController');
const router = express.Router();
const pool = require("../config/db");


// Функция инициализации таблицы
const createTable = async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL
        );

      `);
      console.log("Таблица users успешно инициализирована.");
    } catch (error) {
      console.error("Ошибка при инициализации таблицы:", error);
    }
  };
  
// Вызов инициализации перед запуском сервера
createTable();
  

// Маршрут для логина
router.post('/login', login);
router.post('/register', register);

module.exports = router;
