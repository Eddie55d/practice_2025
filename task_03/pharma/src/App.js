import React, { useState, useEffect } from 'react';

function App() {
    const [currentStep, setCurrentStep] = useState(1);
    const [patient, setPatient] = useState({
        name: '',
        age: '',
        gender: '',
        pregnancy: false
    });
    const [selectedSymptoms, setSelectedSymptoms] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [missingRecommendations, setMissingRecommendations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [symptomTypes, setSymptomTypes] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchSymptomTypes();
    }, []);

    const fetchSymptomTypes = async () => {
        try {
            console.log('Fetching symptom types...');
            const response = await fetch('http://localhost:5000/api/symptom-types');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Loaded symptom types:', data);
            setSymptomTypes(data);
        } catch (error) {
            console.error('Ошибка загрузки типов симптомов:', error);
            setError('Не удалось загрузить список симптомов');
            // Fallback data
            setSymptomTypes([
                { id: 'боль', name: 'Боль', description: 'Болевой синдром' },
                { id: 'температура', name: 'Температура', description: 'Повышенная температура' },
                { id: 'воспаление', name: 'Воспаление', description: 'Воспалительный процесс' },
                { id: 'аллергия', name: 'Аллергия', description: 'Аллергическая реакция' },
                { id: 'пищеварение', name: 'Пищеварение', description: 'Проблемы с пищеварением' }
            ]);
        }
    };

    const handlePatientSubmit = (e) => {
        e.preventDefault();
        if (patient.name && patient.age && patient.gender) {
            setCurrentStep(2);
        } else {
            alert('Пожалуйста, заполните все обязательные поля');
        }
    };

    const handleSymptomSelect = (symptomType) => {
        console.log('Selected symptom:', symptomType);
        const existingIndex = selectedSymptoms.findIndex(s => s.type === symptomType.id);
        
        if (existingIndex >= 0) {
            // Remove if already selected
            const updated = selectedSymptoms.filter(s => s.type !== symptomType.id);
            setSelectedSymptoms(updated);
        } else {
            // Add new symptom
            setSelectedSymptoms([...selectedSymptoms, {
                type: symptomType.id,
                name: symptomType.name,
                intensity: 5
            }]);
        }
    };

    const updateSymptomIntensity = (index, intensity) => {
        const updated = [...selectedSymptoms];
        updated[index].intensity = intensity;
        setSelectedSymptoms(updated);
    };

    const getSymptomIntensityLabel = (intensity) => {
        if (intensity <= 3) return 'Слабая';
        if (intensity <= 6) return 'Умеренная';
        if (intensity <= 8) return 'Сильная';
        return 'Очень сильная';
    };

    const getSymptomIcon = (symptomType) => {
        switch(symptomType) {
            case 'боль': return 'fa-head-side-virus';
            case 'температура': return 'fa-thermometer-full';
            case 'воспаление': return 'fa-band-aid';
            case 'аллергия': return 'fa-allergies';
            case 'пищеварение': return 'fa-stomach';
            default: return 'fa-stethoscope';
        }
    };

    const handleConsultation = async () => {
        if (selectedSymptoms.length === 0) {
            alert('Пожалуйста, выберите хотя бы один симптом');
            return;
        }

        setLoading(true);
        setError('');
        
        try {
            console.log('Sending consultation request...', { patient, symptoms: selectedSymptoms });
            
            const response = await fetch('http://localhost:5000/api/consultation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    patient: patient,
                    symptoms: selectedSymptoms
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Consultation result:', result);
            
            if (result.error) {
                setError('Ошибка при выполнении консультации: ' + result.error);
            } else {
                setRecommendations(result.recommendations || []);
                setMissingRecommendations(result.missingRecommendations || []);
                setCurrentStep(3);
            }
        } catch (error) {
            console.error('Consultation error:', error);
            
            // Более детальная обработка ошибок
            if (error.message.includes('Failed to fetch') || error.message.includes('Connection refused')) {
                setError('Не удалось подключиться к серверу. Убедитесь, что сервер запущен на порту 5000.');
            } else {
                setError('Ошибка соединения с сервером: ' + error.message);
            }
            
            // Показать демо-режим при недоступности сервера
            setTimeout(() => {
                const demoRecommendations = [
                    {
                        препарат: "Парацетамол",
                        форма: "таблетки",
                        дозировка: "500 мг 3-4 раза в день",
                        цена: 85.50,
                        приоритет: 8.5,
                        обоснование: "Рекомендован при повышенной температуре и умеренной боли",
                        беременностьСтатус: patient?.pregnancy ? "да" : "нет",
                        разрешеноБеременным: "разрешено"
                    },
                    {
                        препарат: "Ибупрофен", 
                        форма: "таблетки",
                        дозировка: "200-400 мг 3 раза в день",
                        цена: 120.00,
                        приоритет: 9.0,
                        обоснование: "Эффективен при воспалительных процессах и сильной боли",
                        беременностьСтатус: patient?.pregnancy ? "да" : "нет",
                        разрешеноБеременным: "запрещено-в-3-триместре"
                    }
                ];
                
                setRecommendations(demoRecommendations);
                setCurrentStep(3);
                setError('Сервер недоступен. Показаны демо-рекомендации.');
            }, 1000);
        } finally {
            setLoading(false);
        }
    };

    // Функция для новой консультации - сбрасывает всё и возвращает к началу
    const handleNewConsultation = () => {
        setCurrentStep(1);
        setPatient({ name: '', age: '', gender: '', pregnancy: false });
        setSelectedSymptoms([]);
        setRecommendations([]);
        setError('');
        
        // Можно добавить здесь вызов к серверу для (новый-пациент) если нужно
        console.log('🔄 Начата новая консультация');
    };

    // Функция для возврата к симптомам (без сброса данных)
    const handleBackToSymptoms = () => {
        setCurrentStep(2);
        setError('');
    };

    return (
      <div className="container-fluid bg-light bg-medical-pattern min-vh-100 d-flex flex-column p-0">
          {/* Header */}
          <header className="header-green py-3 mb-4" expand="lg">
              <div className="container">
                  <div className="row align-items-center">
                      <div className="col">
                          <h1 className="h3 mb-0">
                              <i className="fas fa-pills me-2"></i>
                              Фармацевт-Консультант
                          </h1>
                      </div>
                      <div className="col-auto">
                          <span className="badge bg-white text-success">Экспертная система</span>
                      </div>
                  </div>
              </div>
          </header>
  
          <div className="container-fluid">
              {/* Progress Steps - фиксированная высота */}
              <div className="row mb-4" style={{minHeight: '80px'}}>
                  <div className="col">
                      <div className="d-flex justify-content-center">
                          {[1, 2, 3].map(step => (
                              <div key={step} className="d-flex align-items-center">
                                  <div className={`rounded-circle ${currentStep >= step ? 'bg-success' : 'bg-secondary'} text-white d-flex align-items-center justify-content-center`} 
                                       style={{width: '40px', height: '40px'}}>
                                      {step}
                                  </div>
                                  {step < 3 && (
                                      <div className={`mx-2 ${currentStep > step ? 'bg-success' : 'bg-secondary'}`} 
                                           style={{width: '60px', height: '2px'}}></div>
                                  )}
                              </div>
                          ))}
                      </div>
                      <div className="d-flex justify-content-center mt-2">
                          <small className="text-muted mx-5">Данные пациента</small>
                          <small className="text-muted mx-5">Симптомы</small>
                          <small className="text-muted mx-5">Рекомендации</small>
                      </div>
                  </div>
              </div>

                {/* Error Display */}
                {error && (
                    <div className="alert alert-danger alert-dismissible fade show" role="alert">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        {error}
                        <button type="button" className="btn-close" onClick={() => setError('')}></button>
                    </div>
                )}

                {/* Step 1: Patient Information */}
                {currentStep === 1 && (
                    <div className="row justify-content-center">
                        <div className="col-md-8 col-lg-6">
                            <div className="card shadow">
                                <div className="card-header bg-white">
                                    <h4 className="card-title mb-0">
                                        <i className="fas fa-user me-2 text-primary"></i>
                                        Данные пациента
                                    </h4>
                                </div>
                                <div className="card-body">
                                    <form onSubmit={handlePatientSubmit}>
                                        <div className="mb-3">
                                            <label className="form-label">ФИО пациента *</label>
                                            <input 
                                                type="text" 
                                                className="form-control"
                                                value={patient.name}
                                                onChange={(e) => setPatient({...patient, name: e.target.value})}
                                                placeholder="Введите ФИО пациента"
                                                required
                                            />
                                        </div>
                                        
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Возраст *</label>
                                                    <input 
                                                        type="number" 
                                                        className="form-control"
                                                        min="0"
                                                        max="120"
                                                        value={patient.age}
                                                        onChange={(e) => setPatient({...patient, age: e.target.value})}
                                                        placeholder="Возраст"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Пол *</label>
                                                    <select 
                                                        className="form-select"
                                                        value={patient.gender}
                                                        onChange={(e) => setPatient({...patient, gender: e.target.value, pregnancy: false})}
                                                        required
                                                    >
                                                        <option value="">Выберите пол</option>
                                                        <option value="мужской">Мужской</option>
                                                        <option value="женский">Женский</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {patient.gender === 'женский' && (
                                            <div className="mb-3">
                                                <div className="form-check">
                                                    <input 
                                                        type="checkbox"
                                                        className="form-check-input"
                                                        id="pregnancy"
                                                        checked={patient.pregnancy}
                                                        onChange={(e) => setPatient({...patient, pregnancy: e.target.checked})}
                                                    />
                                                    <label className="form-check-label" htmlFor="pregnancy">
                                                        Беременность
                                                    </label>
                                                </div>
                                                <small className="text-muted">
                                                    Отметьте, если пациентка беременна (влияет на рекомендации препаратов)
                                                </small>
                                            </div>
                                        )}
                                        
                                        <div className="d-grid">
                                            <button type="submit" className="btn btn-primary btn-lg">
                                                Продолжить <i className="fas fa-arrow-right ms-2"></i>
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Symptoms Selection */}
                {currentStep === 2 && (
                    <div className="row">
                        <div className="col-12">
                            <div className="card shadow mb-4">
                                <div className="card-header bg-white">
                                    <h4 className="card-title mb-0">
                                        <i className="fas fa-stethoscope me-2 text-primary"></i>
                                        Выбор симптомов
                                    </h4>
                                </div>
                                <div className="card-body">
                                    <p className="text-muted mb-4">
                                        Выберите симптомы пациента и укажите их интенсивность (1-10 баллов)
                                    </p>
                                    
                                    {/* Информация о пациенте */}
                                    <div className="alert alert-info mb-4">
                                        <i className="fas fa-user me-2"></i>
                                        <strong>Пациент:</strong> {patient.name}, {patient.age} лет, {patient.gender}
                                        {patient.pregnancy && <span>, беременна</span>}
                                    </div>
                                    
                                    <div className="row g-3 mb-4">
                                        {symptomTypes.map(type => (
                                            <div key={type.id} className="col-md-6 col-lg-4">
                                                <div 
                                                    className={`card symptom-card ${selectedSymptoms.some(s => s.type === type.id) ? 'selected border-primary' : ''}`}
                                                    onClick={() => handleSymptomSelect(type)}
                                                    style={{ cursor: 'pointer', minHeight: '120px' }}
                                                >
                                                    <div className="card-body text-center d-flex flex-column justify-content-center">
                                                        <i className={`fas ${getSymptomIcon(type.id)} fa-2x mb-2 ${selectedSymptoms.some(s => s.type === type.id) ? 'text-primary' : 'text-secondary'}`}></i>
                                                        <h6 className="card-title mb-1">{type.name}</h6>
                                                        <small className="text-muted">{type.description}</small>
                                                        {selectedSymptoms.some(s => s.type === type.id) && (
                                                            <small className="text-success mt-1">
                                                                <i className="fas fa-check me-1"></i>Выбрано
                                                            </small>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {selectedSymptoms.length > 0 && (
                                        <div className="mb-4">
                                            <h5 className="mb-3">
                                                <i className="fas fa-list me-2 text-primary"></i>
                                                Выбранные симптомы ({selectedSymptoms.length}):
                                            </h5>
                                            {selectedSymptoms.map((symptom, index) => (
                                                <div key={index} className="card mb-3 border-primary">
                                                    <div className="card-body">
                                                        <div className="row align-items-center">
                                                            <div className="col-md-3">
                                                                <div className="d-flex align-items-center">
                                                                    <i className={`fas ${getSymptomIcon(symptom.type)} me-2 text-primary`}></i>
                                                                    <strong>{symptom.name}</strong>
                                                                </div>
                                                            </div>
                                                            <div className="col-md-7">
                                                                <label className="form-label">
                                                                    Интенсивность: <strong>{getSymptomIntensityLabel(symptom.intensity)} ({symptom.intensity}/10)</strong>
                                                                </label>
                                                                <input 
                                                                    type="range" 
                                                                    className="form-range"
                                                                    min="1"
                                                                    max="10"
                                                                    value={symptom.intensity}
                                                                    onChange={(e) => updateSymptomIntensity(index, parseInt(e.target.value))}
                                                                />
                                                                <div className="d-flex justify-content-between text-muted small">
                                                                    <span>Слабая (1)</span>
                                                                    <span>Сильная (10)</span>
                                                                </div>
                                                            </div>
                                                            <div className="col-md-2 text-end">
                                                                <button 
                                                                    type="button"
                                                                    className="btn btn-sm btn-outline-danger"
                                                                    onClick={() => handleSymptomSelect({id: symptom.type})}
                                                                    title="Удалить симптом"
                                                                >
                                                                    <i className="fas fa-times"></i>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {selectedSymptoms.length === 0 && (
                                        <div className="alert alert-warning text-center">
                                            <i className="fas fa-exclamation-triangle me-2"></i>
                                            Пожалуйста, выберите хотя бы один симптом из списка выше
                                        </div>
                                    )}

                                    <div className="d-flex justify-content-between">
                                        <button 
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => setCurrentStep(1)}
                                        >
                                            <i className="fas fa-arrow-left me-2"></i>Назад к данным
                                        </button>
                                        <button 
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={handleConsultation}
                                            disabled={loading || selectedSymptoms.length === 0}
                                        >
                                            {loading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                                    Анализ...
                                                </>
                                            ) : (
                                                <>
                                                    Получить рекомендации <i className="fas fa-pills ms-2"></i>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

 {/* Step 3: Recommendations */}
{currentStep === 3 && (
    <div className="row">
        <div className="col-12">
            <div className="card shadow">
                <div className="card-header bg-success text-white">
                    <h4 className="card-title mb-0">
                        <i className="fas fa-file-medical me-2"></i>
                        Рекомендации по лечению
                    </h4>
                </div>
                <div className="card-body">
                    <div className="alert alert-info">
                        <i className="fas fa-info-circle me-2"></i>
                        На основе анализа симптомов и данных пациента система подобрала следующие препараты
                    </div>

                    {/* Статистика */}
                    {recommendations.length > 0 && (
                        <div className="alert alert-success">
                            <i className="fas fa-check-circle me-2"></i>
                            Найдено <strong>{recommendations.length}</strong> препаратов из <strong>{recommendations.length + (missingRecommendations?.length || 0)}</strong> симптомов
                            {missingRecommendations?.length > 0 && (
                                <span>. Для <strong>{missingRecommendations.length}</strong> симптомов препараты не найдены.</span>
                            )}
                        </div>
                    )}

                    {recommendations.length === 0 && (!missingRecommendations || missingRecommendations.length === 0) ? (
                        <div className="alert alert-warning text-center">
                            <i className="fas fa-exclamation-triangle me-2"></i>
                            Не найдено подходящих препаратов для указанных симптомов и условий
                        </div>
                    ) : (
                        <div className="row g-4">
                            {/* Найденные препараты */}
                            {recommendations.map((rec, index) => (
                                <div key={`found-${index}`} className="col-12">
                                    <div className={`card recommendation-card ${rec.беременностьСтатус === 'да' && !rec.разрешеноБеременным.includes('разрешено') ? 'pregnancy-warning' : ''}`}>
                                        <div className="card-body">
                                            <div className="row">
                                                <div className="col-md-8">
                                                    <h5 className="card-title text-primary">
                                                        <i className="fas fa-pills me-2 text-success"></i>
                                                        {index + 1}. {rec.препарат}
                                                    </h5>
                                                    <div className="row mb-2">
                                                        <div className="col-sm-6">
                                                            <small className="text-muted">Форма выпуска:</small>
                                                            <br/>
                                                            <strong>{rec.форма}</strong>
                                                        </div>
                                                        <div className="col-sm-6">
                                                            <small className="text-muted">Приоритет рекомендации:</small>
                                                            <br/>
                                                            <span className="badge bg-primary">{rec.приоритет.toFixed(1)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="mb-2">
                                                        <small className="text-muted">Дозировка:</small>
                                                        <br/>
                                                        <strong>{rec.дозировка}</strong>
                                                    </div>
                                                    <div className="mb-2">
                                                        <small className="text-muted">Обоснование:</small>
                                                        <br/>
                                                        {rec.обоснование}
                                                    </div>
                                                </div>
                                                <div className="col-md-4 border-start">
                                                    <div className="text-center mb-3">
                                                        <h4 className="text-success">{rec.цена} руб.</h4>
                                                        <small className="text-muted">Примерная цена</small>
                                                    </div>
                                                    
                                                    {rec.беременностьСтатус === 'да' && (
                                                        <div className={`alert ${rec.разрешеноБеременным.includes('разрешено') ? 'alert-success' : 'alert-danger'} small`}>
                                                            <i className={`fas ${rec.разрешеноБеременным.includes('разрешено') ? 'fa-check' : 'fa-exclamation-triangle'} me-1`}></i>
                                                            {rec.разрешеноБеременным.includes('разрешено') 
                                                                ? 'Разрешён при беременности' 
                                                                : 'Противопоказан при беременности'}
                                                        </div>
                                                    )}
                                                    
                                                    <div className="d-grid">
                                                        <button className="btn btn-outline-primary btn-sm">
                                                            <i className="fas fa-info-circle me-1"></i>
                                                            Подробнее
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Случаи, когда препараты не найдены */}
                            {missingRecommendations?.map((miss, index) => (
                                <div key={`missing-${index}`} className="col-12">
                                    <div className="card border-warning">
                                        <div className="card-body">
                                            <div className="row">
                                                <div className="col-md-8">
                                                    <h5 className="card-title text-warning">
                                                        <i className="fas fa-exclamation-triangle me-2"></i>
                                                        {recommendations.length + index + 1}. Препарат не найден
                                                    </h5>
                                                    <div className="mb-2">
                                                        <small className="text-muted">Показание:</small>
                                                        <br/>
                                                        <strong>{miss.показание}</strong>
                                                    </div>
                                                    <div className="mb-2">
                                                        <small className="text-muted">Статус:</small>
                                                        <br/>
                                                        <span className="badge bg-warning text-dark">{miss.статус}</span>
                                                    </div>
                                                    <div className="mb-2">
                                                        <small className="text-muted">Причина:</small>
                                                        <br/>
                                                        {miss.причина}
                                                    </div>
                                                </div>
                                                <div className="col-md-4 border-start">
                                                    <div className="text-center mb-3">
                                                        <i className="fas fa-stethoscope fa-3x text-warning"></i>
                                                    </div>
                                                    <div className="alert alert-warning small">
                                                        <i className="fas fa-user-md me-1"></i>
                                                        Требуется консультация специалиста
                                                    </div>
                                                    <div className="d-grid">
                                                        <button className="btn btn-outline-warning btn-sm">
                                                            <i className="fas fa-search me-1"></i>
                                                            Найти врача
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Общая информация о консультации */}
                    <div className="mt-4 p-3 bg-light rounded">
                        <div className="row">
                            <div className="col-md-6">
                                <h6>
                                    <i className="fas fa-shield-alt me-2 text-warning"></i>
                                    Важная информация
                                </h6>
                                <small className="text-muted">
                                    Данные рекомендации носят информационный характер. Перед применением препаратов 
                                    обязательно проконсультируйтесь с врачом. Учитывайте индивидуальные особенности 
                                    и возможные противопоказания.
                                </small>
                            </div>
                            <div className="col-md-6">
                                <h6>
                                    <i className="fas fa-clipboard-check me-2 text-info"></i>
                                    Статус консультации
                                </h6>
                                <small className="text-muted">
                                    {recommendations.length > 0 ? (
                                        <>Система обработала все симптомы. Для некоторых найдены препараты, для других требуется дополнительная консультация.</>
                                    ) : missingRecommendations?.length > 0 ? (
                                        <>Для всех указанных симптомов требуется консультация врача. В базе данных нет подходящих препаратов.</>
                                    ) : (
                                        <>Не удалось найти рекомендации для указанных симптомов.</>
                                    )}
                                </small>
                            </div>
                        </div>
                    </div>

                    <div className="d-flex justify-content-between mt-4">
                        <button 
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={handleBackToSymptoms}
                        >
                            <i className="fas fa-arrow-left me-2"></i>Назад к симптомам
                        </button>
                        <button 
                            type="button"
                            className="btn btn-primary"
                            onClick={handleNewConsultation}
                        >
                            <i className="fas fa-user-plus me-2"></i>Новая консультация
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
)}
                
            </div>

            {/* Footer */}
            <footer className="bg-dark text-white py-4 mt-auto header-fullwidth"> 
                
                <div className="container-fluid">
                    <div className="row">
                        <div className="col-md-6">
                            <h6>Экспертная система "Фармацевт-Консультант"</h6>
                            <small>Разработана на основе CLIPS и технологий искусственного интеллекта</small>
                        </div>
                        <div className="col-md-6 text-end">
                            <small>© 2025 Медицинская экспертная система</small>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default App;