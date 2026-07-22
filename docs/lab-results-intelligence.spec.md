Make the “Recent Lab Results” card clickable and open a full “Lab Results Intelligence” page.

The current card looks like this:

Recent Lab Results
Lipid Panel - LDL
2026-06-01 • mmol/L
2.6 (< 3.0)

When the user clicks this Recent Lab Results card, it should open the full Lab Results Intelligence page that matches the provided reference mockup exactly.

Do not open a drawer.
Do not open a small modal.
Do not show a basic results page.
Do not create a different design.

The result should look and feel exactly like the Lab Results Intelligence page reference image:
- Same calm soft background
- Same large white rounded page shell
- Same header layout
- Same patient banner
- Same blue AI clinical decision support notice
- Same 3-column layout
- Same left “All Patient Tests” list
- Same center “Lipid Panel Results” detail area
- Same interactive trend graph
- Same result grid
- Same right “AI Lab Intelligence” panel
- Same bottom action bar
- Same colors, spacing, rounded corners, shadows, typography, badges, and card style

==================================================
CLICK BEHAVIOR
==================================================

Make the entire Recent Lab Results card clickable.

Clickable card:
- The whole card should be clickable, not only the text.
- Add hover state.
- Add keyboard focus state.
- Add pointer cursor.
- Add accessible label.

On hover:
- Slightly lift the card.
- Add soft teal/blue glow.
- Make it feel clickable but still calm.

On click:
Navigate to the Lab Results Intelligence page.

Suggested route:
dashboard/records/[id]/labs
or:
dashboard/records/[id]/lab-results
or:
dashboard/records/[id]/lab-results/lipid-panel-ldl

Use the route style that fits the existing project.

Example:
Clicking:
Recent Lab Results → Lipid Panel - LDL

opens:
http://localhost:3000/dashboard/records/patient-002/lab-results

or:
http://localhost:3000/dashboard/records/patient-002/labs?selected=lipid-panel-ldl

The selected result should automatically load:
Lipid Panel Results
LDL result: 2.6 mmol/L
Date: 2026-06-01
Normal range: < 3.0
Status: Normal / Improving

==================================================
PAGE NAME
==================================================

Page title:
Lab Results Intelligence

This page is a premium AI-supported lab results review page inside the healthcare EHR.

It should help the clinician understand:
- All tests the patient has ever done
- Test dates
- Test values
- Normal ranges
- Abnormal results
- Urgency
- Whether results are improving, worsening, stable, or normal
- Possible medication or condition influences
- Suggested next steps
- Patient-friendly explanation options

Important:
AI is clinical decision support only.
AI must not diagnose.
AI must not replace clinician judgment.
The clinician must review every AI insight.

==================================================
MATCH THE REFERENCE PAGE EXACTLY
==================================================

The new page should match the provided Lab Results Intelligence reference mockup as closely as possible.

Use the same structure:

Top Header
Patient Banner
AI Safety Notice
Three-Column Lab Workspace
Bottom Action Bar

Reference layout:

------------------------------------------------------------
← Back to Patient        Lab Results Intelligence       AI review ready     Updated just now
------------------------------------------------------------

[Patient Banner]
JENKINS, Sarah
DOB Oct 11, 1985   Age 39   Female   MRN 8839201   Phone (555) 219-8842
No Known Allergies   High Risk   Verified   Current Weight 82 kg
------------------------------------------------------------

[Blue Notice]
AI lab review is clinical decision support only. It highlights trends and urgency; clinician review is required.
------------------------------------------------------------

All Patient Tests        Lipid Panel Results                  AI Lab Intelligence
Search + filters         Current / lowest / highest cards      Overall status
Test history cards        Interactive trend graph              Trend
                         Result Grid                          Urgency
                                                              Watch item
                                                              Possible influence
                                                              Suggested next steps
------------------------------------------------------------

Bottom bar:
Last reviewed: just now • AI support is not a diagnosis
Export PDF | Message Patient | Add Follow-up
------------------------------------------------------------

==================================================
VISUAL STYLE
==================================================

Use the same visual style as the reference image.

