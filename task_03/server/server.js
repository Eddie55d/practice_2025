const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Путь к файлу экспертной системы
const EXPERT_SYSTEM_PATH = path.join(__dirname, 'expert-system.clp');

// Глобальная переменная для хранения процесса CLIPS
let clipsProcess = null;

// Преобразование типа симптома в номер
function getSymptomTypeNumber(type) {
    const typeMap = {
        'боль': 1,
        'температура': 2,
        'воспаление': 3,
        'аллергия': 4,
        'пищеварение': 5
    };
    return typeMap[type] || 1;
}

// Функция инициализации CLIPS
async function initializeCLIPS() {
    return new Promise((resolve, reject) => {
        if (clipsProcess) {
            console.log('CLIPS уже инициализирован');
            resolve(true);
            return;
        }

        clipsProcess = spawn('clips');
        let output = '';
        let initialized = false;

        // Загружаем экспертную систему
        const initCommands = [
            `(load "${EXPERT_SYSTEM_PATH}")`,
            ''
        ];

        initCommands.forEach(command => {
            clipsProcess.stdin.write(command + '\n');
        });

        clipsProcess.stdout.on('data', (data) => {
            output += data.toString();
            if (output.includes('TRUE') && output.includes('CLIPS>')) {
                if (!initialized) {
                    initialized = true;
                    console.log('CLIPS успешно инициализирован');
                    resolve(true);
                }
            }
        });

        clipsProcess.stderr.on('data', (data) => {
            console.log('CLIPS stderr:', data.toString());
        });

        clipsProcess.on('error', (error) => {
            console.error('Ошибка инициализации CLIPS:', error);
            reject(error);
        });

        setTimeout(() => {
            if (!initialized) {
                reject(new Error('Таймаут инициализации CLIPS'));
            }
        }, 10000);
    });
}

// Функция выполнения консультации
async function executeConsultation(patient, symptoms) {
    return new Promise((resolve, reject) => {
        if (!clipsProcess) {
            reject(new Error('CLIPS не инициализирован'));
            return;
        }

        let output = '';
        let consultationCompleted = false;

        // Команды для новой консультации
        const commands = [
            '(новый-пациент)', // используем функцию нового пациента
            patient.name,
            patient.age.toString(),
            patient.gender === 'женский' ? 'ж' : 'м',
            patient.pregnancy ? 'д' : 'н',
            ...symptoms.flatMap(symptom => [
                getSymptomTypeNumber(symptom.type).toString(),
                (symptom.intensity || 5).toString()
            ]),
            '0', // завершение ввода симптомов
            '',  // дополнительный Enter для подтверждения
            ''   // еще один для надежности
        ];

        console.log('Отправляемые команды CLIPS:', commands);

        // Очищаем предыдущий вывод
        output = '';

        // Создаем временный обработчик для вывода
        const stdoutHandler = (data) => {
            const text = data.toString();
            output += text;
            console.log('CLIPS stdout:', text.trim());

            // Проверяем завершение работы системы
            if (text.includes('КОНЕЦ РАБОТЫ СИСТЕМЫ') && !consultationCompleted) {
                consultationCompleted = true;
                console.log('Обнаружено завершение работы системы');
                try {
                    const results = parseCLIPSOutput(output);
                    resolve(results);
                } catch (error) {
                    reject(new Error('Ошибка обработки результатов'));
                }
            }

            // Если видим "Ваш выбор:" после ввода 0, отправляем еще один Enter
            if (text.includes('Ваш выбор:') && output.includes('0')) {
                setTimeout(() => {
                    if (clipsProcess && !consultationCompleted) {
                        console.log('Отправляем дополнительный Enter для завершения');
                        clipsProcess.stdin.write('\n');
                    }
                }, 500);
            }
        };

        // Устанавливаем обработчик
        clipsProcess.stdout.on('data', stdoutHandler);

        // Отправляем команды в CLIPS
        commands.forEach((command, index) => {
            setTimeout(() => {
                if (clipsProcess && !consultationCompleted) {
                    clipsProcess.stdin.write(command + '\n');
                    console.log(`Отправлена команда ${index + 1}: ${command}`);
                }
            }, index * 300); // Задержка между командами
        });

        // Таймаут консультации
        setTimeout(() => {
            if (!consultationCompleted) {
                console.log('Таймаут консультации, проверяем вывод...');
                console.log('Текущий вывод:', output.substring(output.length - 500));
                
                if (output.includes('РЕКОМЕНДАЦИИ ДЛЯ:') || output.includes('Всего найдено рекомендаций:')) {
                    try {
                        const results = parseCLIPSOutput(output);
                        console.log('Консультация завершена по таймауту, но есть результаты');
                        resolve(results);
                    } catch (error) {
                        reject(new Error('Таймаут выполнения консультации - ошибка парсинга'));
                    }
                } else {
                    reject(new Error('Таймаут выполнения консультации - нет результатов'));
                }
                
                // Убираем обработчик
                clipsProcess.stdout.removeListener('data', stdoutHandler);
            }
        }, 20000); // Увеличиваем таймаут до 20 секунд

    });
}


