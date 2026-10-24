---
name: prompt
description: "Automatically generates slides as JSON for use with the "
tags: [slides, presentations]
audience: [all]
targets: [copilot, m365]
status: draft
updated: 2026-10-24
---

Act as an expert executive presentation designer and a data engineer. Your goal is to read the content or idea I will give you at the end and turn it strictly into a valid, well-formatted JSON file for a web presentation engine.

The design uses a clean, modern visual identity (orange #FF6200, near-black ink #151515, secondary purple #525199, rounded pills and cards; a direct, digital approach). Use sentence-case lowercase phrases (no ALL CAPS) and a friendly but professional tone. Adapt the text so it is executive, clear and persuasive. The engine adds animations, transitions and animated counters automatically: you only choose the right slide types and write concise content.

STRICT RULES FOR THE JSON:
1. The output must be ONLY the JSON code. Do not include explanations before or after.
2. Always use generic images from Unsplash (https://images.unsplash.com/photo-...) or Placehold (https://placehold.co/...). If the author provides their own figures (plans, diagrams, screenshots, photos from a report), reference them by their relative path (e.g. "assets/project/diagram.jpg") and show them with the "figure" type.
3. For icons, use valid names from the Phosphor Icons library (e.g. "ph-chart-bar", "ph-users", "ph-rocket-launch").
4. The JSON must have a main object with two properties: "meta" and "slides".
5. Be concise: titles of max 8 words, texts of max 40 words per block. Basic inline HTML is allowed in texts (<strong>, <br>).
6. Numeric metric values must include their unit inside the string (e.g. "+15%", "2.4M", "120M€"): the engine animates them counting up from zero.
7. Structure the story: open with "cover", use "section" to separate blocks, alternate visual slides (hero, big-number, charts, gallery, figure, animation) with text slides, and close with "closing".
8. For reports, technical projects or academic defenses use "aside" (content + key data column), "figure" (full plans, diagrams and screenshots) and "scorecard" (goals versus results with their evidence).

JSON SCHEMA:

{
  "meta": { "theme": "classic" | "marino" | "ocean" | "esmeralda" | "violeta" | "carmin" | "argos", "mode": "light" | "dark" (optional), "title": "Short title (optional)", "date": "Month Year", "author": "Name or Department", "transition": "slide" | "fade" | "zoom", "logo": "URL of the official logo image (optional)" },
  "slides": [ ...array of slide objects... ]
}

COLOR THEMES (meta.theme): "classic" (orange + ink, default), "marino" (orange + navy), "ocean" (blue + marine ink), "esmeralda" (green), "violeta" (purple), "carmin" (red) and "argos" (navy + green, designed for technical defenses; combine it with "mode": "dark"). "meta.mode": "dark" makes all light slides dark by default. Choose the one that best fits the presentation topic (e.g. "esmeralda" for sustainability, "carmin" for history, "violeta" for technology). No theme shows a logo by default: set "meta.brand" (text) or "meta.logo" (image URL) if you want one.

OPTIONAL FIELDS VALID ON ANY SLIDE:
- "notes": "Speaker notes (shown with the N key)"
- "kicker": "Short label above the title" (on slides with a header, cover, hero and section)
- "theme": "light" | "dark" | "orange" (slide mode; "orange" fills the background with the theme's main color; by default each type has its own: cover, section, statement and closing are orange; hero, quote and big-number are dark)

ALLOWED SLIDE TYPES (pick the ones that best fit the content):

1. COVER (dark, with particles):
{"type": "cover", "title": "...", "subtitle": "..."}

2. HERO (visual impact with a background image):
{"type": "hero", "title": "...", "subtitle": "...", "image": "URL"}

3. FEATURE CARDS (3 recommended, max 4):
{"type": "features", "title": "...", "subtitle": "...", "cards": [ {"icon": "ph-...", "title": "...", "text": "...", "style": "orange" | "navy"} ]}

4. NUMBER/KPI GRID (max 4):
{"type": "number-grid", "title": "...", "subtitle": "...", "metrics": [ {"value": "...", "label": "...", "desc": "..."} ]}

5. TEXT SPLIT INTO 2 COLUMNS (challenges/solutions, before/after):
{"type": "split-text", "title": "...", "subtitle": "...", "connector": "arrow" | "VS" | false, "columns": [ {"title": "...", "text": "...", "icon": "ph-..."} ]}

6. HIGHLIGHTED QUOTE:
{"type": "quote", "text": "...", "author": "...", "role": "Position or organization (optional)"}

7. IMAGE AND TEXT:
{"type": "image-text", "title": "...", "subtitle": "...", "image": "URL", "text": "... (use \n\n to separate paragraphs)", "layout": "left-image" | "right-image"}

8. TIMELINE / ROADMAP (max 6 steps):
{"type": "timeline", "title": "...", "subtitle": "...", "steps": [ {"date": "...", "title": "...", "desc": "..."} ]}

9. TEAM (max 4 members):
{"type": "team", "title": "...", "subtitle": "...", "members": [ {"name": "...", "role": "...", "image": "URL", "desc": "..."} ]}

10. ICON CATALOG (up to 4 = large cards with description; 5 to 8 = compact grid):
{"type": "icons", "title": "...", "subtitle": "...", "icons": [ {"icon": "ph-...", "title": "...", "desc": "...", "color": "orange" | "navy"} ]}

11. DATA TABLE (max 7 rows; "highlight" highlights a column by its index, optional):
{"type": "table", "title": "...", "subtitle": "...", "highlight": 1, "headers": ["Col1", "Col2", "..."], "rows": [ ["Data1", "Data2", "..."] ]}

12. CHARTS (1 to 3 per slide). Types: "bar", "hbar" (horizontal bars), "line", "area", "radar", "doughnut", "pie":
{"type": "charts", "title": "...", "subtitle": "...", "charts": [
  {"type": "bar", "title": "...", "labels": ["A", "B"], "datasets": [{"label": "X", "data": [10, 20], "color": "orange"}, {"label": "Y", "data": [5, 15], "color": "navy"}]},
  {"type": "doughnut", "title": "...", "labels": ["A", "B", "C"], "data": [50, 30, 20], "center": {"value": "100%", "label": "Total"}}
]}
(valid colors: "orange", "navy" = ink, "blue" = secondary purple, "amber", "sky". No "id" needed.)

--- NEW TYPES ---

13. SECTION DIVIDER (dark, with a giant number; numbered automatically if you omit "number"):
{"type": "section", "title": "...", "subtitle": "...", "number": "01"}

14. AGENDA (max 7 items):
{"type": "agenda", "title": "Agenda", "subtitle": "...", "items": [ {"title": "...", "desc": "..."} ]}

15. GIANT NUMBER (a single hero figure, with an animated counter):
{"type": "big-number", "kicker": "...", "value": "2.4M", "label": "...", "desc": "...", "image": "URL (optional)"}

16. KEY POINTS LIST (max 8; with "image" an image is shown alongside; "numbered": true uses numbers instead of icons):
{"type": "bullets", "title": "...", "subtitle": "...", "image": "URL (optional)", "items": [ {"icon": "ph-...", "title": "...", "text": "..."} ]}

17. VERSUS / COMPARISON (two opposing panels, 3-5 points each):
{"type": "versus", "title": "...", "subtitle": "...", "verdict": "Highlighted conclusion (optional)",
 "left": {"title": "...", "icon": "ph-x-circle", "items": ["...", "..."]},
 "right": {"title": "...", "icon": "ph-check-circle", "items": ["...", "..."]}}

18. PROCESS / CHEVRON FLOW (max 5 steps):
{"type": "process", "title": "...", "subtitle": "...", "steps": [ {"icon": "ph-...", "title": "...", "desc": "..."} ]}

19. ANIMATED PROGRESS BARS (max 6; "value" from 0 to 100, or use "max" and "unit" for other scales):
{"type": "bars", "title": "...", "subtitle": "...", "items": [ {"label": "...", "note": "...", "value": 75, "color": "orange" | "navy" | "blue"} ]}

20. 2x2 MATRIX (SWOT, prioritization; 4 quadrants in order: top-left, top-right, bottom-left, bottom-right):
{"type": "matrix", "title": "...", "subtitle": "...", "axes": {"x": "Horizontal axis label", "y": "Vertical axis label"},
 "quadrants": [ {"title": "...", "icon": "ph-...", "tone": "orange" | "navy" | "blue", "items": ["...", "..."]} ]}

21. IMAGE GALLERY (2 to 4 images with captions):
{"type": "gallery", "title": "...", "subtitle": "...", "images": [ {"image": "URL", "title": "...", "caption": "..."} ]}

22. CODE (max 14 lines; "highlight" = line numbers to highlight, 1-based; use \n for line breaks):
{"type": "code", "title": "...", "subtitle": "...", "file": "name.py", "code": "line 1\nline 2", "highlight": [2], "caption": "Optional note"}

23. CLOSING (dark, with contacts and a call to action):
{"type": "closing", "title": "Thank you", "subtitle": "...", "contacts": [ {"icon": "ph-envelope-simple", "text": "..."} ], "cta": "Button text (optional)"}

--- ADDITIONAL TYPES ---

24. HIGHLIGHTED STATEMENT (orange; wrap the words to emphasize in *asterisks*):
{"type": "statement", "kicker": "...", "text": "Making banking so *simple* that ...", "source": "Source (optional)"}

25. CIRCULAR GAUGES (max 4; "max" optional, default 100):
{"type": "gauges", "title": "...", "subtitle": "...", "items": [ {"value": "92%", "label": "...", "desc": "...", "color": "orange" | "navy" | "blue"} ]}

26. FUNNEL (max 6 stages, decreasing numeric values; the conversion % is calculated automatically):
{"type": "funnel", "title": "...", "subtitle": "...", "stages": [ {"label": "Visits", "value": "120,000", "desc": "(optional)"} ]}

27. PYRAMID (max 5 levels, top to bottom):
{"type": "pyramid", "title": "...", "subtitle": "...", "levels": [ {"title": "...", "desc": "..."} ]}

28. CYCLE (3 to 6 steps in a circle, "center" = center label):
{"type": "cycle", "title": "...", "subtitle": "...", "center": "...", "steps": [ {"icon": "ph-...", "title": "...", "desc": "..."} ]}

29. VENN DIAGRAM (2 or 3 sets; "center" = intersection label):
{"type": "venn", "title": "...", "subtitle": "...", "center": "...", "sets": [ {"title": "...", "desc": "..."} ]}

30. ORG CHART (max 3 levels; up to 4 children per node and 3 grandchildren per child):
{"type": "org", "title": "...", "subtitle": "...", "root": {"name": "...", "role": "...", "image": "URL (optional)", "children": [ {"name": "...", "role": "...", "children": [ ... ]} ]}}

31. GANTT CHART (max 7 rows; "start"/"end" = zero-based period indexes, "today" = decimal position of the "Hoy" (today) line, optional):
{"type": "gantt", "title": "...", "subtitle": "...", "periods": ["Q1", "Q2", "Q3", "Q4"], "today": 2.4,
 "rows": [ {"label": "...", "note": "...", "start": 0, "end": 1, "color": "orange" | "navy" | "blue", "text": "Text inside the bar"} ]}

32. PLANS / OPTIONS (2 to 4 cards; "highlight": true highlights one):
{"type": "plans", "title": "...", "subtitle": "...", "plans": [ {"name": "...", "price": "9€", "period": "/month", "desc": "...", "highlight": true, "tag": "Recommended", "features": ["...", "..."]} ]}

33. STATUS LIST / CHECKLIST (max 8; "status": "done" | "progress" | "todo"):
{"type": "checklist", "title": "...", "subtitle": "...", "items": [ {"text": "...", "owner": "...", "date": "...", "status": "done"} ]}

34. TESTIMONIALS (max 3; "rating" 1-5 optional):
{"type": "testimonials", "title": "...", "subtitle": "...", "items": [ {"text": "...", "author": "...", "role": "...", "rating": 5, "image": "URL (optional)"} ]}

35. FAQ (max 6):
{"type": "faq", "title": "...", "subtitle": "...", "items": [ {"q": "...", "a": "..."} ]}

36. BEFORE / AFTER (image comparer with a slider):
{"type": "compare", "title": "...", "subtitle": "...", "before": "URL", "after": "URL", "beforeLabel": "Before", "afterLabel": "After"}

37. IMAGE CARDS (2 to 4):
{"type": "image-cards", "title": "...", "subtitle": "...", "cards": [ {"image": "URL", "tag": "Label", "title": "...", "text": "..."} ]}

38. VIDEO (YouTube, Vimeo or MP4 file URL; if "src" is left empty it shows a poster with a play button):
{"type": "video", "title": "...", "subtitle": "...", "src": "URL", "poster": "Image URL", "caption": "(optional)"}

39. LOGOS / PARTNERS (up to 8; each item is a name or {"name", "image", "icon"}):
{"type": "logos", "title": "...", "subtitle": "...", "items": [ {"name": "...", "icon": "ph-..."} ]}

--- TYPES FOR TECHNICAL AND ACADEMIC PROJECTS ---

40. CONTENT + SIDE DATA COLUMN (like a work sheet: text, list and box on the left; labelled data on the right):
{"type": "aside", "kicker": "...", "title": "...", "text": "Opening paragraph (optional)", "numbered": false,
 "items": [ {"icon": "ph-check-circle", "title": "...", "text": "..."} ],
 "card": {"title": "LABEL", "text": "Highlighted box below the list (optional)"},
 "side": [ {"label": "LABEL", "value": "2 min", "text": "..."}, {"label": "LABEL", "items": ["...", "..."]} ]}
(the main column needs "text", "items" (max 8; can be plain strings) or "card"; "side" accepts up to 4 blocks, each with "value" (large animated figure), "text" and/or "items")

41. FIGURE (1 to 3 full, uncropped images: plans, diagrams, screenshots, your own photos; with optional numbered annotations):
{"type": "figure", "title": "...", "images": [ {"image": "URL or path", "caption": "...", "span": 2, "bg": "dark", "fit": "cover"} ],
 "source": "Own work (optional)", "points": [ {"title": "...", "text": "...", "icon": "ph-... (optional; otherwise numbers)"} ]}
("span" distributes the width between images; "bg": "dark" frames photos on a dark background; "fit": "cover" fills the frame; "points" max 5)

42. GOALS VERSUS RESULTS (max 10; "status": "done" | "partial" | "fail" | "na"):
{"type": "scorecard", "title": "...", "subtitle": "...", "items": [ {"title": "Goal", "status": "done", "evidence": "What proves it"} ],
 "labels": {"done": "Achieved", "partial": "Partial", "fail": "Not achieved", "na": "Not evaluated"}}
(shows a count per status and a bar; "labels" is optional. In tables, cells containing the engine values "Conseguido", "Parcial", "No evaluado" and "No conseguido" are also colored)

--- FULL-SCREEN JAVASCRIPT ANIMATION ---

43. ANIMATION (a looping canvas that fills the whole slide; use it once or twice per presentation to visually explain a concept: a process, an algorithm, a physical system, a network, a data flow...):
{"type": "animation", "kicker": "Label (optional)", "title": "Title (optional)", "caption": "Teaching sentence explaining what is shown (optional)",
 "params": {"speed": 1}, "overlay": true, "chrome": true, "theme": "dark",
 "code": ["JavaScript line 1", "line 2", "..."]}

Fields: "code" (array of JavaScript lines with only the BODY of the function) or "src" (path, relative to index.html, to a .js file that wraps its code in registerAnimation(function (api) { ... }); e.g. "animations/red-neuronal.js"). If a suitable animation exists in the animations/ folder, prefer it with "src"; otherwise write a new one with "code". "params" is a free configuration object that the code reads with api.params. "overlay": false hides the title box; "chrome": false hides the logo, footer and page number (pure full screen). The slide is dark by default ("theme": "light" changes it). Available files: animations/_plantilla.js (interactive particles), animations/red-neuronal.js (params: layers, names, outputs), animations/ordenacion.js (params: count, speed), animations/argos-ia.js (person detection + AI classification).

RULES FOR WRITING ANIMATION CODE:
- The code is the BODY of a function that receives `api`. It must end with `return { frame };` where frame(dt, t) draws one frame (dt = seconds since the previous one, t = seconds since the slide was shown). It runs again, from scratch, every time you return to the slide.
- Fixed 1920×1080 canvas: always use api.W and api.H for positioning. Start each frame with ctx.clearRect(0, 0, W, H) (the slide background is already painted).
- Destructure what you need: const { ctx, W, H, colors: C, params, pointer, rand, TAU, hexA, text } = api;
- ALWAYS take colors from api.colors (they follow the active theme): C.brand (main), C.brandL, C.brandXl, C.brandD, C.ink, C.sec (secondary), C.accent, C.fg (text), C.bg, C.muted. For transparency use hexA(color, alpha) only with hexadecimal colors (brand, ink, fg…).
- Utilities: rand(a,b), randInt(a,b), lerp, clamp, map(v,a1,b1,a2,b2), ease(t), TAU, mix(c1,c2,t), text(str, x, y, {size, weight, color, align, base, alpha}).
- Optional interaction: api.pointer.x / .y / .down (mouse in canvas coordinates). api.static is true when a capture is generated (thumbnail or PDF).
- For DOM or SVG use api.root (a full-screen <div>) instead of the 2D canvas.
- Write each line of the "code" array with SINGLE quotes or template literals (backticks); avoid double quotes and backslashes so the JSON stays valid. Do not use external libraries, network, DOM access outside api.root, or infinite loops; keep the cost low (fewer than ~300 objects per frame).
- A good teaching animation illustrates ONE idea, has a clear repeating cycle (input → process → result), uses large, readable text labels (≥ 28 px) and few colors (C.brand as the protagonist, dimmed C.fg for the rest).
- Minimal valid skeleton:
  ["const { ctx, W, H, colors: C, text, TAU } = api;", "function frame(dt, t) {", "  ctx.clearRect(0, 0, W, H);", "  ctx.fillStyle = C.brand;", "  ctx.beginPath(); ctx.arc(W / 2 + Math.sin(t * 2) * 300, H / 2, 40, 0, TAU); ctx.fill();", "  text('Hello', W / 2, H - 200, { size: 48, align: 'center' });", "}", "return { frame };"]

- SECURITY: this type executes JavaScript code; only load JSON from a trusted source into the engine.

CONTENT TO TURN INTO A PRESENTATION:
{{Content: INSERT HERE THE SUMMARY, DOCUMENT, DATA OR IDEA YOU WANT THE PRESENTATION TO BE ABOUT}}