Page background:
- Soft pale blue-gray / mint-gray background
- Calm healthcare feel
- Very subtle gradient
- No harsh white full-screen flat background

Main page shell:
- Large white rounded container
- Centered on the page
- Soft shadow
- Thin blue-gray border
- Large border radius
- Spacious padding
- Premium EHR look

Suggested styling:
- Background: #F3FAFB or #F6F9FB
- Main shell: #FFFFFF
- Border: #D8E5EF
- Shadow: soft, diffused
- Border radius: 28px to 34px
- Page width: around 92vw to 96vw
- Max width: around 1500px to 1600px

Primary color:
- Teal / healthcare teal

Use colors like:
- Teal: #008B7A
- Bright teal line: #10B8C8
- Soft blue info background: #EAF4FF
- Blue text: #1E63C6
- Green safe background: #E8FFF6
- Green text: #078B5D
- Amber warning background: #FFF4D4
- Amber text: #A85D00
- Red urgent background: #FFECEF
- Red text: #C6283D
- Purple review background: #F2EDFF
- Purple text: #6046B6
- Dark text: #121A2D
- Muted text: #5F6E83
- Soft border: #DDE7F0

Everything should feel:
- World-class
- Premium
- Calm
- Professional
- Clean
- Organized
- Beautiful
- Clinically safe
- Easy to scan
- Effortless to use

==================================================
HEADER
==================================================

Top header must match the reference.

Left:
← Back to Patient

Main title:
Lab Results Intelligence

Right:
AI review ready badge
Updated just now

Header design:
- Large bold title
- Back link in teal
- AI badge in soft green
- Updated timestamp in muted slate
- Thin divider line under header
- Spacious but not too tall

Example:
← Back to Patient     Lab Results Intelligence                         AI review ready     Updated just now

==================================================
PATIENT BANNER
==================================================

Add the same patient banner as the reference.

Patient banner content:
JENKINS, Sarah
DOB Oct 11, 1985
Age 39
Female
MRN 8839201
Phone (555) 219-8842

Badges:
No Known Allergies
High Risk
Verified
Current Weight 82 kg

Design:
- White or very light blue-gray card
- Rounded corners
- Thin border
- Soft spacing
- Patient name bold and large
- Demographics below name
- Badges aligned to the right
- Badge colors must match reference style:
  - No Known Allergies = soft green
  - High Risk = soft red
  - Verified = soft green
  - Current Weight 82 kg = soft blue

Do not duplicate MRN.
Do not make the banner too tall.
Do not make it look like a plain table.

==================================================
AI SAFETY NOTICE
==================================================

Add the same blue AI notice below the patient banner.

Text:
AI lab review is clinical decision support only. It highlights trends and urgency; clinician review is required.

Optional helper text:
Use this page to understand test history, result patterns, and possible next steps without replacing clinical judgment.

Design:
- Soft blue background
- Rounded corners
- Thin blue border
- Strong blue text
- Calm and professional
- Full width inside the page shell
- Same height and spacing as the reference

==================================================
MAIN THREE-COLUMN LAYOUT
==================================================

Use three columns exactly like the reference:

Left column:
All Patient Tests

Center column:
Lipid Panel Results

Right column:
AI Lab Intelligence

Spacing:
- Columns should be evenly spaced
- Left and right columns should be narrower
- Center column should be widest
- No horizontal scroll
- Cards should align at the top
- All panels should have same visual language

Suggested desktop widths:
- Left: 300px to 340px
- Center: 620px to 720px
- Right: 340px to 400px

On smaller screens:
- Stack vertically
- Keep same visual style
- Do not break layout

==================================================
LEFT COLUMN: ALL PATIENT TESTS
==================================================

Create a card titled:
All Patient Tests

This left panel should show all lab tests the patient has ever done.

Include search:
Placeholder:
Search tests, dates, results...

Include filters:
- All
- Abnormal
- Urgent
- Improving
- Worsening
- Normal

Filter design:
- Active “All” chip should be teal
- Inactive chips should be soft gray
- Chips should be rounded pills
- Same look as reference

Test cards:
Show these sample tests:

