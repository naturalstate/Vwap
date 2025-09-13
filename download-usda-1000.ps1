# Download 1000 USDA ingredients quickly
$ApiKey = "2cLZXDSL3ehedtnpergblw1PdCYB1xSBXBoJ9lQ7"
$AllIngredients = @()

Write-Host "🚀 Downloading 1000 USDA ingredients..." -ForegroundColor Green

# Get foods from multiple pages
for ($Page = 1; $Page -le 10; $Page++) {
    Write-Host "Fetching page $Page..." -ForegroundColor Yellow
    
    $Url = "https://api.nal.usda.gov/fdc/v1/foods/search?query=*&pageSize=100&pageNumber=$Page&api_key=$ApiKey"
    
    try {
        $Data = Invoke-RestMethod -Uri $Url
        
        foreach($food in $Data.foods) {
            $cleanName = $food.description.ToLower()
            $cleanName = $cleanName -replace '\([^)]*\)', ''
            $cleanName = $cleanName -replace '\s+', ' '
            $cleanName = $cleanName -replace '^\s+|\s+$', ''
            $cleanName = $cleanName -replace ',.*$', ''
            
            if($cleanName.Length -gt 2 -and $cleanName.Length -lt 50) {
                if($cleanName -notmatch '^\d+' -and $cleanName -notmatch 'upc|gtin|ndb') {
                    
                    # Determine if vegan
                    $isVegan = $true
                    if($cleanName -match "milk|cheese|egg|meat|chicken|beef|pork|fish|dairy|yogurt|cream|butter|bacon|ham|turkey|lamb") {
                        $isVegan = $false
                    }
                    
                    # Categorize
                    $category = "other"
                    if($cleanName -match "apple|orange|banana|berry|grape|fruit") { $category = "fruits" }
                    elseif($cleanName -match "carrot|broccoli|spinach|lettuce|tomato|potato|vegetable") { $category = "vegetables" }
                    elseif($cleanName -match "chicken|beef|pork|fish|meat") { $category = "meat" }
                    elseif($cleanName -match "milk|cheese|butter|dairy") { $category = "dairy" }
                    elseif($cleanName -match "rice|wheat|flour|bread|grain") { $category = "grains" }
                    
                    $ingredient = @{
                        name = $cleanName
                        vegan = $isVegan
                        category = $category
                        confidence = 0.8
                        source = "usda"
                    }
                    
                    $AllIngredients += $ingredient
                    
                    if($AllIngredients.Count -ge 1000) {
                        break
                    }
                }
            }
        }
        
        if($AllIngredients.Count -ge 1000) {
            break
        }
        
    } catch {
        Write-Host "Error fetching page $Page" -ForegroundColor Red
    }
    
    Start-Sleep -Milliseconds 300
}

# Remove duplicates and save
$UniqueIngredients = $AllIngredients | Sort-Object name -Unique | Select-Object -First 1000
$UniqueIngredients | ConvertTo-Json -Depth 3 | Out-File "usda_ingredients_1000.json" -Encoding UTF8

Write-Host "✅ Downloaded $($UniqueIngredients.Count) unique USDA ingredients!" -ForegroundColor Green
Write-Host "📁 Saved to: usda_ingredients_1000.json" -ForegroundColor Blue
