#!/bin/bash
# Скрипт для запуска backend сервера

if [ ! -d "venv" ]; then
    echo "Создание виртуального окружения..."
    python3 -m venv venv
fi

echo "Активация виртуального окружения..."
source venv/bin/activate

echo "Установка зависимостей..."
pip install -r requirements.txt

echo "Запуск сервера..."
python main.py

