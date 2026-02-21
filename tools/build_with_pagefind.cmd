@echo off
setlocal

set "REPO_ROOT=%~dp0.."
pushd "%REPO_ROOT%" || exit /b 1

if not exist "tmp\hugo_cache" mkdir "tmp\hugo_cache" >nul 2>&1
if not exist "tmp\npm-cache" mkdir "tmp\npm-cache" >nul 2>&1

set "HUGO_CACHEDIR=%CD%\tmp\hugo_cache"

if /I "%~1"=="--minify" (
  if exist "tools\hugo\hugo.exe" (
    "tools\hugo\hugo.exe" --gc --minify
  ) else (
    hugo --gc --minify
  )
) else (
  if exist "tools\hugo\hugo.exe" (
    "tools\hugo\hugo.exe"
  ) else (
    hugo
  )
)
if errorlevel 1 goto :fail

call npx.cmd --cache "tmp\npm-cache" pagefind --site public
if errorlevel 1 goto :fail

popd
endlocal
exit /b 0

:fail
set "EXIT_CODE=%ERRORLEVEL%"
popd
endlocal
exit /b %EXIT_CODE%

