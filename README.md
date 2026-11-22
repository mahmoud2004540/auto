# OpenDraft CAD

برنامج رسم هندسي ثنائي الأبعاد (2D CAD) يعمل في المتصفح، بأسلوب عمل مشابه لبرامج الـ CAD الاحترافية:
سطر أوامر، اختصارات الأوامر، الالتقاط (Object Snap)، الطبقات (Layers)، وفتح/حفظ ملفات DXF.

A browser-based 2D CAD program with a professional CAD workflow: command line with aliases,
object snaps, ortho/polar tracking, layers, grips, properties palette, and DXF import/export.
No installation and no dependencies — pure HTML/CSS/JavaScript.

## التشغيل / Run

افتح الملف `index.html` في أي متصفح حديث (Chrome / Edge / Firefox). لا يحتاج إنترنت أو تثبيت.

Just open `index.html` in a modern browser. Works offline. You can also host the folder on any static
host (e.g. GitHub Pages).

## طريقة الاستخدام السريعة

| العمل | الطريقة |
|---|---|
| تشغيل أمر | اكتب اسمه أو اختصاره ثم Enter أو Space (مثال: `L`) |
| إحداثيات مطلقة | `100,50` |
| إحداثيات نسبية | `@50,0` |
| إحداثيات قطبية | `@100<45` (الطول<الزاوية) |
| طول مباشر | اكتب رقماً فقط فيُرسم في اتجاه المؤشر |
| إنهاء / تكرار آخر أمر | Enter أو Space أو الزر الأيمن |
| إلغاء | Esc |
| تكبير / تصغير | عجلة الماوس |
| تحريك العرض | الضغط على العجلة والسحب |
| عرض الرسم كاملاً | نقر مزدوج على العجلة |
| تحديد نافذة | سحب من اليسار لليمين (الكائنات داخل النافذة بالكامل) |
| تحديد تقاطعي | سحب من اليمين لليسار (أي كائن يلمس النافذة) |
| تعديل نقطة | حدد الكائن ثم اضغط على المربع الأزرق (Grip) |

## الأوامر / Commands

| Command | Alias | الوظيفة |
|---|---|---|
| LINE | L | خط |
| PLINE | PL | خط متعدد (Polyline) |
| CIRCLE | C | دائرة (مركز/نصف قطر، قطر، 2P، 3P) |
| ARC | A | قوس (3 نقاط أو مركز/بداية/نهاية) |
| RECTANG | REC | مستطيل (بالنقاط أو بالأبعاد) |
| POLYGON | POL | مضلع منتظم |
| ELLIPSE | EL | قطع ناقص |
| HATCH | H, BH | تهشير منطقة مغلقة (بنقرة داخلها أو باختيار كائنات مغلقة) — الأنماط: SOLID, ANSI31, ANSI32, ANSI37, LINE, NET, NET3, EARTH |
| TEXT | T, DT | نص |
| DIMLINEAR | DLI | بُعد أفقي/رأسي |
| DIMALIGNED | DAL | بُعد مائل |
| MOVE | M | تحريك |
| COPY | CO, CP | نسخ (مع خيار Array) |
| ROTATE | RO | تدوير (Copy / Reference) |
| SCALE | SC | تكبير/تصغير (Copy / Reference) |
| MIRROR | MI | انعكاس |
| OFFSET | O | إزاحة موازية |
| TRIM | TR | قص |
| EXTEND | EX | مدّ |
| FILLET | F | تقويس/وصل زاوية بين خطين |
| ARRAYRECT | AR | مصفوفة مستطيلة |
| ARRAYPOLAR | ARP | مصفوفة دائرية |
| EXPLODE | X | تفكيك |
| ERASE | E, Delete | حذف |
| MATCHPROP | MA | نسخ الخصائص |
| LINETYPE | LT | عرض أنواع الخطوط (Continuous, Dashed, Hidden, Center, Phantom, DashDot, Dot, Border) |
| LTSCALE | LTS | مقياس أنواع الخطوط |
| LWDISPLAY | LWT | إظهار/إخفاء سُمك الخطوط |
| COPYCLIP / PASTECLIP / CUTCLIP | Ctrl+C / Ctrl+V / Ctrl+X | الحافظة |
| DIST | DI | قياس مسافة وزاوية |
| AREA | AA | حساب مساحة ومحيط |
| ID | | إحداثيات نقطة |
| LIST | LI | عرض بيانات الكائن |
| ZOOM | Z | تكبير (Extents / Window / In / Out) |
| PAN | P | تحريك العرض |
| LAYER | LA | مدير الطبقات |
| UNDO / REDO | U, Ctrl+Z / Ctrl+Y | تراجع / إعادة |
| NEW / OPEN / SAVE | Ctrl+N / Ctrl+O / Ctrl+S | ملف جديد / فتح (JSON أو DXF) / حفظ |
| DXFOUT | DXF | تصدير DXF (يفتح في برامج CAD الأخرى) |
| SVGOUT / PNGOUT | SVG / PNG | تصدير صورة |

مفاتيح الوظائف: F1 مساعدة، F2 سجل الأوامر، F3 الالتقاط، F7 الشبكة، F8 Ortho، F9 Snap، F10 Polar، F12 الإدخال الديناميكي.

## الملفات / Files

- `.json` — الصيغة الأصلية للبرنامج (تحفظ كل شيء).
- `.dxf` — استيراد: LINE, CIRCLE, ARC, LWPOLYLINE (مع الأقواس), POLYLINE, TEXT, MTEXT, ELLIPSE, SPLINE, POINT, INSERT (Blocks).
  تصدير: DXF R12 (متوافق مع أغلب برامج CAD).
- يتم حفظ نسخة تلقائية في المتصفح واستعادتها عند إعادة الفتح.

## Project structure

```
index.html        layout
css/style.css     dark CAD theme
js/geom.js        vector math, intersections, affine transforms
js/entities.js    entity types (line, circle, arc, polyline, text, dimension)
js/app.js         document, view, renderer, snapping, input engine
js/commands.js    drawing / modify / inquiry commands
js/io.js          JSON, DXF import/export, SVG, PNG
js/ui.js          ribbon, palettes, command line, status bar, keyboard
```
