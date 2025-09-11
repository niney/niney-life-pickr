@echo off
REM Activate Python virtual environment for Smart Server

echo Activating Smart Server virtual environment...
call .venv\Scripts\activate.bat

echo.
echo Virtual environment activated!
echo Python: %VIRTUAL_ENV%\Scripts\python.exe
echo.
echo Available commands:
echo   python scripts/dev.py    - Start development server
echo   python scripts/start.py  - Start production server
echo   pytest                   - Run tests
echo   black src tests          - Format code
echo   ruff check src tests     - Lint code
echo   mypy src                 - Type checking
echo.