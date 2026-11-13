<#
  AuraWear - Lightweight Static Server (Zero external dependencies)
  Runs on Windows PowerShell using System.Net.HttpListener
#>

param(
  [int]$Port = 5173
)

$HostName = "localhost"
$Url = "http://${HostName}:${Port}/"
$Folder = $PSScriptRoot

$MimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".ico"  = "image/x-icon"
}

$Listener = New-Object System.Net.HttpListener
$Listener.Prefixes.Add($Url)

try {
  $Listener.Start()
  Write-Host "==========================================================" -ForegroundColor Cyan
  Write-Host "✨ AuraWear is running at: $Url" -ForegroundColor Green
  Write-Host "Press Ctrl+C in this console to stop the server." -ForegroundColor Yellow
  Write-Host "==========================================================" -ForegroundColor Cyan

  Start-Process $Url

  while ($Listener.IsListening) {
    $Context = $Listener.GetContext()
    $Request = $Context.Request
    $Response = $Context.Response

    $LocalPath = $Request.Url.LocalPath
    if ($LocalPath -eq "/" -or [string]::IsNullOrWhiteSpace($LocalPath)) {
      $LocalPath = "/index.html"
    }

    $FilePath = Join-Path $Folder ($LocalPath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar))

    if (Test-Path $FilePath -PathType Leaf) {
      $Ext = [System.IO.Path]::GetExtension($FilePath).ToLower()
      $ContentType = if ($MimeTypes.ContainsKey($Ext)) { $MimeTypes[$Ext] } else { "application/octet-stream" }

      $Bytes = [System.IO.File]::ReadAllBytes($FilePath)
      $Response.ContentType = $ContentType
      $Response.ContentLength64 = $Bytes.Length
      $Response.StatusCode = 200
      $Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
    } else {
      $Response.StatusCode = 404
      $ErrMsg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $LocalPath")
      $Response.ContentType = "text/plain"
      $Response.ContentLength64 = $ErrMsg.Length
      $Response.OutputStream.Write($ErrMsg, 0, $ErrMsg.Length)
    }

    $Response.Close()
  }
}
catch {
  Write-Error $_
}
finally {
  $Listener.Stop()
  $Listener.Close()
}
