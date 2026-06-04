
# FHIR R4 Full Smoke Test - all 14 resource types
# Usage: powershell -File smoke_all.ps1
# Requires: FHIR server running at http://localhost:8081 with DB connected

$base = "http://localhost:8081/fhir/R4"
$pass = 0
$fail = 0
$results = @()

function Req($method, $url, $body = $null) {
    try {
        $params = @{ Uri = $url; Method = $method; UseBasicParsing = $true }
        if ($body) { $params.Body = $body; $params.ContentType = "application/fhir+json" }
        $r = Invoke-WebRequest @params
        return @{ Status = $r.StatusCode; Body = [System.Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray()) }
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        $msg  = $_.Exception.Message
        return @{ Status = $code; Body = $msg }
    }
}

function Check($label, $got, $want) {
    if ($got -eq $want) {
        $script:pass++
        return "PASS"
    } else {
        $script:fail++
        Write-Host "  FAIL $label : got=$got want=$want" -ForegroundColor Red
        return "FAIL"
    }
}

# --- Resource definitions ---────────────
$resources = @(
@{
  Type = "Patient"
  Create = '{"resourceType":"Patient","name":[{"family":"Smoketest","given":["Alice"]}],"gender":"female","birthDate":"1990-06-15","identifier":[{"system":"http://test","value":"SMOKE-Patient"}]}'
  Update = '{"resourceType":"Patient","name":[{"family":"Smoketest","given":["Alice"]}],"gender":"male","birthDate":"1990-06-15","identifier":[{"system":"http://test","value":"SMOKE-Patient"}]}'
  SearchParam = "family=smoketest"
},
@{
  Type = "Practitioner"
  Create = '{"resourceType":"Practitioner","name":[{"family":"Smoketest","given":["Bob"]}],"gender":"male","identifier":[{"system":"http://test","value":"SMOKE-Practitioner"}]}'
  Update = '{"resourceType":"Practitioner","name":[{"family":"Smoketest","given":["Bob"]}],"gender":"female","identifier":[{"system":"http://test","value":"SMOKE-Practitioner"}]}'
  SearchParam = "family=smoketest"
},
@{
  Type = "Organization"
  Create = '{"resourceType":"Organization","name":"Smoketest Hospital","active":true,"identifier":[{"system":"http://test","value":"SMOKE-Organization"}]}'
  Update = '{"resourceType":"Organization","name":"Smoketest Hospital","active":false,"identifier":[{"system":"http://test","value":"SMOKE-Organization"}]}'
  SearchParam = "name=smoketest+hospital"
},
@{
  Type = "Encounter"
  Create = '{"resourceType":"Encounter","status":"planned","class":{"system":"http://terminology.hl7.org/CodeSystem/v3-ActCode","code":"AMB"},"subject":{"reference":"Patient/smoke-patient"},"identifier":[{"system":"http://test","value":"SMOKE-Encounter"}]}'
  Update = '{"resourceType":"Encounter","status":"finished","class":{"system":"http://terminology.hl7.org/CodeSystem/v3-ActCode","code":"AMB"},"subject":{"reference":"Patient/smoke-patient"},"identifier":[{"system":"http://test","value":"SMOKE-Encounter"}]}'
  SearchParam = "status=finished"
},
@{
  Type = "Condition"
  Create = '{"resourceType":"Condition","code":{"coding":[{"system":"http://snomed.info/sct","code":"44054006","display":"Type 2 diabetes"}]},"subject":{"reference":"Patient/smoke-patient"},"clinicalStatus":{"coding":[{"system":"http://terminology.hl7.org/CodeSystem/condition-clinical","code":"active"}]},"identifier":[{"system":"http://test","value":"SMOKE-Condition"}]}'
  Update = '{"resourceType":"Condition","code":{"coding":[{"system":"http://snomed.info/sct","code":"44054006","display":"Type 2 diabetes"}]},"subject":{"reference":"Patient/smoke-patient"},"clinicalStatus":{"coding":[{"system":"http://terminology.hl7.org/CodeSystem/condition-clinical","code":"resolved"}]},"note":[{"text":"resolved"}],"identifier":[{"system":"http://test","value":"SMOKE-Condition"}]}'
  SearchParam = "code=44054006"
},
@{
  Type = "Observation"
  Create = '{"resourceType":"Observation","status":"preliminary","code":{"coding":[{"system":"http://loinc.org","code":"8302-2","display":"Body Height"}]},"subject":{"reference":"Patient/smoke-patient"},"valueQuantity":{"value":175,"unit":"cm"},"identifier":[{"system":"http://test","value":"SMOKE-Observation"}]}'
  Update = '{"resourceType":"Observation","status":"final","code":{"coding":[{"system":"http://loinc.org","code":"8302-2","display":"Body Height"}]},"subject":{"reference":"Patient/smoke-patient"},"valueQuantity":{"value":180,"unit":"cm"},"identifier":[{"system":"http://test","value":"SMOKE-Observation"}]}'
  SearchParam = "status=final"
},
@{
  Type = "MedicationRequest"
  Create = '{"resourceType":"MedicationRequest","status":"draft","intent":"order","medicationCodeableConcept":{"coding":[{"system":"http://www.nlm.nih.gov/research/umls/rxnorm","code":"1049502","display":"Metformin"}]},"subject":{"reference":"Patient/smoke-patient"},"identifier":[{"system":"http://test","value":"SMOKE-MedicationRequest"}]}'
  Update = '{"resourceType":"MedicationRequest","status":"active","intent":"order","medicationCodeableConcept":{"coding":[{"system":"http://www.nlm.nih.gov/research/umls/rxnorm","code":"1049502","display":"Metformin"}]},"subject":{"reference":"Patient/smoke-patient"},"identifier":[{"system":"http://test","value":"SMOKE-MedicationRequest"}]}'
  SearchParam = "status=active"
},
@{
  Type = "Procedure"
  Create = '{"resourceType":"Procedure","status":"completed","code":{"coding":[{"system":"http://snomed.info/sct","code":"73761001","display":"Colonoscopy"}]},"subject":{"reference":"Patient/smoke-patient"},"identifier":[{"system":"http://test","value":"SMOKE-Procedure"}]}'
  Update = '{"resourceType":"Procedure","status":"completed","code":{"coding":[{"system":"http://snomed.info/sct","code":"73761001","display":"Colonoscopy"}]},"subject":{"reference":"Patient/smoke-patient"},"note":[{"text":"updated"}],"identifier":[{"system":"http://test","value":"SMOKE-Procedure"}]}'
  SearchParam = "identifier=SMOKE-Procedure"
},
@{
  Type = "DiagnosticReport"
  Create = '{"resourceType":"DiagnosticReport","status":"preliminary","code":{"coding":[{"system":"http://loinc.org","code":"58410-2","display":"CBC panel"}]},"subject":{"reference":"Patient/smoke-patient"},"identifier":[{"system":"http://test","value":"SMOKE-DiagnosticReport"}]}'
  Update = '{"resourceType":"DiagnosticReport","status":"final","code":{"coding":[{"system":"http://loinc.org","code":"58410-2","display":"CBC panel"}]},"subject":{"reference":"Patient/smoke-patient"},"identifier":[{"system":"http://test","value":"SMOKE-DiagnosticReport"}]}'
  SearchParam = "identifier=SMOKE-DiagnosticReport"
},
@{
  Type = "AllergyIntolerance"
  Create = '{"resourceType":"AllergyIntolerance","clinicalStatus":{"coding":[{"system":"http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical","code":"active"}]},"code":{"coding":[{"system":"http://www.nlm.nih.gov/research/umls/rxnorm","code":"7980","display":"Penicillin"}]},"patient":{"reference":"Patient/smoke-patient"},"identifier":[{"system":"http://test","value":"SMOKE-AllergyIntolerance"}]}'
  Update = '{"resourceType":"AllergyIntolerance","clinicalStatus":{"coding":[{"system":"http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical","code":"resolved"}]},"code":{"coding":[{"system":"http://www.nlm.nih.gov/research/umls/rxnorm","code":"7980","display":"Penicillin"}]},"patient":{"reference":"Patient/smoke-patient"},"note":[{"text":"updated"}],"identifier":[{"system":"http://test","value":"SMOKE-AllergyIntolerance"}]}'
  SearchParam = "identifier=SMOKE-AllergyIntolerance"
},
@{
  Type = "CarePlan"
  Create = '{"resourceType":"CarePlan","status":"active","intent":"plan","title":"Smoke Test Plan","subject":{"reference":"Patient/smoke-patient"},"identifier":[{"system":"http://test","value":"SMOKE-CarePlan"}]}'
  Update = '{"resourceType":"CarePlan","status":"completed","intent":"plan","title":"Smoke Test Plan","subject":{"reference":"Patient/smoke-patient"},"identifier":[{"system":"http://test","value":"SMOKE-CarePlan"}]}'
  SearchParam = "identifier=SMOKE-CarePlan"
},
@{
  Type = "Consent"
  Create = '{"resourceType":"Consent","status":"active","scope":{"coding":[{"system":"http://terminology.hl7.org/CodeSystem/consentscope","code":"patient-privacy"}]},"category":[{"coding":[{"system":"http://loinc.org","code":"59284-0"}]}],"patient":{"reference":"Patient/smoke-patient"},"identifier":[{"system":"http://test","value":"SMOKE-Consent"}]}'
  Update = '{"resourceType":"Consent","status":"inactive","scope":{"coding":[{"system":"http://terminology.hl7.org/CodeSystem/consentscope","code":"patient-privacy"}]},"category":[{"coding":[{"system":"http://loinc.org","code":"59284-0"}]}],"patient":{"reference":"Patient/smoke-patient"},"identifier":[{"system":"http://test","value":"SMOKE-Consent"}]}'
  SearchParam = "identifier=SMOKE-Consent"
},
@{
  Type = "ServiceRequest"
  Create = '{"resourceType":"ServiceRequest","status":"active","intent":"order","code":{"coding":[{"system":"http://snomed.info/sct","code":"108252007","display":"Lab procedure"}]},"subject":{"reference":"Patient/smoke-patient"},"identifier":[{"system":"http://test","value":"SMOKE-ServiceRequest"}]}'
  Update = '{"resourceType":"ServiceRequest","status":"completed","intent":"order","code":{"coding":[{"system":"http://snomed.info/sct","code":"108252007","display":"Lab procedure"}]},"subject":{"reference":"Patient/smoke-patient"},"identifier":[{"system":"http://test","value":"SMOKE-ServiceRequest"}]}'
  SearchParam = "identifier=SMOKE-ServiceRequest"
},
@{
  Type = "Immunization"
  Create = '{"resourceType":"Immunization","status":"completed","vaccineCode":{"coding":[{"system":"http://hl7.org/fhir/sid/cvx","code":"208","display":"COVID-19 mRNA"}]},"patient":{"reference":"Patient/smoke-patient"},"occurrenceDateTime":"2024-01-15","identifier":[{"system":"http://test","value":"SMOKE-Immunization"}]}'
  Update = '{"resourceType":"Immunization","status":"not-done","vaccineCode":{"coding":[{"system":"http://hl7.org/fhir/sid/cvx","code":"208","display":"COVID-19 mRNA"}]},"patient":{"reference":"Patient/smoke-patient"},"occurrenceDateTime":"2024-01-15","note":[{"text":"updated"}],"identifier":[{"system":"http://test","value":"SMOKE-Immunization"}]}'
  SearchParam = "identifier=SMOKE-Immunization"
}
)

