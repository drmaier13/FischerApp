param(
  [Parameter(Mandatory = $true)]
  [string]$Server,

  [Parameter(Mandatory = $true)]
  [string]$Username,

  [Parameter(Mandatory = $true)]
  [string]$PasswordFile,

  [Parameter(Mandatory = $true)]
  [string]$LocalRoot,

  [string]$RemoteRoot = "/"
)

$ErrorActionPreference = "Stop"

$resolvedLocalRoot = [System.IO.Path]::GetFullPath($LocalRoot)
if (-not (Test-Path -LiteralPath $resolvedLocalRoot -PathType Container)) {
  throw "Der lokale Veröffentlichungsordner wurde nicht gefunden."
}

$resolvedPasswordFile = [System.IO.Path]::GetFullPath($PasswordFile)
if (-not (Test-Path -LiteralPath $resolvedPasswordFile -PathType Leaf)) {
  throw "Die temporäre Zugangsdaten-Datei wurde nicht gefunden."
}

$password = [System.IO.File]::ReadAllText($resolvedPasswordFile).Trim()
$credential = [System.Net.NetworkCredential]::new($Username, $password)
$baseUri = "ftp://$Server"

function ConvertTo-FtpPath {
  param([string]$Path)

  $segments = $Path.Replace("\", "/").Trim("/").Split(
    "/",
    [System.StringSplitOptions]::RemoveEmptyEntries
  )

  if ($segments.Count -eq 0) {
    return "/"
  }

  $encodedSegments = foreach ($segment in $segments) {
    [System.Uri]::EscapeDataString($segment)
  }

  return "/" + ($encodedSegments -join "/")
}

function New-FtpRequest {
  param(
    [string]$RemotePath,
    [string]$Method
  )

  $uri = [System.Uri]::new($baseUri + (ConvertTo-FtpPath $RemotePath))
  $request = [System.Net.FtpWebRequest]::Create($uri)
  $request.Method = $Method
  $request.Credentials = $credential
  $request.UseBinary = $true
  $request.UsePassive = $true
  $request.KeepAlive = $false
  $request.EnableSsl = $false
  return $request
}

function Ensure-FtpDirectory {
  param([string]$RemoteDirectory)

  $normalized = $RemoteDirectory.Replace("\", "/").Trim("/")
  if ([string]::IsNullOrWhiteSpace($normalized)) {
    return
  }

  $current = ""
  foreach ($segment in $normalized.Split("/")) {
    $current = "$current/$segment"
    try {
      $request = New-FtpRequest -RemotePath $current -Method ([System.Net.WebRequestMethods+Ftp]::MakeDirectory)
      $response = $request.GetResponse()
      $response.Close()
    }
    catch [System.Net.WebException] {
      $response = $_.Exception.Response
      if ($null -eq $response) {
        throw
      }

      $statusCode = [int]$response.StatusCode
      $response.Close()
      if ($statusCode -ne 550) {
        throw
      }
    }
  }
}

$files = Get-ChildItem -LiteralPath $resolvedLocalRoot -Recurse -File
$uploaded = 0
$localRootPrefix = $resolvedLocalRoot.TrimEnd("\") + "\"

foreach ($file in $files) {
  if (-not $file.FullName.StartsWith($localRootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Eine Datei liegt außerhalb des Veröffentlichungsordners."
  }

  $relativePath = $file.FullName.Substring($localRootPrefix.Length).Replace("\", "/")
  $remotePath = ($RemoteRoot.TrimEnd("/") + "/" + $relativePath).Replace("//", "/")
  $remoteDirectory = [System.IO.Path]::GetDirectoryName($remotePath).Replace("\", "/")

  Ensure-FtpDirectory -RemoteDirectory $remoteDirectory

  $request = New-FtpRequest -RemotePath $remotePath -Method ([System.Net.WebRequestMethods+Ftp]::UploadFile)
  $request.ContentLength = $file.Length
  $requestStream = $request.GetRequestStream()
  $fileStream = [System.IO.File]::OpenRead($file.FullName)

  try {
    $fileStream.CopyTo($requestStream)
  }
  finally {
    $fileStream.Dispose()
    $requestStream.Dispose()
  }

  $response = $request.GetResponse()
  $response.Close()
  $uploaded++
}

[ordered]@{
  uploaded = $uploaded
  local_root = $resolvedLocalRoot
} | ConvertTo-Json -Compress
