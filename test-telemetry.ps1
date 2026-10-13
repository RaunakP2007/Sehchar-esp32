$server = "http://localhost:3000/api/telemetry"

Write-Host "Sending normal vitals (Resting)..."
Invoke-RestMethod -Uri $server -Method Post -Body (@{ hr=72; spo2=98; accelX=0.1; accelY=0.9; accelZ=0.2 } | ConvertTo-Json) -ContentType "application/json"
Start-Sleep -Seconds 2

Write-Host "Triggering Tachycardia (HR > 120)..."
Invoke-RestMethod -Uri $server -Method Post -Body (@{ hr=135; spo2=97; accelX=0.2; accelY=0.8; accelZ=0.1 } | ConvertTo-Json) -ContentType "application/json"
Start-Sleep -Seconds 5

Write-Host "Triggering Fall (SVM > 2.5g)..."
Invoke-RestMethod -Uri $server -Method Post -Body (@{ hr=145; spo2=96; accelX=2.0; accelY=1.5; accelZ=1.0 } | ConvertTo-Json) -ContentType "application/json"
