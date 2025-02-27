const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');  // Импортируем Pool для работы с PostgreSQL
require('dotenv').config(); 



// Логика входа
const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Получаем пользователя по имени
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Проверяем правильность пароля
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Генерация JWT токена
    const token = jwt.sign(
      { userId: user.id, username: user.username }, // payload
      process.env.JWT_SECRET,  // Секретный ключ из .env
      { expiresIn: process.env.JWT_EXPIRATION || '1d' } // Срок действия токена
    );

    res.json({ token });  // Возвращаем токен клиенту
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Логика регистрации
const register = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Проверяем, существует ли уже пользователь с таким логином
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const existingUser = result.rows[0];
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем нового пользователя
    const insertResult = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username',
      [username, hashedPassword]
    );

    const newUser = insertResult.rows[0];

    // Генерируем JWT токен для нового пользователя
    const token = jwt.sign(
      { userId: newUser.id, username: newUser.username },
      process.env.JWT_SECRET,  // Секретный ключ из .env
      { expiresIn: process.env.JWT_EXPIRATION || '1d' }  // Срок действия токена
    );

    // Отправляем токен пользователю
    res.status(201).json({ token });  // Возвращаем токен
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


module.exports = { login,register };
