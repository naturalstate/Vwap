# USDA FoodData Central API Integration Script
# Fetches ingredient data from official USDA nutrition database
# Author: Vegan Recipe Swap App

param(
    [string]$ApiKey = $env:USDA_API_KEY,
    [int]$MaxResults = 1000,
    [string]$OutputDir = ".",
    [string[]]$FoodCategories = @("Vegetables", "Fruits", "Dairy and Egg Products", "Spices and Herbs", "Legumes", "Nuts and Seeds", "Beverages"),
    [switch]$Verbose
)

# Ensure output directory exists
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# USDA API Configuration
$BaseURL = "https://api.nal.usda.gov/fdc/v1"
$Headers = @{
    "Content-Type" = "application/json"
}

# Function to make API requests with error handling
function Invoke-USDAApiRequest {
    param(
        [string]$Endpoint,
        [hashtable]$Body = @{},
        [string]$Method = "GET"
    )
    
    try {
        $Body["api_key"] = $ApiKey
        
        if ($Method -eq "GET") {
            $QueryString = ($Body.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"
            $Uri = "$BaseURL/$Endpoint" + "?" + $QueryString
            $Response = Invoke-RestMethod -Uri $Uri -Method $Method -Headers $Headers
        } else {
            $Uri = "$BaseURL/$Endpoint"
            $JsonBody = $Body | ConvertTo-Json -Depth 10
            $Response = Invoke-RestMethod -Uri $Uri -Method $Method -Headers $Headers -Body $JsonBody
        }
        
        if ($Verbose) {
            Write-Host "✅ API Request successful: $Uri" -ForegroundColor Green
        }
        
        return $Response
    }
    catch {
        Write-Error "❌ API Request failed: $($_.Exception.Message)"
        Write-Error "URI: $Uri"
        return $null
    }
}

# Function to search for foods by category and extract ingredients
function Get-USDAFoodsByCategory {
    param(
        [string]$Category,
        [int]$PageSize = 200,
        [int]$MaxPages = 5
    )
    
    Write-Host "🔍 Searching for foods in category: $Category" -ForegroundColor Cyan
    $AllFoods = @()
    
    for ($page = 1; $page -le $MaxPages; $page++) {
        Write-Host "  📄 Fetching page $page..." -ForegroundColor Yellow
        
        $SearchParams = @{
            "query" = $Category
            "dataType" = @("Foundation", "SR Legacy", "Survey (FNDDS)")
            "pageSize" = $PageSize
            "pageNumber" = $page
            "sortBy" = "dataType.keyword"
            "sortOrder" = "asc"
        }
        
        $Response = Invoke-USDAApiRequest -Endpoint "foods/search" -Body $SearchParams -Method "GET"
        
        if ($Response -and $Response.foods) {
            $AllFoods += $Response.foods
            Write-Host "    Found $($Response.foods.Count) foods (Total: $($Response.totalHits))" -ForegroundColor Gray
            
            # Break if we've reached the end or got fewer results than requested
            if ($Response.foods.Count -lt $PageSize) {
                break
            }
        } else {
            Write-Host "    No more results for $Category" -ForegroundColor Yellow
            break
        }
        
        # Rate limiting - be nice to the API
        Start-Sleep -Milliseconds 500
    }
    
    return $AllFoods
}

# Function to get detailed food information including ingredients
function Get-USDAFoodDetails {
    param(
        [array]$FoodIds
    )
    
    $ChunkSize = 20  # USDA API allows up to 20 IDs per request
    $DetailedFoods = @()
    
    for ($i = 0; $i -lt $FoodIds.Count; $i += $ChunkSize) {
        $Chunk = $FoodIds[$i..[Math]::Min($i + $ChunkSize - 1, $FoodIds.Count - 1)]
        
        Write-Host "  🔬 Fetching details for $($Chunk.Count) foods..." -ForegroundColor Yellow
        
        $RequestBody = @{
            "fdcIds" = $Chunk
            "format" = "full"
            "nutrients" = @()
        }
        
        $Response = Invoke-USDAApiRequest -Endpoint "foods" -Body $RequestBody -Method "POST"
        
        if ($Response) {
            $DetailedFoods += $Response
            Write-Host "    ✅ Retrieved $($Response.Count) detailed food records" -ForegroundColor Green
        }
        
        # Rate limiting
        Start-Sleep -Milliseconds 300
    }
    
    return $DetailedFoods
}

# Function to extract ingredients from food data
function Extract-IngredientsFromFood {
    param(
        [object]$Food
    )
    
    $Ingredients = @()
    
    # Extract from ingredients list if available
    if ($Food.ingredients) {
        $IngredientsText = $Food.ingredients -replace '\([^)]*\)', '' -replace '\[[^\]]*\]', ''
        $IngredientList = $IngredientsText -split '[,;]' | ForEach-Object {
            $_.Trim() -replace '^\d+\.?\s*', '' -replace '\s+', ' '
        } | Where-Object { $_ -and $_.Length -gt 2 }
        
        foreach ($ingredient in $IngredientList) {
            $CleanName = $ingredient.Trim().ToLower()
            if ($CleanName -and $CleanName.Length -gt 2 -and $CleanName -notmatch '^\d+$') {
                $Ingredients += @{
                    name = $CleanName
                    source_food = $Food.description
                    fdc_id = $Food.fdcId
                    data_type = $Food.dataType
                    brand_owner = $Food.brandOwner
                }
            }
        }
    }
    
    # Also use the food description itself as an ingredient if it's simple enough
    if ($Food.description -and $Food.description.Length -lt 50 -and $Food.description -notmatch ',') {
        $CleanName = $Food.description.ToLower() -replace '\([^)]*\)', '' -replace '\[[^\]]*\]', ''
        $CleanName = $CleanName.Trim() -replace '\s+', ' '
        
        if ($CleanName -and $CleanName.Length -gt 2) {
            $Ingredients += @{
                name = $CleanName
                source_food = $Food.description
                fdc_id = $Food.fdcId
                data_type = $Food.dataType
                brand_owner = $Food.brandOwner
                is_primary = $true
            }
        }
    }
    
    return $Ingredients
}

# Function to categorize and assess vegan status
function Get-VeganStatus {
    param(
        [string]$IngredientName,
        [string]$SourceFood = ""
    )
    
    # Known non-vegan ingredients
    $NonVeganKeywords = @(
        'milk', 'cheese', 'butter', 'cream', 'yogurt', 'whey', 'casein', 'lactose',
        'egg', 'gelatin', 'honey', 'beef', 'chicken', 'pork', 'fish', 'seafood',
        'meat', 'lard', 'tallow', 'bone', 'blood', 'organ', 'liver'
    )
    
    # Known vegan ingredients
    $VeganKeywords = @(
        'vegetable', 'fruit', 'grain', 'bean', 'pea', 'lentil', 'rice', 'wheat',
        'corn', 'oat', 'barley', 'quinoa', 'chia', 'flax', 'hemp', 'coconut',
        'almond', 'soy', 'tofu', 'tempeh', 'nutritional yeast', 'agave', 'maple',
        'herb', 'spice', 'salt', 'pepper', 'garlic', 'onion'
    )
    
    $LowerName = $IngredientName.ToLower()
    $LowerSource = $SourceFood.ToLower()
    
    # Check for non-vegan keywords
    foreach ($keyword in $NonVeganKeywords) {
        if ($LowerName -match $keyword -or $LowerSource -match $keyword) {
            return @{
                vegan = $false
                confidence = 0.9
                reason = "Contains non-vegan ingredient: $keyword"
            }
        }
    }
    
    # Check for vegan keywords
    foreach ($keyword in $VeganKeywords) {
        if ($LowerName -match $keyword -or $LowerSource -match $keyword) {
            return @{
                vegan = $true
                confidence = 0.8
                reason = "Likely vegan ingredient: $keyword"
            }
        }
    }
    
    # Unknown - default to cautious approach
    return @{
        vegan = $false
        confidence = 0.3
        reason = "Unknown ingredient - marked as non-vegan for safety"
    }
}

# Function to categorize ingredients
function Get-IngredientCategory {
    param(
        [string]$IngredientName,
        [string]$SourceFood = ""
    )
    
    $Categories = @{
        'vegetables' = @('vegetable', 'carrot', 'broccoli', 'spinach', 'kale', 'tomato', 'pepper', 'onion', 'garlic')
        'fruits' = @('fruit', 'apple', 'banana', 'orange', 'berry', 'grape', 'lemon', 'lime', 'peach')
        'grains' = @('wheat', 'rice', 'oat', 'barley', 'quinoa', 'corn', 'grain', 'flour', 'bread')
        'legumes' = @('bean', 'pea', 'lentil', 'chickpea', 'soy', 'tofu', 'tempeh', 'legume')
        'nuts_seeds' = @('nut', 'seed', 'almond', 'walnut', 'cashew', 'peanut', 'sunflower', 'chia', 'flax')
        'dairy' = @('milk', 'cheese', 'butter', 'cream', 'yogurt', 'dairy', 'whey', 'casein')
        'meat' = @('meat', 'beef', 'chicken', 'pork', 'fish', 'seafood', 'poultry')
        'spices' = @('spice', 'herb', 'salt', 'pepper', 'cumin', 'paprika', 'oregano', 'basil')
        'oils_fats' = @('oil', 'fat', 'coconut oil', 'olive oil', 'vegetable oil', 'margarine')
    }
    
    $LowerName = $IngredientName.ToLower()
    $LowerSource = $SourceFood.ToLower()
    
    foreach ($category in $Categories.Keys) {
        foreach ($keyword in $Categories[$category]) {
            if ($LowerName -match $keyword -or $LowerSource -match $keyword) {
                return $category
            }
        }
    }
    
    return 'other'
}

# Main execution
Write-Host "🌱 USDA FoodData Central API Integration" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

# Validate API key
if (-not $ApiKey) {
    Write-Error "❌ USDA API key is required. Set USDA_API_KEY environment variable or use -ApiKey parameter."
    Write-Host ""
    Write-Host "To get a free API key:" -ForegroundColor Yellow
    Write-Host "1. Visit https://fdc.nal.usda.gov/api-guide.html" -ForegroundColor Yellow
    Write-Host "2. Sign up for free API access" -ForegroundColor Yellow
    Write-Host "3. Set your API key: `$env:USDA_API_KEY = 'your-api-key'" -ForegroundColor Yellow
    exit 1
}

Write-Host "🔑 Using API Key: $($ApiKey.Substring(0, [Math]::Min(8, $ApiKey.Length)))..." -ForegroundColor Green
Write-Host "📂 Output Directory: $OutputDir" -ForegroundColor Blue
Write-Host "🎯 Max Results: $MaxResults" -ForegroundColor Blue
Write-Host ""

$AllIngredients = @()
$ProcessedFoods = 0

foreach ($Category in $FoodCategories) {
    Write-Host "🔄 Processing category: $Category" -ForegroundColor Magenta
    
    # Get foods for this category
    $Foods = Get-USDAFoodsByCategory -Category $Category
    
    if ($Foods) {
        Write-Host "  📋 Found $($Foods.Count) foods in $Category" -ForegroundColor Cyan
        
        # Get detailed information for a subset of foods
        $FoodIds = $Foods | Select-Object -First ([Math]::Min($Foods.Count, $MaxResults / $FoodCategories.Count)) | ForEach-Object { $_.fdcId }
        $DetailedFoods = Get-USDAFoodDetails -FoodIds $FoodIds
        
        # Extract ingredients from detailed foods
        foreach ($Food in $DetailedFoods) {
            $Ingredients = Extract-IngredientsFromFood -Food $Food
            
            foreach ($Ingredient in $Ingredients) {
                $VeganStatus = Get-VeganStatus -IngredientName $Ingredient.name -SourceFood $Ingredient.source_food
                $Category = Get-IngredientCategory -IngredientName $Ingredient.name -SourceFood $Ingredient.source_food
                
                $ProcessedIngredient = @{
                    name = $Ingredient.name
                    vegan = $VeganStatus.vegan
                    category = $Category
                    confidence = $VeganStatus.confidence
                    source = "usda"
                    usda_data = @{
                        fdc_id = $Ingredient.fdc_id
                        source_food = $Ingredient.source_food
                        data_type = $Ingredient.data_type
                        brand_owner = $Ingredient.brand_owner
                        is_primary = $Ingredient.is_primary -eq $true
                        vegan_reason = $VeganStatus.reason
                    }
                }
                
                $AllIngredients += $ProcessedIngredient
            }
            
            $ProcessedFoods++
        }
    }
    
    Write-Host "  ✅ Processed $ProcessedFoods foods so far" -ForegroundColor Green
    Write-Host ""
}

# Remove duplicates and sort
Write-Host "🔄 Deduplicating and sorting ingredients..." -ForegroundColor Yellow
$UniqueIngredients = $AllIngredients | Sort-Object name -Unique

# Output results
$OutputFile = Join-Path $OutputDir "usda_ingredients_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
$UniqueIngredients | ConvertTo-Json -Depth 10 | Out-File -FilePath $OutputFile -Encoding UTF8

Write-Host ""
Write-Host "✅ USDA Data Extraction Complete!" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green
Write-Host "📊 Total ingredients extracted: $($UniqueIngredients.Count)" -ForegroundColor Cyan
Write-Host "🌱 Vegan ingredients: $($($UniqueIngredients | Where-Object { $_.vegan -eq $true }).Count)" -ForegroundColor Green
Write-Host "❌ Non-vegan ingredients: $($($UniqueIngredients | Where-Object { $_.vegan -eq $false }).Count)" -ForegroundColor Red
Write-Host "📁 Output file: $OutputFile" -ForegroundColor Blue
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Review the generated JSON file" -ForegroundColor White
Write-Host "2. Run the seeding script to import into your database" -ForegroundColor White
Write-Host "3. Test the integration with your Recipe Swap app" -ForegroundColor White

# Display sample of results
if ($Verbose -and $UniqueIngredients.Count -gt 0) {
    Write-Host ""
    Write-Host "📋 Sample ingredients:" -ForegroundColor Magenta
    $UniqueIngredients | Select-Object -First 10 | ForEach-Object {
        $Status = if ($_.vegan) { "🌱" } else { "❌" }
        Write-Host "  $Status $($_.name) ($($_.category)) - Confidence: $($_.confidence)" -ForegroundColor Gray
    }
}
