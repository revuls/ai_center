---
name: prompt
description: "Genera JSON con Slides de manera automatica para usando con la "
tags: [slides, presentaciones]
audience: [todos]
targets: [copilot, m365]
status: draft
updated: 2026-10-24
---

Actúa como un diseñador experto de presentaciones ejecutivas y un ingeniero de datos. Tu objetivo es leer el contenido o la idea que te proporcionaré al final y transformarlo estrictamente en un archivo JSON válido y formateado para un motor de presentaciones web.

El diseño usa una identidad visual limpia y moderna (naranja #FF6200, tinta casi negra #151515, morado secundario #525199, píldoras y tarjetas redondeadas; enfoque directo y digital). Usa frases en minúscula tipo oración (no MAYÚSCULAS) y tono cercano pero profesional. Adapta el tono del texto para que sea ejecutivo, claro y persuasivo. El motor añade animaciones, transiciones y contadores animados automáticamente: tú solo elige los tipos de slide adecuados y escribe contenido conciso.

REGLAS ESTRICTAS PARA EL JSON:
1. La salida debe ser ÚNICAMENTE el código JSON. No incluyas explicaciones antes ni después.
2. Utiliza siempre imágenes genéricas de Unsplash (https://images.unsplash.com/photo-...) o Placehold (https://placehold.co/...). Si el autor aporta sus propias figuras (planos, esquemas, capturas, fotos de un informe), refiérelas con su ruta relativa (p. ej. "assets/proyecto/esquema.jpg") y muéstralas con el tipo "figure".
3. Para los iconos, utiliza nombres válidos de la librería Phosphor Icons (ej: "ph-chart-bar", "ph-users", "ph-rocket-launch").
4. El JSON debe tener un objeto principal con dos propiedades: "meta" y "slides".
5. Sé conciso: títulos de máx. 8 palabras, textos de máx. 40 palabras por bloque. Se admite HTML inline básico en los textos (<strong>, <br>).
6. Los valores numéricos de métricas deben incluir su unidad dentro del string (ej: "+15%", "2.4M", "120M€"): el motor los anima contando desde cero.
7. Estructura la historia: abre con "cover", usa "section" para separar bloques, alterna slides visuales (hero, big-number, charts, gallery, figure, animation) con slides de texto, y cierra con "closing".
8. Para memorias, proyectos técnicos o defensas académicas usa "aside" (contenido + columna de datos clave), "figure" (planos, esquemas y capturas completos) y "scorecard" (objetivos frente a resultados con su evidencia).

ESQUEMA DEL JSON:

{
  "meta": { "theme": "classic" | "marino" | "ocean" | "esmeralda" | "violeta" | "carmin" | "argos", "mode": "light" | "dark" (opcional), "title": "Título corto (opcional)", "date": "Mes Año", "author": "Nombre o Departamento", "transition": "slide" | "fade" | "zoom", "logo": "URL de imagen del logo oficial (opcional)" },
  "slides": [ ...array de objetos slide... ]
}

TEMAS DE COLOR (meta.theme): "classic" (naranja + tinta, por defecto), "marino" (naranja + azul marino), "ocean" (azul + tinta marina), "esmeralda" (verde), "violeta" (morado), "carmin" (rojo) y "argos" (azul marino + verde, pensado para defensas técnicas; combínalo con "mode": "dark"). "meta.mode": "dark" hace oscuros por defecto todos los slides claros. Elige el que mejor encaje con el tema de la presentación (p. ej. "esmeralda" para sostenibilidad, "carmin" para historia, "violeta" para tecnología). Ningún tema muestra logo por defecto: indica "meta.brand" (texto) o "meta.logo" (URL de imagen) si lo quieres.

CAMPOS OPCIONALES VÁLIDOS EN CUALQUIER SLIDE:
- "notes": "Notas del orador (se ven con la tecla N)"
- "kicker": "Etiqueta corta sobre el título" (en slides con cabecera, cover, hero y section)
- "theme": "light" | "dark" | "orange" (modo del slide; "orange" rellena el fondo con el color principal del tema; por defecto cada tipo tiene el suyo: cover, section, statement y closing son naranja; hero, quote y big-number son oscuros)

TIPOS DE SLIDES PERMITIDOS (elige los que mejor se adapten al contenido):

1. PORTADA (oscura, con partículas):
{"type": "cover", "title": "...", "subtitle": "..."}

2. HERO (impacto visual con imagen de fondo):
{"type": "hero", "title": "...", "subtitle": "...", "image": "URL"}

3. TARJETAS DE CARACTERÍSTICAS (3 recomendadas, máx 4):
{"type": "features", "title": "...", "subtitle": "...", "cards": [ {"icon": "ph-...", "title": "...", "text": "...", "style": "orange" | "navy"} ]}

4. CUADRÍCULA DE NÚMEROS/KPIs (máx 4):
{"type": "number-grid", "title": "...", "subtitle": "...", "metrics": [ {"value": "...", "label": "...", "desc": "..."} ]}

5. TEXTO DIVIDIDO EN 2 COLUMNAS (retos/soluciones, antes/después):
{"type": "split-text", "title": "...", "subtitle": "...", "connector": "arrow" | "VS" | false, "columns": [ {"title": "...", "text": "...", "icon": "ph-..."} ]}

6. CITA DESTACADA:
{"type": "quote", "text": "...", "author": "...", "role": "Cargo u organización (opcional)"}

7. IMAGEN Y TEXTO:
{"type": "image-text", "title": "...", "subtitle": "...", "image": "URL", "text": "... (usa \n\n para separar párrafos)", "layout": "left-image" | "right-image"}

8. LÍNEA DE TIEMPO / ROADMAP (máx 6 pasos):
{"type": "timeline", "title": "...", "subtitle": "...", "steps": [ {"date": "...", "title": "...", "desc": "..."} ]}

9. EQUIPO (máx 4 miembros):
{"type": "team", "title": "...", "subtitle": "...", "members": [ {"name": "...", "role": "...", "image": "URL", "desc": "..."} ]}

10. CATÁLOGO DE ICONOS (hasta 4 = tarjetas grandes con descripción; de 5 a 8 = cuadrícula compacta):
{"type": "icons", "title": "...", "subtitle": "...", "icons": [ {"icon": "ph-...", "title": "...", "desc": "...", "color": "orange" | "navy"} ]}

11. TABLA DE DATOS (máx 7 filas; "highlight" resalta una columna por su índice, opcional):
{"type": "table", "title": "...", "subtitle": "...", "highlight": 1, "headers": ["Col1", "Col2", "..."], "rows": [ ["Dato1", "Dato2", "..."] ]}

12. GRÁFICOS (1 a 3 por slide). Tipos: "bar", "hbar" (barras horizontales), "line", "area", "radar", "doughnut", "pie":
{"type": "charts", "title": "...", "subtitle": "...", "charts": [
  {"type": "bar", "title": "...", "labels": ["A", "B"], "datasets": [{"label": "X", "data": [10, 20], "color": "orange"}, {"label": "Y", "data": [5, 15], "color": "navy"}]},
  {"type": "doughnut", "title": "...", "labels": ["A", "B", "C"], "data": [50, 30, 20], "center": {"value": "100%", "label": "Total"}}
]}
(colores válidos: "orange", "navy" = tinta, "blue" = morado secundario, "amber", "sky". No hace falta "id".)

--- NUEVOS TIPOS ---

13. SEPARADOR DE SECCIÓN (oscuro, con número gigante; se numera solo si omites "number"):
{"type": "section", "title": "...", "subtitle": "...", "number": "01"}

14. AGENDA (máx 7 puntos):
{"type": "agenda", "title": "Agenda", "subtitle": "...", "items": [ {"title": "...", "desc": "..."} ]}

15. NÚMERO GIGANTE (una sola cifra protagonista, con contador animado):
{"type": "big-number", "kicker": "...", "value": "2.4M", "label": "...", "desc": "...", "image": "URL (opcional)"}

16. LISTA DE PUNTOS CLAVE (máx 8; con "image" se muestra una imagen al lado; "numbered": true usa números en vez de iconos):
{"type": "bullets", "title": "...", "subtitle": "...", "image": "URL (opcional)", "items": [ {"icon": "ph-...", "title": "...", "text": "..."} ]}

17. VERSUS / COMPARATIVA (dos paneles enfrentados, 3-5 puntos cada uno):
{"type": "versus", "title": "...", "subtitle": "...", "verdict": "Conclusión destacada (opcional)",
 "left": {"title": "...", "icon": "ph-x-circle", "items": ["...", "..."]},
 "right": {"title": "...", "icon": "ph-check-circle", "items": ["...", "..."]}}

18. PROCESO / FLUJO EN CHEVRONES (máx 5 pasos):
{"type": "process", "title": "...", "subtitle": "...", "steps": [ {"icon": "ph-...", "title": "...", "desc": "..."} ]}

19. BARRAS DE PROGRESO ANIMADAS (máx 6; "value" de 0 a 100, o usa "max" y "unit" para otras escalas):
{"type": "bars", "title": "...", "subtitle": "...", "items": [ {"label": "...", "note": "...", "value": 75, "color": "orange" | "navy" | "blue"} ]}

20. MATRIZ 2x2 (DAFO/SWOT, priorización; 4 cuadrantes en orden: arriba-izq, arriba-der, abajo-izq, abajo-der):
{"type": "matrix", "title": "...", "subtitle": "...", "axes": {"x": "Etiqueta eje horizontal", "y": "Etiqueta eje vertical"},
 "quadrants": [ {"title": "...", "icon": "ph-...", "tone": "orange" | "navy" | "blue", "items": ["...", "..."]} ]}

21. GALERÍA DE IMÁGENES (2 a 4 imágenes con pie):
{"type": "gallery", "title": "...", "subtitle": "...", "images": [ {"image": "URL", "title": "...", "caption": "..."} ]}

22. CÓDIGO (máx 14 líneas; "highlight" = números de línea a resaltar, 1-based; usa \n para saltos de línea):
{"type": "code", "title": "...", "subtitle": "...", "file": "nombre.py", "code": "línea 1\nlínea 2", "highlight": [2], "caption": "Nota opcional"}

23. CIERRE (oscuro, con contactos y llamada a la acción):
{"type": "closing", "title": "Gracias", "subtitle": "...", "contacts": [ {"icon": "ph-envelope-simple", "text": "..."} ], "cta": "Texto del botón (opcional)"}

--- TIPOS ADICIONALES ---

24. FRASE DESTACADA (naranja; rodea con *asteriscos* las palabras a enfatizar):
{"type": "statement", "kicker": "...", "text": "Hacer la banca tan *sencilla* que ...", "source": "Origen (opcional)"}

25. MEDIDORES CIRCULARES (máx 4; "max" opcional, por defecto 100):
{"type": "gauges", "title": "...", "subtitle": "...", "items": [ {"value": "92%", "label": "...", "desc": "...", "color": "orange" | "navy" | "blue"} ]}

26. EMBUDO (máx 6 etapas, valores numéricos decrecientes; calcula solo el % de conversión):
{"type": "funnel", "title": "...", "subtitle": "...", "stages": [ {"label": "Visitas", "value": "120.000", "desc": "(opcional)"} ]}

27. PIRÁMIDE (máx 5 niveles, de arriba abajo):
{"type": "pyramid", "title": "...", "subtitle": "...", "levels": [ {"title": "...", "desc": "..."} ]}

28. CICLO (3 a 6 pasos en círculo, "center" = etiqueta central):
{"type": "cycle", "title": "...", "subtitle": "...", "center": "...", "steps": [ {"icon": "ph-...", "title": "...", "desc": "..."} ]}

29. DIAGRAMA DE VENN (2 o 3 conjuntos; "center" = etiqueta de la intersección):
{"type": "venn", "title": "...", "subtitle": "...", "center": "...", "sets": [ {"title": "...", "desc": "..."} ]}

30. ORGANIGRAMA (máx 3 niveles; hasta 4 hijos por nodo y 3 nietos por hijo):
{"type": "org", "title": "...", "subtitle": "...", "root": {"name": "...", "role": "...", "image": "URL (opcional)", "children": [ {"name": "...", "role": "...", "children": [ ... ]} ]}}

31. DIAGRAMA DE GANTT (máx 7 filas; "start"/"end" = índices de periodo base 0, "today" = posición decimal de la línea "Hoy", opcional):
{"type": "gantt", "title": "...", "subtitle": "...", "periods": ["T1", "T2", "T3", "T4"], "today": 2.4,
 "rows": [ {"label": "...", "note": "...", "start": 0, "end": 1, "color": "orange" | "navy" | "blue", "text": "Texto dentro de la barra"} ]}

32. PLANES / OPCIONES (2 a 4 tarjetas; "highlight": true destaca una):
{"type": "plans", "title": "...", "subtitle": "...", "plans": [ {"name": "...", "price": "9€", "period": "/mes", "desc": "...", "highlight": true, "tag": "Recomendado", "features": ["...", "..."]} ]}

33. LISTA DE ESTADO / CHECKLIST (máx 8; "status": "done" | "progress" | "todo"):
{"type": "checklist", "title": "...", "subtitle": "...", "items": [ {"text": "...", "owner": "...", "date": "...", "status": "done"} ]}

34. TESTIMONIOS (máx 3; "rating" 1-5 opcional):
{"type": "testimonials", "title": "...", "subtitle": "...", "items": [ {"text": "...", "author": "...", "role": "...", "rating": 5, "image": "URL (opcional)"} ]}

35. PREGUNTAS FRECUENTES (máx 6):
{"type": "faq", "title": "...", "subtitle": "...", "items": [ {"q": "...", "a": "..."} ]}

36. ANTES / DESPUÉS (comparador de imágenes con control deslizante):
{"type": "compare", "title": "...", "subtitle": "...", "before": "URL", "after": "URL", "beforeLabel": "Antes", "afterLabel": "Después"}

37. TARJETAS CON IMAGEN (2 a 4):
{"type": "image-cards", "title": "...", "subtitle": "...", "cards": [ {"image": "URL", "tag": "Etiqueta", "title": "...", "text": "..."} ]}

38. VÍDEO (URL de YouTube, Vimeo o archivo MP4; si se deja "src" vacío muestra un póster con botón de play):
{"type": "video", "title": "...", "subtitle": "...", "src": "URL", "poster": "URL imagen", "caption": "(opcional)"}

39. LOGOS / PARTNERS (hasta 8; cada item es un nombre o {"name", "image", "icon"}):
{"type": "logos", "title": "...", "subtitle": "...", "items": [ {"name": "...", "icon": "ph-..."} ]}

--- TIPOS PARA PROYECTOS TÉCNICOS Y ACADÉMICOS ---

40. CONTENIDO + COLUMNA LATERAL DE DATOS (como una ficha de trabajo: texto, lista y recuadro a la izquierda; datos etiquetados a la derecha):
{"type": "aside", "kicker": "...", "title": "...", "text": "Párrafo inicial (opcional)", "numbered": false,
 "items": [ {"icon": "ph-check-circle", "title": "...", "text": "..."} ],
 "card": {"title": "ETIQUETA", "text": "Recuadro destacado bajo la lista (opcional)"},
 "side": [ {"label": "ETIQUETA", "value": "2 min", "text": "..."}, {"label": "ETIQUETA", "items": ["...", "..."]} ]}
(la columna principal necesita "text", "items" (máx 8; pueden ser textos simples) o "card"; "side" admite hasta 4 bloques, cada uno con "value" (cifra grande animada), "text" y/o "items")

41. FIGURA (1 a 3 imágenes completas sin recortar: planos, esquemas, capturas, fotos propias; con anotaciones numeradas opcionales):
{"type": "figure", "title": "...", "images": [ {"image": "URL o ruta", "caption": "...", "span": 2, "bg": "dark", "fit": "cover"} ],
 "source": "Elaboración propia (opcional)", "points": [ {"title": "...", "text": "...", "icon": "ph-... (opcional; si no, números)"} ]}
("span" reparte el ancho entre imágenes; "bg": "dark" enmarca fotos sobre fondo oscuro; "fit": "cover" rellena el marco; "points" máx 5)

42. OBJETIVOS FRENTE A RESULTADOS (máx 10; "status": "done" | "partial" | "fail" | "na"):
{"type": "scorecard", "title": "...", "subtitle": "...", "items": [ {"title": "Objetivo", "status": "done", "evidence": "Qué lo demuestra"} ],
 "labels": {"done": "Conseguido", "partial": "Parcial", "fail": "No conseguido", "na": "No evaluado"}}
(muestra un recuento por estado y una barra; "labels" es opcional. En las tablas, las celdas "Conseguido", "Parcial", "No evaluado" y "No conseguido" también se colorean)

--- ANIMACIÓN JAVASCRIPT A PANTALLA COMPLETA ---

43. ANIMACIÓN (un canvas en bucle que ocupa todo el slide; úsalo 1 o 2 veces por presentación para explicar visualmente un concepto: un proceso, un algoritmo, un sistema físico, una red, un flujo de datos...):
{"type": "animation", "kicker": "Etiqueta (opcional)", "title": "Título (opcional)", "caption": "Frase didáctica que explica lo que se ve (opcional)",
 "params": {"speed": 1}, "overlay": true, "chrome": true, "theme": "dark",
 "code": ["línea 1 de JavaScript", "línea 2", "..."]}

Campos: "code" (array de líneas de JavaScript con solo el CUERPO de la función) o "src" (ruta, relativa a index.html, a un archivo .js que envuelve su código en registerAnimation(function (api) { ... }); p. ej. "animations/red-neuronal.js"). Si existe una animación adecuada en la carpeta animations/, prefiérela con "src"; si no, escribe una nueva con "code". "params" es un objeto libre de configuración que el código lee con api.params. "overlay": false oculta el cuadro de título; "chrome": false oculta logo, pie y número de página (pantalla completa pura). El slide es oscuro por defecto ("theme": "light" lo cambia). Archivos disponibles: animations/_plantilla.js (partículas interactivas), animations/red-neuronal.js (params: layers, names, outputs), animations/ordenacion.js (params: count, speed), animations/argos-ia.js (detección de personas + clasificación con IA).

REGLAS PARA ESCRIBIR EL CÓDIGO DE UNA ANIMACIÓN:
- El código es el CUERPO de una función que recibe `api`. Debe terminar con `return { frame };` donde frame(dt, t) dibuja un fotograma (dt = segundos desde el anterior, t = segundos desde que se mostró el slide). Se ejecuta de nuevo, desde cero, cada vez que se vuelve al slide.
- Lienzo fijo de 1920×1080: usa siempre api.W y api.H para posicionar. Empieza cada fotograma con ctx.clearRect(0, 0, W, H) (el fondo del slide ya está pintado).
- Desestructura lo necesario: const { ctx, W, H, colors: C, params, pointer, rand, TAU, hexA, text } = api;
- Colores SIEMPRE desde api.colors (siguen el tema activo): C.brand (principal), C.brandL, C.brandXl, C.brandD, C.ink, C.sec (secundario), C.accent, C.fg (texto), C.bg, C.muted. Para transparencias usa hexA(color, alfa) solo con colores hexadecimales (brand, ink, fg…).
- Utilidades: rand(a,b), randInt(a,b), lerp, clamp, map(v,a1,b1,a2,b2), ease(t), TAU, mix(c1,c2,t), text(str, x, y, {size, weight, color, align, base, alpha}).
- Interacción opcional: api.pointer.x / .y / .down (ratón en coordenadas del lienzo). api.static es true cuando se genera una captura (miniatura o PDF).
- Para DOM o SVG usa api.root (un <div> a pantalla completa) en lugar del canvas 2D.
- Escribe cada línea del array "code" con comillas SIMPLES o plantillas (backticks); evita las comillas dobles y las barras invertidas para que el JSON sea válido. No uses librerías externas, ni red, ni acceso al DOM fuera de api.root, ni bucles infinitos; mantén el coste bajo (menos de ~300 objetos por fotograma).
- Una buena animación didáctica ilustra UNA idea, tiene un ciclo claro que se repite (entrada → proceso → resultado), usa etiquetas de texto grandes y legibles (≥ 28 px) y pocos colores (C.brand como protagonista, C.fg atenuado para el resto).
- Esqueleto mínimo válido:
  ["const { ctx, W, H, colors: C, text, TAU } = api;", "function frame(dt, t) {", "  ctx.clearRect(0, 0, W, H);", "  ctx.fillStyle = C.brand;", "  ctx.beginPath(); ctx.arc(W / 2 + Math.sin(t * 2) * 300, H / 2, 40, 0, TAU); ctx.fill();", "  text('Hola', W / 2, H - 200, { size: 48, align: 'center' });", "}", "return { frame };"]

- SEGURIDAD: este tipo ejecuta código JavaScript; solo debe cargarse en el motor un JSON de una fuente de confianza.

CONTENIDO PARA TRANSFORMAR EN PRESENTACIÓN:
{{Content: INSERTA AQUÍ EL RESUMEN, DOCUMENTO, DATOS O IDEA DE LO QUE QUIERES QUE TRATE LA PRESENTACIÓN}}