1. Lipid Panel
Date: Jun 01, 2026
Status: Normal
Summary: LDL improving

2. Hemoglobin A1c
Date: Jun 10, 2026
Status: Watch
Summary: 7.2% above target

3. CBC
Date: May 28, 2026
Status: Normal
Summary: Stable

4. Troponin I
Date: Apr 12, 2026
Status: Urgent
Summary: Critical flag

5. Kidney Function
Date: Mar 04, 2026
Status: Review
Summary: eGFR trend

Card design:
- Rounded cards
- Soft border
- Selected card has soft mint/teal background
- Selected card has teal accent
- Colored dot on the left
- Status badge on the right
- Easy to scan
- Same spacing as reference

Clicking a test in the left column updates the center and right panels.

Default selected test:
Lipid Panel

==================================================
CENTER COLUMN: LIPID PANEL RESULTS
==================================================

Create center card titled:
Lipid Panel Results

Show status badge:
Normal

Subtitle:
Collected Jun 01, 2026 • Blood • Reviewed by Dr. Patel

Top stat cards:
1. Current LDL
2.6 mmol/L
Normal

2. Lowest LDL
2.1 mmol/L
Mar 2026

3. Highest LDL
3.8 mmol/L
Sep 2025

Stat card design:
- Small rounded cards
- Light blue-gray background
- Thin border
- Big number
- Small colored badge
- Same spacing as reference

==================================================
INTERACTIVE TREND GRAPH
==================================================

Add a graph card titled:
Interactive trend graph

Subtitle:
Hover over any point to see the date, value, range, and AI status.

Graph data:
- Sep 2025: LDL 3.8 mmol/L
- Nov 2025: LDL 3.4 mmol/L
- Jan 2026: LDL 3.0 mmol/L
- Mar 2026: LDL 2.1 mmol/L
- Jun 2026: LDL 2.6 mmol/L

Graph design must match reference:
- Soft teal line
- White circular data points with teal border
- Light shaded normal range area
- Clean x-axis labels: Sep, Nov, Jan, Mar, Jun
- Rounded graph card
- Soft gray grid lines
- Professional EHR chart style

Hover tooltip:
When hovering over any point, show a dark tooltip like the reference.

Tooltip should show:
Jun 01, 2026
LDL: 2.6 mmol/L
Status: Normal

Also include range if possible:
Range: < 3.0

Tooltip design:
- Dark navy background
- White text
- Rounded corners
- Small pointer arrow
- Appears above the hovered point

==================================================
RESULT GRID
==================================================

Below the graph, add:
Result Grid

Grid columns:
- Test
- Result
- Range
- AI Status

Rows:
1. Total Cholesterol
Result: 4.4 mmol/L
Range: < 5.2
AI Status: Good

2. LDL
Result: 2.6 mmol/L
Range: < 3.0
AI Status: Improving

3. HDL
Result: 1.4 mmol/L
Range: > 1.0
AI Status: Good

4. Triglycerides
Result: 1.3 mmol/L
Range: < 1.7
AI Status: Normal

Design:
- Rounded table container
- Soft row dividers
- Clear headers
- Status badges
- Same calm table styling as the reference
- No cramped text

==================================================
RIGHT COLUMN: AI LAB INTELLIGENCE
==================================================

Create a right panel titled:
AI Lab Intelligence

Subtitle:
Clinician review required

This panel must match the reference style.

Sections:

1. Overall Status
Card background: soft green
Title: Overall status
Text:
No urgent lipid concern detected.
LDL is improving compared with Sep 2025.

2. Trend
Badge: Trend
Title:
Getting better
Text:
LDL dropped from 3.8 to 2.6 mmol/L.

3. Urgency
Badge: Urgency
Title:
Not urgent
Text:
Routine follow-up unless symptoms change.

4. Watch Item
Badge: Watch item
Title:
A1C needs review
Text:
A1C 7.2% may need diabetes follow-up.

5. Possible Influence
Badge: Possible influence
Title:
Medication / diet
Text:
Atorvastatin and lifestyle changes may explain improvement.

6. Suggested Next Steps
Show:
- Share patient-friendly explanation
- Compare with medications
- Schedule routine follow-up

