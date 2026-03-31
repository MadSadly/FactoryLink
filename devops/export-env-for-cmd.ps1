# CMD 배치에서 devops\.env 를 읽어 KEY=value 한 줄씩 출력합니다.
param(
  [string]$EnvFilePath = (Join-Path $PSScriptRoot ".env")
)
if (-not (Test-Path -LiteralPath $EnvFilePath)) {
  exit 0
}
Get-Content -LiteralPath $EnvFilePath -Encoding UTF8 | ForEach-Object {
  $line = $_.Trim()
  if ($line -eq "" -or $line.StartsWith("#")) { return }
  $eq = $line.IndexOf("=")
  if ($eq -lt 1) { return }
  $name = $line.Substring(0, $eq).Trim()
  $val = $line.Substring($eq + 1).Trim()
  if ($name) { Write-Output "$name=$val" }
}