// Парсинг вывода CLIPS 
function parseCLIPSOutput(output) {
    console.log('Парсинг вывода CLIPS...');
    
    const lines = output.split('\n');
    const recommendations = [];
    const missingRecommendations = []; // Для случаев, когда препараты не найдены
    let inRecommendations = false;
    let currentDrug = null;
    let currentMissing = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Начало блока рекомендаций
        if (line.includes('РЕКОМЕНДАЦИИ ДЛЯ:')) {
            inRecommendations = true;
            console.log('Найден блок рекомендаций');
            continue;
        }
        
        // Конец блока рекомендаций
        if (line.includes('Всего найдено рекомендаций:') || 
            line.includes('Всего пунктов в рекомендациях:') ||
            line.includes('КОНЕЦ РАБОТЫ СИСТЕМЫ')) {
            inRecommendations = false;
            if (currentDrug) {
                recommendations.push(currentDrug);
                currentDrug = null;
            }
            if (currentMissing) {
                missingRecommendations.push(currentMissing);
                currentMissing = null;
            }
            continue;
        }
        
        if (inRecommendations) {
            // Название препарата (строка с цифрой и точкой)
            const drugMatch = line.match(/^(\d+)\.\s+(.+)$/);
            if (drugMatch) {
                // Сохраняем предыдущие записи
                if (currentDrug) {
                    recommendations.push(currentDrug);
                    currentDrug = null;
                }
                if (currentMissing) {
                    missingRecommendations.push(currentMissing);
                    currentMissing = null;
                }
                
                const drugName = drugMatch[2].trim();
                
                // Проверяем, это настоящий препарат или "не найдено"
                if (drugName.includes('[НЕ НАЙДЕНО ПРЕПАРАТА]')) {
                    currentMissing = {
                        тип: 'не_найдено',
                        показание: '',
                        статус: 'требуется консультация врача',
                        причина: 'нет подходящих препаратов в базе данных'
                    };
                    console.log('Найден случай отсутствия препарата');
                } else {
                    currentDrug = {
                        препарат: drugName,
                        форма: '',
                        дозировка: '',
                        цена: 0,
                        приоритет: 8.0,
                        обоснование: '',
                        беременностьСтатус: 'нет',
                        разрешеноБеременным: 'требуется консультация'
                    };
                    console.log('Найден препарат:', currentDrug.препарат);
                }
                continue;
            }
            
            // Обработка данных для найденного препарата
            if (currentDrug) {
                // Форма выпуска
                if (line.includes('Форма выпуска:') || line.includes('Форма:')) {
                    currentDrug.форма = line.split(':')[1]?.trim() || 'таблетки';
                }
                // Дозировка
                else if (line.includes('Дозировка:')) {
                    currentDrug.дозировка = line.split(':')[1]?.trim() || '';
                }
                // Цена
                else if (line.includes('Цена:')) {
                    const priceMatch = line.match(/(\d+[.,]\d+)/);
                    if (priceMatch) {
                        currentDrug.цена = parseFloat(priceMatch[1].replace(',', '.'));
                    }
                }
                // Показание/обоснование
                else if (line.includes('Показание:')) {
                    currentDrug.обоснование = line.split(':')[1]?.trim() || '';
                }
                // Статус беременности пациента
                else if (line.includes('Статус беременности:')) {
                    currentDrug.беременностьСтатус = line.includes('да') ? 'да' : 'нет';
                    console.log('🤰 Статус беременности:', currentDrug.беременностьСтатус);
                }
                // Разрешение при беременности
                else if (line.includes('Разрешён при беременности:')) {
                    if (line.includes('Да')) {
                        currentDrug.разрешеноБеременным = 'разрешено';
                        console.log('Разрешён при беременности');
                    } else if (line.includes('Нет')) {
                        currentDrug.разрешеноБеременным = 'запрещено';
                        console.log('Запрещён при беременности');
                    }
                }
            }
            
            // Обработка данных для случая "не найдено"
            if (currentMissing) {
                if (line.includes('Показание:')) {
                    currentMissing.показание = line.split(':')[1]?.trim() || '';
                }
                else if (line.includes('Статус:')) {
                    currentMissing.статус = line.split(':')[1]?.trim() || 'требуется консультация врача';
                }
                else if (line.includes('Причина:')) {
                    currentMissing.причина = line.split(':')[1]?.trim() || 'нет подходящих препаратов в базе данных';
                }
            }
            
            // Разделитель между записями
            if (line.includes('---------------------')) {
                if (currentDrug) {
                    recommendations.push(currentDrug);
                    currentDrug = null;
                }
                if (currentMissing) {
                    missingRecommendations.push(currentMissing);
                    currentMissing = null;
                }
            }
        }
    }
    
    // Добавляем последние записи
    if (currentDrug) {
        recommendations.push(currentDrug);
    }
    if (currentMissing) {
        missingRecommendations.push(currentMissing);
    }
    
    console.log(`Найдено препаратов: ${recommendations.length}`);
    console.log(`Не найдено препаратов для: ${missingRecommendations.length} симптомов`);
    
    // Логируем информацию для отладки
    recommendations.forEach((rec, index) => {
        console.log(`Рекомендация ${index + 1}:`, {
            препарат: rec.препарат,
            беременностьСтатус: rec.беременностьСтатус,
            разрешеноБеременным: rec.разрешеноБеременным
        });
    });
    
    missingRecommendations.forEach((miss, index) => {
        console.log(`Не найдено ${index + 1}:`, miss);
    });
    
    // Проверяем, есть ли вообще какие-либо рекомендации
    if (recommendations.length === 0 && missingRecommendations.length === 0) {
        throw new Error('Не найдено рекомендаций в выводе CLIPS');
    }
    
    return { 
        recommendations,
        missingRecommendations,
        summary: {
            totalFound: recommendations.length,
            totalMissing: missingRecommendations.length,
            totalSymptoms: recommendations.length + missingRecommendations.length
        }
    };
}

