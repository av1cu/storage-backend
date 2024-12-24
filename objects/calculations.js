const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors()); // Разрешить все источники

// Настройки базы данных
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

// Функция инициализации таблицы
const createTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wagons (
        id SERIAL PRIMARY KEY,
        wagon_number VARCHAR(50),
        wagon_type VARCHAR(50),
        customer VARCHAR(255),
        start_repair DATE,
        end_repair DATE,
        repair_type VARCHAR(50),
        work_group TEXT, -- Сохраняем массив как строку
        work_name VARCHAR(255),
        work_cost DECIMAL,
        material_cost DECIMAL,
        energy_cost DECIMAL,
        fuel_cost DECIMAL,
        social_contributions DECIMAL,
        total DECIMAL, -- Новый столбец
        total_with_vat DECIMAL -- Новый столбец
      );
    `);
    console.log("Таблица wagons успешно инициализирована.");
  } catch (error) {
    console.error("Ошибка при инициализации таблицы:", error);
  }
};

// Вызов инициализации перед запуском сервера
createTable();

app.post("/", async (req, res) => {
  console.log("received post method body:", req.body);
  try {
    const {
      "Номер вагона": wagonNumber,
      "Тип вагона": wagonType,
      "Заказчик": customer,
      "Начало ремонта": startRepair,
      "Конец ремонта": endRepair,
      "Тип ремонта": repairType,
      "Группа работ": workGroup,
      "workName": workName,
      "workCost": workCost,
      "Расходные материалы": materialName,
      "materialCost": materialCost,
      "Электроэнергия (тенге)": energyCost,
      "Топливо (тенге)": fuelCost,
      "Социальные отчисления (тенге)": socialContributions,
      "total": total,
      "totalWithVAT": totalWithVAT
    } = req.body;

    // Убедитесь, что вы передаете все данные
    const result = await pool.query(
      `INSERT INTO wagons (
        wagon_number, wagon_type, customer, start_repair, end_repair, repair_type, 
        work_group, work_name, work_cost, material_cost, energy_cost, fuel_cost, 
        social_contributions, total, total_with_vat
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [
        wagonNumber,
        wagonType,
        customer,
        startRepair,
        endRepair,
        repairType,
        JSON.stringify(workGroup), // Сохраняем массив как строку
        workName,
        workCost,
        materialCost,
        energyCost,
        fuelCost,
        socialContributions,
        total,
        totalWithVAT
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send("Ошибка при добавлении записи");
  }
});


// READ: Получить все записи
app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM wagons");
    // Преобразуем строковое представление массива обратно в массив
    result.rows.forEach(row => {
      row.work_group = JSON.parse(row.work_group);
    });
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send("Ошибка при получении данных");
  }
});

// READ: Получить одну запись по ID
app.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM wagons WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).send("Запись не найдена");
    }
    // Преобразуем строковое представление массива обратно в массив
    result.rows.forEach(row => {
      row.work_group = JSON.parse(row.work_group);
    });
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send("Ошибка при получении данных");
  }
});

// UPDATE: Обновить запись
app.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      "Номер вагона": wagonNumber,
      "Тип вагона": wagonType,
      "Заказчик": customer,
      "Начало ремонта": startRepair,
      "Конец ремонта": endRepair,
      "Тип ремонта": repairType,
      "Группа работ": workGroup,
      "workName": workName,
      "workCost": workCost,
      "Расходные материалы": materialName,
      "materialCost": materialCost,
      "Электроэнергия (тенге)": energyCost,
      "Топливо (тенге)": fuelCost,
      "Социальные отчисления (тенге)": socialContributions,
      "total": total,
      "totalWithVAT": totalWithVAT
    } = req.body;

    const result = await pool.query(
      `UPDATE wagons SET
        wagon_number = $1, wagon_type = $2, customer = $3, start_repair = $4, 
        end_repair = $5, repair_type = $6, work_group = $7, work_name = $8, 
        work_cost = $9, material_cost = $10, energy_cost = $11, fuel_cost = $12, 
        social_contributions = $13, total = $14, total_with_vat = $15
      WHERE id = $16 RETURNING *`,
      [
        wagonNumber,
        wagonType,
        customer,
        startRepair,
        endRepair,
        repairType,
        JSON.stringify(workGroup), // Обновляем массив как строку
        workName,
        workCost,
        materialCost,
        energyCost,
        fuelCost,
        socialContributions,
        total,
        totalWithVAT,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Запись не найдена");
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send("Ошибка при обновлении записи");
  }
});

// DELETE: Удалить запись
app.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM wagons WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).send("Запись не найдена");
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send("Ошибка при удалении записи");
  }
});

module.exports = app;