# --- Run tests ---
Write-Host ""
Write-Host "FHIR R4 Full Smoke Test - $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Cyan
Write-Host ("=" * 72) -ForegroundColor Cyan

foreach ($res in $resources) {
    $rt = $res.Type
    $row = [ordered]@{ Resource=$rt; CREATE=""; READ=""; UPDATE=""; SEARCH=""; HISTORY=""; DELETE=""; GONE="" }
    Write-Host "`n-- $rt" -ForegroundColor Yellow

    # 1. CREATE
    $cr = Req "POST" "$base/$rt" $res.Create
    $row.CREATE = Check "CREATE $rt" $cr.Status 201
    if ($cr.Status -ne 201) { $results += $row; continue }
    $p = $cr.Body | ConvertFrom-Json
    $id = $p.id
    $v  = $p.meta.versionId
    Write-Host "   CREATE 201  id=$id  v=$v"

    # 2. READ
    $rd = Req "GET" "$base/$rt/$id"
    $row.READ = Check "READ $rt" $rd.Status 200
    Write-Host "   READ   $($rd.Status)"

    # 3. UPDATE — inject id into the pre-built update body
    $updBody = $res.Update -replace '("resourceType":"' + $rt + '")', ('"resourceType":"' + $rt + '","id":"' + $id + '"')
    $ur = Req "PUT" "$base/$rt/$id" $updBody
    $row.UPDATE = Check "UPDATE $rt" $ur.Status 200
    if ($ur.Status -eq 200) {
        $up = $ur.Body | ConvertFrom-Json
        Write-Host "   UPDATE $($ur.Status)  v=$($up.meta.versionId)"
    } else {
        Write-Host "   UPDATE $($ur.Status)"
    }

    # 4. SEARCH
    $sr = Req "GET" "$base/${rt}?$($res.SearchParam)"
    $row.SEARCH = Check "SEARCH $rt" $sr.Status 200
    if ($sr.Status -eq 200) {
        $sb = $sr.Body | ConvertFrom-Json
        $found = $sb.total -ge 1
        if (-not $found) {
            $script:fail++
            $row.SEARCH = "FAIL(0)"
            Write-Host "   SEARCH $($sr.Status)  total=$($sb.total)  *** EXPECTED >=1 ***" -ForegroundColor Red
        } else {
            Write-Host "   SEARCH $($sr.Status)  total=$($sb.total)"
        }
    } else {
        Write-Host "   SEARCH $($sr.Status)"
    }

    # 5. HISTORY
    $hr = Req "GET" "$base/$rt/$id/_history"
    $row.HISTORY = Check "HISTORY $rt" $hr.Status 200
    if ($hr.Status -eq 200) {
        $hb = $hr.Body | ConvertFrom-Json
        Write-Host "   HISTORY $($hr.Status)  total=$($hb.total)"
    } else {
        Write-Host "   HISTORY $($hr.Status)"
    }

    # 6. DELETE
    $dr = Req "DELETE" "$base/$rt/$id"
    $row.DELETE = Check "DELETE $rt" $dr.Status 204
    Write-Host "   DELETE $($dr.Status)"

    # 7. GONE
    $gr = Req "GET" "$base/$rt/$id"
    $row.GONE = Check "GONE $rt" $gr.Status 410
    Write-Host "   GONE   $($gr.Status)"

    $results += $row
}

# --- Summary ---
Write-Host ""
Write-Host ("=" * 72) -ForegroundColor Cyan
Write-Host "RESULTS" -ForegroundColor Cyan
Write-Host ("=" * 72) -ForegroundColor Cyan
$fmt = "{0,-22} {1,-6} {2,-6} {3,-6} {4,-10} {5,-8} {6,-6} {7,-6}"
Write-Host ($fmt -f "Resource","CREATE","READ","UPDATE","SEARCH","HISTORY","DELETE","GONE")
Write-Host ("-" * 72)
foreach ($row in $results) {
    $line = $fmt -f $row.Resource,$row.CREATE,$row.READ,$row.UPDATE,$row.SEARCH,$row.HISTORY,$row.DELETE,$row.GONE
    $color = if ($line -match "FAIL") { "Red" } else { "Green" }
    Write-Host $line -ForegroundColor $color
}
Write-Host ("-" * 72)
$total = $pass + $fail
Write-Host "PASSED: $pass / $total" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
if ($fail -gt 0) { Write-Host "FAILED: $fail" -ForegroundColor Red }
