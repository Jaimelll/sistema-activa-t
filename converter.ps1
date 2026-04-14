$ErrorActionPreference = "Stop"
$jsonPath = "C:\Users\jduran\.gemini\antigravity\brain\f6102cb4-ddee-41b4-bd92-2d16d2fcc58f\.system_generated\steps\40\content.md"
$tsPath = "C:\trabajo\fondo\sistema-activa-t\src\components\dashboard\charts\peruMapData.ts"

$lines = Get-Content -Path $jsonPath -Raw
# Find the JSON object starting with {"title"
$jsonStr = ""
foreach ($line in $lines -split "`n") {
    if ($line.StartsWith("{`"title`"")) {
        $jsonStr = $line
        break
    }
}

$jsonObject = ConvertFrom-Json $jsonStr -Depth 10

$minLon = 1000
$maxLon = -1000
$minLat = 1000
$maxLat = -1000

foreach ($f in $jsonObject.features) {
    $geom = $f.geometry
    if ($geom.type -eq "Polygon") {
        foreach ($p in $geom.coordinates[0]) {
            if ($p[0] -lt $minLon) { $minLon = $p[0] }
            if ($p[0] -gt $maxLon) { $maxLon = $p[0] }
            if ($p[1] -lt $minLat) { $minLat = $p[1] }
            if ($p[1] -gt $maxLat) { $maxLat = $p[1] }
        }
    } else {
        foreach ($poly in $geom.coordinates) {
            foreach ($p in $poly[0]) {
                if ($p[0] -lt $minLon) { $minLon = $p[0] }
                if ($p[0] -gt $maxLon) { $maxLon = $p[0] }
                if ($p[1] -lt $minLat) { $minLat = $p[1] }
                if ($p[1] -gt $maxLat) { $maxLat = $p[1] }
            }
        }
    }
}

$vWidth = 600
$vHeight = 850
$padding = 15

$bbWidth = $maxLon - $minLon
$bbHeight = $maxLat - $minLat

$scaleX = ($vWidth - $padding*2) / $bbWidth
$scaleY = ($vHeight - $padding*2) / $bbHeight
$scale = if ($scaleX -lt $scaleY) { $scaleX } else { $scaleY }

$scaledWidth = $bbWidth * $scale
$scaledHeight = $bbHeight * $scale

$offX = ($vWidth - $scaledWidth) / 2
$offY = ($vHeight - $scaledHeight) / 2

$results = @()

foreach ($f in $jsonObject.features) {
    if (-not $f.geometry) { continue }
    $name = $f.properties.name
    $geom = $f.geometry
    
    $paths = @()
    $cxSum = 0.0
    $cySum = 0.0
    $ptCount = 0
    
    $coordsList = @()
    if ($geom.type -eq "Polygon") {
        $coordsList += ,$geom.coordinates[0]
    } else {
        foreach ($poly in $geom.coordinates) {
            $coordsList += ,$poly[0]
        }
    }
    
    foreach ($coords in $coordsList) {
        $pts = @()
        $i = 0
        foreach ($p in $coords) {
            $sx = $offX + ($p[0] - $minLon) * $scale
            $sy = $offY + ($p[1] - $minLat) * $scale # inversion not needed here typically for HC if pre-projected
            
            $sxFormatted = [math]::Round($sx, 1).ToString("0.0", [System.Globalization.CultureInfo]::InvariantCulture)
            $syFormatted = [math]::Round($sy, 1).ToString("0.0", [System.Globalization.CultureInfo]::InvariantCulture)
            
            if ($i -eq 0) {
                $pts += "M$sxFormatted $syFormatted"
            } else {
                $pts += "L$sxFormatted $syFormatted"
            }
            $cxSum += $sx
            $cySum += $sy
            $ptCount++
            $i++
        }
        $pts += "Z"
        $paths += $pts -join " "
    }
    
    $centroidX = 0
    $centroidY = 0
    if ($ptCount -gt 0) {
        $centroidX = [math]::Round($cxSum / $ptCount, 1)
        $centroidY = [math]::Round($cySum / $ptCount, 1)
    }
    
    # Process ID mapping properly
    $rawId = $name.ToLower().Replace("á","a").Replace("é","e").Replace("í","i").Replace("ó","o").Replace("ú","u").Replace("ñ","n").Trim()
    $id = $rawId
    if ($id -match "lima province" -or $id -match "callao") {
        $id = "callao"
        $name = "Callao"
    } elseif ($id -match "lima") {
        $id = "lima"
        $name = "Lima"
    }
    
    $resObj = @{
        id = $id
        name = $name
        path = $paths -join " "
        centroid = @($centroidX, $centroidY)
    }
    $results += $resObj
}

$jsonOutput = ConvertTo-Json $results -Depth 10 -Compress
$jsonOutputStr = $jsonOutput.Replace('","', '",`n  "').Replace('{"', '{`n  "').Replace('"}', '`n}')
$code = "export interface RegionMapData {`n  id: string;`n  name: string;`n  path: string;`n  centroid: [number, number];`n}`n`nexport const PERU_MAP_DATA: RegionMapData[] = $jsonOutputStr;`n"

Set-Content -Path $tsPath -Value $code -Encoding UTF8
Write-Output "Done mapping!"
