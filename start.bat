@echo off
chcp 65001 >nul
title Сервер трансляции
color 0A

echo ╔════════════════════════════════════════╗
echo ║   СЕРВЕР ТРАНСЛЯЦИИ                   ║
echo ╚════════════════════════════════════════╝
echo.

echo [1/2] Проверка зависимостей...
if not exist "node_modules\" (
    echo Установка...
    call npm install
)
echo.

echo [2/2] Запуск сервера...
node server.js

pause