Design:
- Cards stacked vertically
- Rounded corners
- Thin borders
- Soft colored badges
- Same layout and colors as the reference
- Calm but useful
- Not overwhelming

Important AI rule:
AI must not diagnose.
AI must not make final clinical decisions.
AI must say clinician review is required.

==================================================
BOTTOM ACTION BAR
==================================================

Add the same bottom action bar as the reference.

Left:
Last reviewed: just now • AI support is not a diagnosis

Right buttons:
- Export PDF
- Message Patient
- Add Follow-up

Button styling:
- Export PDF = outline / white
- Message Patient = outline / white
- Add Follow-up = primary teal

Bar design:
- White floating bar
- Rounded corners
- Thin border
- Soft shadow
- Fixed/sticky near bottom
- Does not cover important content
- Same style as reference

==================================================
AI BEHAVIOR
==================================================

AI should immediately review the selected test and classify it.

AI classification fields:
- Overall status
- Urgency
- Trend direction
- Worsening / improving / stable / normal
- Possible influences
- Suggested next steps
- Patient-friendly explanation

For Lipid Panel - LDL:
Status:
Normal

Urgency:
Not urgent

Trend:
Getting better / improving

Explanation:
LDL improved from 3.8 mmol/L to 2.6 mmol/L and is currently below the target threshold.

Possible influence:
Atorvastatin and lifestyle changes may explain improvement.

Suggested next step:
Routine follow-up and continue clinician-directed care plan.

AI must use careful language:
- “May”
- “Consider”
- “Clinician review required”
- “Not a diagnosis”
- “Review in clinical context”

AI must not say:
- “The patient definitely has...”
- “You must prescribe...”
- “This diagnosis is...”
- “No clinician review needed”

==================================================
CLICKED CARD DATA CONNECTION
==================================================

The Recent Lab Results card should pass/select this lab:

Test group:
Lipid Panel

Selected analyte:
LDL

Date:
2026-06-01

Value:
2.6

Unit:
mmol/L

Normal range:
< 3.0

Status:
Normal

When page opens:
- Left list highlights Lipid Panel
- Center title says Lipid Panel Results
- Current LDL card shows 2.6 mmol/L
- Graph tooltip can show Jun 01, 2026 / LDL 2.6 mmol/L / Status Normal
- AI panel says no urgent lipid concern detected
- Trend says getting better

==================================================
LOADING / EMPTY / ERROR STATES
==================================================

Add loading states:
- Loading lab results
- Running AI review
- Loading graph
- Loading patient context

Add empty states:
- No lab results found
- No trend data available
- No AI review available

Add error states:
- Could not load lab results
- Could not run AI review
- Could not load graph

Use calm error UI:
- Amber/red only when needed
- Clear retry button
- Keep page polished

==================================================
ACCESSIBILITY
==================================================

Make the page accessible.

Requirements:
- Card is keyboard clickable
- Recent Lab Results card has accessible label:
  Open lab results intelligence for Lipid Panel LDL
- Graph tooltip accessible
- Table readable by screen readers
- AI badges include text
- Buttons have clear labels
- Good contrast
- Do not rely only on color
- No horizontal scrolling
- Focus states are visible and polished

==================================================
RESPONSIVE DESIGN
==================================================

Desktop:
Three-column layout like the reference.

Tablet:
Left test list and right AI panel may stack below center.

Mobile:
Use vertical layout:
1. Patient banner
2. AI notice
3. Selected result summary
4. Graph
5. AI intelligence
6. All tests list
7. Result grid
8. Action buttons

No horizontal scrolling.

==================================================
FINAL RESULT
==================================================

After this change:

When I click the Recent Lab Results card, I should see the full Lab Results Intelligence page matching the provided reference design exactly.

The page should use the same:
- Colors
- Layout
- Header
- Patient banner
- AI notice
- Left test list
- Center results area
- Trend graph
- Result grid
- AI intelligence sidebar
- Bottom action bar
- Button styles
- Badges
- Spacing
- Rounded cards
- Shadows

The result should feel premium, calm, professional, organized, beautiful, and clinically safe.