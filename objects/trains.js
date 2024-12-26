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
      wagonNumber VARCHAR(255) UNIQUE,
      wagonType VARCHAR(255),
      customer VARCHAR(255),
      contract VARCHAR(255),
      repairStart DATE,
      repairEnd DATE,
      repairType VARCHAR(255),
      workgroup TEXT[],
      workgroupstatus JSONB,
      workname VARCHAR(255),
      executor VARCHAR(255),
      comment TEXT,
      status VARCHAR(255)
    );`;
  await pool.query(query);
};

createTable().catch((err) => console.error('Error creating table:', err));

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM trains');
    const formattedData = result.rows.map((row) => {
      // Форматируем workgroupstatus в удобный вид
      const formattedWorkgroupStatus = row.workgroupstatus
        ? row.workgroupstatus.map((item) => ({
            value: item.value,
            status: item.status,
          }))
        : []; // Если workgroupstatus не существует, возвращаем пустой массив

      return {
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
          // Добавляем workgroupstatus
          {
            label: 'Статус группы работ',
            value:
              formattedWorkgroupStatus.length > 0
                ? formattedWorkgroupStatus
                : 'Нет статусов',
          },
        ],
      };
    });
    res.json(formattedData);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Failed to fetch trains' });
    // res.status(500).json({ error: err });
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
    // Генерация workGroupStatus из workgroup
    const workGroupStatus = workgroup.map((work) => ({
      value: work,
      status: 'В ожидании',
    }));

    // Преобразование workGroupStatus в строку JSON
    const workGroupStatusJSON = JSON.stringify(workGroupStatus);

    const result = await pool.query(
      `INSERT INTO trains (
        wagonNumber, wagonType, customer, contract, repairStart, repairEnd, repairType, workgroup, workname, executor, comment, status, workgroupStatus
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
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
        workGroupStatusJSON, // JSON-строка workGroupStatus
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create train' });
    // res.status(500).json({ error: err });
  }
});

router.put('/:id', async (req, res) => {
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
    workgroupStatus, // Новое поле для обновления workGroupStatus
    status,
  } = req.body;

  try {
    // Получаем текущие данные из базы
    const currentDataResult = await pool.query(
      `SELECT workgroupstatus FROM trains WHERE id = $1`,
      [id]
    );

    if (currentDataResult.rows.length === 0) {
      return res.status(404).json({ error: 'Train not found' });
    }

    let updatedWorkgroupStatus =
      currentDataResult.rows[0].workgroupstatus || [];

    // Если workgroupStatus передан, обновляем его
    if (workgroupStatus && workgroupStatus.length > 0) {
      // Обновляем статус в переданном workgroupStatus
      updatedWorkgroupStatus = updatedWorkgroupStatus.map((item) => {
        if (workgroupStatus.some((ws) => ws.value === item.value)) {
          return {
            ...item,
            status: workgroupStatus.find((ws) => ws.value === item.value)
              .status,
          };
        }
        return item;
      });
    }

    // Преобразуем updatedWorkgroupStatus в строку JSON
    const updatedWorkgroupStatusJson = JSON.stringify(updatedWorkgroupStatus);

    // Выполнение основного запроса с обновленными данными
    const result = await pool.query(
      `UPDATE trains
       SET
         wagonNumber = $1,
         wagonType = $2,
         customer = $3,
         contract = $4,
         repairStart = $5,
         repairEnd = $6,
         repairType = $7,
         workgroup = $8,
         workname = $9,
         executor = $10,
         workgroupstatus = $11,
         status = $12
       WHERE id = $13
       RETURNING *`,
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
        updatedWorkgroupStatusJson, // передаем строку JSON
        status,
        id,
      ]
    );

    // Если запись не найдена
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Train not found' });
    }

    // Возвращаем обновленные данные
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: 'Internal server error', details: err.message });
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
