param([Parameter(Mandatory=$true)][int]$ApplicationProcessId,[int]$DurationMinutes=125)
$ErrorActionPreference='Stop'
$outputDirectory=Join-Path $PSScriptRoot '..\.local'
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$outputPath=Join-Path $outputDirectory ('process-' + $ApplicationProcessId + '.jsonl')
$started=(Get-Process -Id $ApplicationProcessId).StartTime
$deadline=(Get-Date).AddMinutes($DurationMinutes)
while((Get-Date) -lt $deadline){
  $rootProcess=Get-Process -Id $ApplicationProcessId -ErrorAction SilentlyContinue
  if(!$rootProcess -or $rootProcess.StartTime -ne $started){break}
  $processRows=Get-CimInstance Win32_Process
  $ids=[System.Collections.Generic.HashSet[int]]::new()
  [void]$ids.Add($ApplicationProcessId)
  do {
    $previousCount=$ids.Count
    foreach($row in $processRows){if($ids.Contains([int]$row.ParentProcessId)){[void]$ids.Add([int]$row.ProcessId)}}
  }while($ids.Count -gt $previousCount)
  $live=Get-Process -Id @($ids) -ErrorAction SilentlyContinue
  $entry=[ordered]@{timestamp=(Get-Date).ToUniversalTime().ToString('o');root=$ApplicationProcessId;processCount=$live.Count;workingSetBytes=($live|Measure-Object WorkingSet64 -Sum).Sum;privateBytes=($live|Measure-Object PrivateMemorySize64 -Sum).Sum;cpuSeconds=($live|Measure-Object CPU -Sum).Sum;processes=@($live|Select-Object Id,ProcessName,WorkingSet64,PrivateMemorySize64,CPU)}
  $entry|ConvertTo-Json -Depth 4 -Compress|Add-Content -LiteralPath $outputPath -Encoding utf8
  Start-Sleep -Seconds 60
}
