@echo off
title Delta Gruiului - Sistem Rezervari
color 0A
echo =====================================
echo     Delta Gruiului - Sistem Rezervari
echo =====================================

REM mergem pe discul D:
D:

REM intram in folderul proiectului
cd "D:\Users\dragos ionescu\Desktop\site balta total\rezervari v2 lucru"

if not exist "server.js" (
    echo [!] Eroare: folderul nu a fost gasit!
    pause
    exit
)

echo.
echo Initializare baza de date...
node db.js

echo.
echo Pornire server rezervari...
node server.js

pause
