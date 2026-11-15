@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 노벨상 키우기 - 로컬 수정판
python run-local.py
pause
