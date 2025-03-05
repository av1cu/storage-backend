const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pool = require("../config/db"); // <-- Импортируем общее подключение
const authenticate = require('../auth/authorization'); 

const router = express.Router();

const createTable = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS files (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL,
                wagon_id VARCHAR(255) NOT NULL,
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (wagon_id) REFERENCES trains(wagonNumber) ON DELETE CASCADE
            );
        `);
        console.log("Таблица files успешно инициализирована.");
    } catch (error) {
        console.error("Ошибка при инициализации таблицы:", error);
    }
};

createTable();
// Создаём папку uploads, если её нет
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Настраиваем хранилище Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const newFilename = uniqueSuffix + "-" + file.originalname;
        file.newFilename = newFilename; // <-- сохраняем новое имя в объекте file
        cb(null, newFilename);
    },
});

const upload = multer({ storage });

// Загрузка файла
router.post("/upload", authenticate, upload.single("file"), async (req, res) => {
    if (!req.file || !req.body.wagonNumber) {
        return res.status(400).json({ error: "Файл и номер вагона обязательны" });
    }

    const { newFilename } = req.file;
    const { wagonNumber } = req.body;

    try {
        // Получаем wagon_id по wagonNumber
        const wagonResult = await pool.query("SELECT id FROM trains WHERE wagonNumber = $1", [wagonNumber]);
        if (wagonResult.rows.length === 0) {
            return res.status(404).json({ error: "Вагон не найден" });
        }

        // Сохраняем в БД новое имя файла
        const result = await pool.query(
            "INSERT INTO files (filename, wagon_id) VALUES ($1, $2) RETURNING *",
            [newFilename, wagonNumber]
        );

        // Формируем сообщение для Telegram
        const message = `📤 Файл загружен для вагона ${wagonNumber}.
📝 Новый файл: ${newFilename}`;

        // Отправка сообщения в Telegram
        telegram(message);

        return res.status(201).json({ message: "Файл загружен", file: result.rows[0] });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Ошибка при сохранении файла в БД" });
    }
});



// Получение и скачивание последнего загруженного файла
router.get("/:wagonNumber",authenticate, async (req, res) => {
    const { wagonNumber } = req.params;

    try {
        // Получаем wagon_id по номеру вагона
        const wagonResult = await pool.query("SELECT id FROM trains WHERE wagonNumber = $1", [wagonNumber]);
        if (wagonResult.rows.length === 0) {
            return res.status(404).json({ error: "Вагон не найден" });
        }


        // Получаем последний загруженный файл
        const fileResult = await pool.query(
            "SELECT filename FROM files WHERE wagon_id = $1 ORDER BY upload_date DESC LIMIT 1",
            [wagonNumber]
        );

        if (fileResult.rows.length === 0) {
            return res.status(404).json({ error: "Файлы для этого вагона не найдены" });
        }

        const filename = fileResult.rows[0].filename;
        const filePath = path.join(uploadDir, filename);

        // Проверяем, существует ли файл
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "Файл не найден на сервере" });
        }

        // Отправляем файл на скачивание
        res.download(filePath, filename, (err) => {
            if (err) {
                console.error("Ошибка при отправке файла:", err);
                res.status(500).json({ error: "Ошибка при скачивании файла" });
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка при получении файла" });
    }
});

// Проверка наличия файла для конкретного вагона
router.get("/:wagonNumber/exist",authenticate, async (req, res) => {
    const { wagonNumber } = req.params;

    try {
        const fileResult = await pool.query(
            "SELECT filename FROM files WHERE wagon_id = $1 ORDER BY upload_date DESC LIMIT 1",
            [wagonNumber]
        );

        if (fileResult.rows.length === 0) {
            return res.status(404).json({ exists: false, message: "Файл не найден" });
        }

        res.status(200).json({ exists:   true, message: "Файл существует" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка при проверке наличия файла" });
    }
});


// Удаление файла (из БД и с диска)
// Удаление файла
router.delete("/:id", authenticate, async (req, res) => {
    const { id } = req.params;
    try {
        const fileResult = await pool.query("SELECT filename, wagon_id FROM files WHERE id = $1", [id]);

        if (fileResult.rows.length === 0) {
            return res.status(404).json({ error: "Файл не найден в базе данных" });
        }

        const { filename, wagon_id } = fileResult.rows[0];
        const filePath = path.join(uploadDir, filename);

        // Удаляем запись из БД
        await pool.query("DELETE FROM files WHERE id = $1", [id]);

        // Удаляем файл с диска
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Формируем сообщение для Telegram
        const message = `🗑️ Файл удалён для вагона ${wagon_id}.
📝 Удалён файл: ${filename}`;

        // Отправка сообщения в Telegram
        telegram(message);

        res.json({ message: "Файл успешно удалён" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка при удалении файла" });
    }
});


module.exports = router;
