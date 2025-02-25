// main.js

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

require('dotenv').config();

// Инициализация приложения
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Подключаем модули с CRUD для объектов
const trainsRouter = require('./objects/trains');
const calculationsRouter = require('./objects/calculations');
const filesRouter = require("./objects/files");
// Используем маршруты из модуля trains
app.use('/trains', trainsRouter);
app.use('/calculations', calculationsRouter);
app.use("/files", filesRouter);


// Запуск сервера
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
