#!/bin/bash
# Скрипт для перезапуска сервера

echo "Останавливаем старый сервер..."
pkill -f "python.*main.py" || true
sleep 2

echo "Запускаем новый сервер..."
cd "$(dirname "$0")"
python3 main.py

