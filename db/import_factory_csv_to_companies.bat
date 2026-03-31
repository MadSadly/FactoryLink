@echo off
REM Delegates to db\scripts\ — see db\README.md
call "%~dp0scripts\import-csv-generic.bat" %*
