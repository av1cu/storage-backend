// objects/trains.js

const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const cors = require('cors');

const router = express();
router.use(bodyParser.json());
router.use(cors()); // Разрешить все источники

// Настройки базы данных
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

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
      workgroup TEXT[],
      workname VARCHAR(255),
      executor VARCHAR(255),
      comment TEXT,
      status VARCHAR(255)
    );
  `;
  await pool.query(query);
};

createTable().catch((err) => console.error('Error creating table:', err));

// 1. Получение всех записей
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM trains');
    const formattedData = result.rows.map((row) => ({
      id: row.id,
      data: [
        { label: 'Номер вагона', value: row.wagonnumber },
        { label: 'Дата', value: row.repairstart },
        { label: 'Тип вагона', value: row.wagontype },
        { label: 'Заказчик', value: row.customer },
        { label: 'Начало ремонта', value: row.repairstart },
        { label: 'Конец ремонта', value: row.repairend },
        { label: 'Тип ремонта', value: row.repairtype },
        {
          label: 'Группа работ',
          value:
            Array.isArray(row.workgroup) && row.workgroup.length === 1
              ? row.workgroup[0]
              : row.workgroup,
        },
        { label: 'Наименование работ', value: row.workname },
        { label: 'Примечание', value: row.note || 'Нет примечаний' },
        { label: 'Статус', value: row.status || 'Не определён' },
        { label: 'Исполнитель', value: row.executor },
      ],
    }));
    res.json(formattedData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trains' });
  }
});

// 2. Получение записи по ID
router.get('/:id', async (req, res) => {
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
router.post('/', async (req, res) => {
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
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create train' });
  }
});

// 4. Обновление записи по ID
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    wagonnumber,
    wagontype,
    customer,
    contract,
    repairstart,
    repairEnd,
    repairtype,
    workgroup,
    workname,
    executor,
    status,
  } = req.body;

  try {
    const result = await pool.query(
      'UPDATE trains SET wagonnumber = $1, wagontype = $2, customer = $3, contract = $4, repairstart = $5, repairend = $6, repairtype = $7, workgroup = $8, workname = $9, executor = $10, status = $11 WHERE id = $12 RETURNING *',
      [
        wagonnumber,
        wagontype,
        customer,
        contract,
        repairstart,
        repairEnd,
        repairtype,
        workgroup,
        workname,
        executor,
        status,
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
router.delete('/:id', async (req, res) => {
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

module.exports = router;
