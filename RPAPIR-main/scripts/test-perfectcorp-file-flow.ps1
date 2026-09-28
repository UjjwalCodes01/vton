param(
  [string]$ClientTokenFile = "client-clothing-site.key",
  [string]$ProxyBase = "https://eqadsa6xp8.execute-api.us-east-1.amazonaws.com"
)

$ErrorActionPreference = "Stop"
$raw = Get-Content -LiteralPath $ClientTokenFile -Raw
$match = [regex]::Match($raw, "CLIENT_TOKEN=([A-Za-z0-9_-]+)")
if (-not $match.Success) { throw "Client token missing from local file" }
$headers = @{
  "x-client-id" = "clothing-site"
  "x-client-token" = $match.Groups[1].Value
  "content-type" = "application/json"
}
$samplePath = Join-Path (Get-Location) "build/test-person.jpeg"

try {
  Invoke-WebRequest -Uri "https://plugins-media.makeupar.com/strapi/assets/clothes_03_cccd5d4803.jpeg" -OutFile $samplePath -UseBasicParsing | Out-Null
  $bytes = [System.IO.File]::ReadAllBytes($samplePath)
  $registrationBody = @{
    files = @(@{
      content_type = "image/jpeg"
      file_name = "test-person.jpeg"
      file_size = $bytes.Length
    })
  } | ConvertTo-Json -Depth 4 -Compress
  try {
    $registration = Invoke-WebRequest -Uri "$ProxyBase/v1/file" -Method Post -Headers $headers -Body $registrationBody -UseBasicParsing
  } catch {
    $statusCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { "network error" }
    throw "File registration failed: $statusCode"
  }
  $body = $registration.Content | ConvertFrom-Json
  $file = $body.data.files[0]
  $upload = $file.requests[0]
  $sessionHeader = $registration.Headers["x-key-session"]
  $session = if ($sessionHeader -is [array]) { $sessionHeader[0] } else { [string]$sessionHeader }
  if (-not $file.file_id -or -not $upload.url -or -not $session) { throw "File registration response is incomplete" }
  Write-Output "File registration HTTP 200; session and file ID present."

  try {
    $uploaded = Invoke-WebRequest -Uri $upload.url -Method Put -Body $bytes -ContentType "image/jpeg" -UseBasicParsing
  } catch {
    $statusCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { "network error" }
    throw "Image upload failed: $statusCode"
  }
  Write-Output "Signed image upload HTTP $($uploaded.StatusCode)."

  $headers["x-key-session"] = $session
  $taskBody = @{
    src_file_id = $file.file_id
    ref_file_url = "https://plugins-media.makeupar.com/strapi/assets/clothes_reference_full_body_01_5a000d999f.png"
    garment_category = "full_body"
  } | ConvertTo-Json -Compress
  try {
    $created = Invoke-WebRequest -Uri "$ProxyBase/v1/request" -Method Post -Headers $headers -Body $taskBody -UseBasicParsing
  } catch {
    $statusCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { "network error" }
    throw "Task creation failed: $statusCode"
  }
  $taskId = ($created.Content | ConvertFrom-Json).data.task_id
  if (-not $taskId) { throw "Task ID is missing" }
  Write-Output "AI Clothes task creation HTTP 200."

  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 2
    try {
      $polled = Invoke-WebRequest -Uri "$ProxyBase/v1/request/$([uri]::EscapeDataString($taskId))" -Method Get -Headers $headers -UseBasicParsing
    } catch {
      $statusCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { "network error" }
      throw "Task polling failed: $statusCode"
    }
    $data = ($polled.Content | ConvertFrom-Json).data
    if ($data.task_status -eq "error") { throw "Provider task ended in error" }
    if ($data.task_status -eq "success") {
      if (-not $data.results.url) { throw "Result URL is missing" }
      $resultPath = Join-Path (Get-Location) "build/tryon-result.jpg"
      try {
        Invoke-WebRequest -Uri $data.results.url -OutFile $resultPath -UseBasicParsing | Out-Null
      } catch {
        throw "Task succeeded, but the result image could not be downloaded"
      }
      if ((Get-Item -LiteralPath $resultPath).Length -eq 0) { throw "Downloaded result image is empty" }
      Write-Output "Task poll HTTP 200; task_status=success; result saved to $resultPath"
      exit 0
    }
  }
  throw "Task did not finish within 80 seconds"
} finally {
  if (Test-Path -LiteralPath $samplePath) { Remove-Item -LiteralPath $samplePath }
}
