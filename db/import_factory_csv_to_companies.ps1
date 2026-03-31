# PowerShell: run CSV import (sets CSV_ENCODING for child cmd; avoids "set" alias issue)
param(
  [Parameter(Mandatory = $true)]
  [string] $CsvPath,
  [string] $Encoding = "cp949",
  [switch] $DryRun
)

$ErrorActionPreference = "Stop"
$bat = Join-Path $PSScriptRoot "import_factory_csv_to_companies.bat"

if (-not (Test-Path -LiteralPath $CsvPath)) {
  Write-Error "CSV not found: $CsvPath"
  exit 1
}

$env:CSV_ENCODING = $Encoding
$fullCsv = (Resolve-Path -LiteralPath $CsvPath).Path

if ($DryRun) {
  & cmd.exe /c "`"$bat`" `"$fullCsv`" --dry-run"
} else {
  & cmd.exe /c "`"$bat`" `"$fullCsv`""
}
exit $LASTEXITCODE
