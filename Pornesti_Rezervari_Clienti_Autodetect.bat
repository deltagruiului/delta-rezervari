@echo off
title Delta Gruiului - Rezervari Clienti (Auto Detect)
color 0A
echo =====================================
echo     Delta Gruiului - Rezervari Clienti
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
echo Verific daca serverul ruleaza deja...
for /f "tokens=5" %%a in ('netstat -ano ^| find ":3000" ^| find "LISTENING"') do (
    set PID=%%a
)

if defined PID (
    echo [✔] Serverul ruleaza deja (PID %PID%)
) else (
    echo [!] Serverul nu este pornit. Il pornesc acum...
    start "" cmd /k "node server.js"
    echo Asteapta 3 secunde pentru pornire...
    timeout /t 3 >nul
)

echo.
echo Se deschide pagina de rezervari pentru clienti...
start "" "http://localhost:3000/rezerva.html"

exit
