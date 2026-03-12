@echo off
title Sistema Laboratorio Clinico
cd /d "C:\Users\USUARIO\Desktop\ProyectoCLinica"

REM Iniciar PostgreSQL si existe
sc query postgresql-x64-18 2>nul | find "RUNNING" >nul || (
    sc query postgresql-x64-18 >nul 2>&1 && (
        echo Iniciando PostgreSQL...
        net start postgresql-x64-18
        timeout /t 3 /nobreak >nul
    )
)

echo Iniciando servidor en http://localhost:3000
npm run dev
