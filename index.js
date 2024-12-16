// Импорт зависимостей
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
require('dotenv').config();

// Настройки базы данных
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Инициализация приложения
const app = express();
app.use(cors({ origin: process.env.ORIGIN }));
app.use(bodyParser.json());

// Создание таблицы trains
const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS trains (
      id SERIAL PRIMARY KEY,
      wagonNumber VARCHAR(255),
      wagonType VARCHAR(255),
      customer VARCHAR(255),
      contract VARCHAR(255),
      repairStart DATE,
      repairEnd DATE,
      repairType VARCHAR(255),
      workgroup TEXT[],  -- Массив строк для группы работ
      workname VARCHAR(255),
      executor VARCHAR(255),
      comment TEXT,
      status VARCHAR(255)
    );
  `;
  await pool.query(query);
};

createTable().catch((err) => console.error('Error creating table:', err));

// CRUD endpoints

// 1. Получение всех записей
app.get('/trains', async (req, res) => {
  try {
    // Получаем все записи из базы данных
    const result = await pool.query('SELECT * FROM trains');

    // Преобразуем каждую запись в нужный формат
    const formattedData = result.rows.map((row) => {
      const data = [
        { label: 'Номер вагона', value: row.wagonnumber },
        { label: 'Дата', value: row.repairstart },
        { label: 'Тип вагона', value: row.wagontype },
        { label: 'Заказчик', value: row.customer },
        { label: 'Начало ремонта', value: row.repairstart },
        { label: 'Конец ремонта', value: row.repairend },
        { label: 'Тип ремонта', value: row.repairtype },
        // Обработка workgroup
        {
          label: 'Группа работ',
          value:
            Array.isArray(row.workgroup) && row.workgroup.length === 1
              ? row.workgroup[0] // Если только один элемент, преобразуем в строку
              : row.workgroup, // Если несколько элементов, оставляем как массив
        },
        { label: 'Наименование работ', value: row.workname },
        { label: 'Примечание', value: row.note || 'Нет примечаний' }, // Если примечание не задано, подставляем дефолтное значение
        { label: 'Статус', value: row.status || 'Не определён' }, // Статус с дефолтным значением
        { label: 'Исполнитель', value: row.executor },
      ];

      return {
        id: row.id,
        data,
      };
    });

    res.json(formattedData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trains' });
  }
});

// 2. Получение записи по ID
app.get('/trains/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM trains WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Train not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch train' });
  }
});

// 3. Добавление новой записи
app.post('/trains', async (req, res) => {
  const {
    wagonnumber,
    wagontype,
    customer,
    contract,
    repairstart,
    repairend,
    repairtype,
    workgroup,
    workname,
    executor,
  } = req.body;

  try {
    // Выполняем SQL-запрос с добавлением предустановленных значений для "status" и "comment"
    const result = await pool.query(
      `INSERT INTO trains (
        wagonnumber, wagontype, customer, contract, repairstart, repairend, repairtype, workgroup, workname, executor, comment, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        wagonnumber,
        wagontype,
        customer,
        contract,
        repairstart,
        repairend,
        repairtype,
        workgroup,
        workname,
        executor,
        '', // Пустое значение для comment
        'Не начато', // Значение по умолчанию для status
      ]
    );

    // Возвращаем результат успешного добавления
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error while creating train:', err);
    res.status(500).json({ error: 'Failed to create train' });
  }
});

// 4. Обновление записи по ID
app.put('/trains/:id', async (req, res) => {
  const { id } = req.params;
  const {
    wagonNumber,
    wagonType,
    customer,
    contract,
    repairStart,
    repairEnd,
    repairType,
    workgroup,
    workname,
    executor,
  } = req.body;

  try {
    const result = await pool.query(
      'UPDATE trains SET wagonNumber = $1, wagonType = $2, customer = $3, contract = $4, repairStart = $5, repairEnd = $6, repairType = $7, workgroup = $8, workname = $9, executor = $10 WHERE id = $11 RETURNING *',
      [
        wagonNumber,
        wagonType,
        customer,
        contract,
        repairStart,
        repairEnd,
        repairType,
        workgroup,
        workname,
        executor,
        id,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Train not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update train' });
  }
});

// 5. Удаление записи по ID
app.delete('/trains/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM trains WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Train not found' });
    }
    res.json({ message: 'Train deleted', train: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete train' });
  }
});

// Запуск сервера
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
