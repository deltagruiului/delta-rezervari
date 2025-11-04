@echo off
title Delta Gruiului - Panou Admin
color 0B
echo =====================================
echo     Delta Gruiului - Panou Admin
echo =====================================

REM schimbam pe discul D
D:

REM intram in folderul proiectului
cd "D:\Users\dragos ionescu\Desktop\site balta total\rezervari v2 lucru"

if not exist "server.js" (
    echo [!] Eroare: folderul nu a fost gasit!
    pause
    exit
)

echo.
echo Pornire server rezervari...
start "" cmd /k "node server.js"

echo.
echo Se deschide panoul de administrare...
timeout /t 3 >nul
start "" "http://localhost:3000/admin"

exit