// Инициализация при запуске сервера
initializeCLIPS().catch(error => {
    console.error('Ошибка инициализации CLIPS:', error);
});

// API Routes
app.post('/api/consultation', async (req, res) => {
    try {
        const { patient, symptoms } = req.body;
        
        console.log('Получен запрос на консультацию:', { 
            patient: patient,
            симптомы: symptoms.map(s => ({ ...s, номер: getSymptomTypeNumber(s.type) }))
        });
        
        // Валидация
        if (!patient || !symptoms || !patient.name || !patient.age) {
            return res.status(400).json({ error: 'Недостаточно данных пациента или симптомов' });
        }
        
        // Выполняем консультацию
        console.log('Запуск консультации...');
        const result = await executeConsultation(patient, symptoms);
        
        console.log(`Успешно получено ${result.recommendations.length} рекомендаций`);
        res.json(result);
        
    } catch (error) {
        console.error('Ошибка:', error.message);
        res.status(500).json({ 
            error: error.message,
            recommendations: [] 
        });
    }
});

app.get('/api/symptom-types', (req, res) => {
    const symptomTypes = [
        { id: 'боль', name: 'Боль', description: 'Болевой синдром', number: 1 },
        { id: 'температура', name: 'Температура', description: 'Повышенная температура', number: 2 },
        { id: 'воспаление', name: 'Воспаление', description: 'Воспалительный процесс', number: 3 },
        { id: 'аллергия', name: 'Аллергия', description: 'Аллергическая реакция', number: 4 },
        { id: 'пищеварение', name: 'Пищеварение', description: 'Проблемы с пищеварением', number: 5 }
    ];
    res.json(symptomTypes);
});

app.get('/api/health', (req, res) => {
    const status = clipsProcess ? 'OK' : 'INITIALIZING';
    res.json({ 
        status: status, 
        message: clipsProcess ? 'Сервер и CLIPS работают' : 'CLIPS инициализируется',
        system: 'Экспертная система Фармацевт-Консультант'
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Остановка сервера...');
    if (clipsProcess) {
        clipsProcess.kill();
    }
    process.exit(0);
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`API доступно по http://localhost:${PORT}/api`);
    console.log(`CLIPS инициализируется...`);
});