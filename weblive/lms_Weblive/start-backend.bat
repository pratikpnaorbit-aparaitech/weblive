@echo off
cd /d "%~dp0backend"
call npm install
call npm test
call npm start
pause
