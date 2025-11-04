@echo off
title Delta Gruiului - Rezervari Clienti
color 0A
echo =====================================
echo     Delta Gruiului - Rezervari Clienti
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
echo Se deschide pagina de rezervari pentru clienti...
timeout /t 3 >nul
start "" "http://localhost:3000/rezerva.html"

exit
