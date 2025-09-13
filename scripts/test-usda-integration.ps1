# USDA API Integration Test Script
# Tests the USDA API connection and data processing

param(
    [string]$ApiKey = $env:USDA_API_KEY,
    [switch]$Verbose
)

Write-Host "🧪 Testing USDA API Integration" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green

# Check if API key is set
if (-not $ApiKey) {
    Write-Error "❌ USDA API key not found!"
    Write-Host ""
    Write-Host "Please set your API key first:" -ForegroundColor Yellow
    Write-Host '  $env:USDA_API_KEY = "your-api-key-here"' -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To make it permanent:" -ForegroundColor Yellow
    Write-Host '  [System.Environment]::SetEnvironmentVariable("USDA_API_KEY", "your-api-key-here", [System.EnvironmentVariableTarget]::User)' -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ API Key found: $($ApiKey.Substring(0, [Math]::Min(8, $ApiKey.Length)))..." -ForegroundColor Green

# Test API connection with a simple search
Write-Host "`n🔍 Testing API connection..." -ForegroundColor Cyan

$TestUrl = "https://api.nal.usda.gov/fdc/v1/foods/search?query=apple`&pageSize=5`&api_key=$ApiKey"

try {
    $Response = Invoke-RestMethod -Uri $TestUrl -Method GET
    
    if ($Response -and $Response.foods) {
        Write-Host "✅ API connection successful!" -ForegroundColor Green
        Write-Host "  📊 Found $($Response.totalHits) total results for 'apple'" -ForegroundColor Gray
        Write-Host "  📄 Retrieved $($Response.foods.Count) sample foods" -ForegroundColor Gray
        
        # Show sample data
        Write-Host "`n📋 Sample foods found:" -ForegroundColor Magenta
        $Response.foods | Select-Object -First 3 | ForEach-Object {
            Write-Host "  • $($_.description) (FDC ID: $($_.fdcId))" -ForegroundColor White
        }
    } else {
        Write-Error "❌ API returned unexpected response format"
        exit 1
    }
} catch {
    Write-Error "❌ API connection failed: $($_.Exception.Message)"
    exit 1
}

# Test getting detailed food information
Write-Host "`n🔬 Testing detailed food data retrieval..." -ForegroundColor Cyan

$TestFoodId = $Response.foods[0].fdcId
$DetailUrl = "https://api.nal.usda.gov/fdc/v1/food/$TestFoodId" + "?api_key=$ApiKey"

try {
    $DetailResponse = Invoke-RestMethod -Uri $DetailUrl -Method GET
    
    if ($DetailResponse) {
        Write-Host "✅ Detailed food data retrieved!" -ForegroundColor Green
        Write-Host "  📝 Food: $($DetailResponse.description)" -ForegroundColor White
        Write-Host "  🏷️  Data Type: $($DetailResponse.dataType)" -ForegroundColor Gray
        
        if ($DetailResponse.ingredients) {
            Write-Host "  🧪 Ingredients: $($DetailResponse.ingredients.Length) chars" -ForegroundColor Gray
            if ($Verbose) {
                Write-Host "    Raw ingredients: $($DetailResponse.ingredients.Substring(0, [Math]::Min(100, $DetailResponse.ingredients.Length)))..." -ForegroundColor DarkGray
            }
        } else {
            Write-Host "  ⚠️  No ingredients data (this is normal for basic foods like apple)" -ForegroundColor Yellow
        }
        
        if ($DetailResponse.nutrients) {
            Write-Host "  🍎 Nutrients: $($DetailResponse.nutrients.Count) available" -ForegroundColor Gray
        }
    }
} catch {
    Write-Error "❌ Failed to get detailed food data: $($_.Exception.Message)"
}

# Test the PowerShell script with a small sample
Write-Host "`n🚀 Testing USDA data extraction script..." -ForegroundColor Cyan

try {
    # Run the USDA script with limited results for testing
    $ScriptPath = Join-Path $PSScriptRoot "fetch-usda-data.ps1"
    
    if (Test-Path $ScriptPath) {
        Write-Host "  📜 Running fetch-usda-data.ps1 with test parameters..." -ForegroundColor Yellow
        
        & $ScriptPath -ApiKey $ApiKey -MaxResults 50 -FoodCategories @("Fruits") -OutputDir "." -Verbose:$Verbose
        
        # Check if output file was created
        $OutputFiles = Get-ChildItem -Path "." -Name "usda_ingredients_*.json" | Sort-Object -Descending | Select-Object -First 1
        
        if ($OutputFiles) {
            Write-Host "`n✅ USDA data extraction test successful!" -ForegroundColor Green
            Write-Host "  📁 Output file: $OutputFiles" -ForegroundColor Blue
            
            # Check file contents
            $TestData = Get-Content $OutputFiles | ConvertFrom-Json
            Write-Host "  📊 Extracted ingredients: $($TestData.Count)" -ForegroundColor Cyan
            
            if ($TestData.Count -gt 0) {
                Write-Host "  🌱 Sample ingredients:" -ForegroundColor Magenta
                $TestData | Select-Object -First 3 | ForEach-Object {
                    $Status = if ($_.vegan) { "🌱" } else { "❌" }
                    Write-Host "    $Status $($_.name) ($($_.category)) - Confidence: $($_.confidence)" -ForegroundColor White
                }
            }
        } else {
            Write-Warning "⚠️  No output file generated - check the script execution"
        }
    } else {
        Write-Warning "⚠️  USDA fetch script not found at $ScriptPath"
    }
} catch {
    Write-Error "❌ Error testing USDA script: $($_.Exception.Message)"
}

# Test database seeding
Write-Host "`n🌱 Testing database seeding..." -ForegroundColor Cyan

try {
    $SeederPath = Join-Path $PSScriptRoot "seed-ingredients.js"
    
    if (Test-Path $SeederPath) {
        # Test with the curated USDA ingredients file
        $CuratedFile = "usda_ingredients.json"
        
        if (Test-Path $CuratedFile) {
            Write-Host "  📜 Testing with curated ingredients file..." -ForegroundColor Yellow
            
            node $SeederPath --source $CuratedFile --type curated --verbose
            
        } else {
            Write-Host "  ⚠️  Curated ingredients file not found, skipping seeder test" -ForegroundColor Yellow
            Write-Host "  💡 This is okay - you can test seeding later with USDA data" -ForegroundColor Gray
        }
    } else {
        Write-Warning "⚠️  Seeder script not found at $SeederPath"
    }
} catch {
    Write-Warning "⚠️  Database seeding test failed: $($_.Exception.Message)"
    Write-Host "  💡 This might be expected if database is not set up yet" -ForegroundColor Gray
}

Write-Host "`n🎉 USDA Integration Test Complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. 📥 Run full USDA data extraction: .\scripts\fetch-usda-data.ps1" -ForegroundColor White
Write-Host "2. 🌱 Seed ingredients into database: node .\scripts\seed-ingredients.js" -ForegroundColor White
Write-Host "3. 🔍 Test your backend API with the new ingredient data" -ForegroundColor White
Write-Host ""
Write-Host "Happy coding! 🚀" -ForegroundColor Cyan
