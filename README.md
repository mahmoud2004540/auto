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
| إحداثيات نسبية | `@50,0` — ومع DYN (الافتراضي) النقطة الثانية نسبية تلقائياً زي أوتوكاد: `50,0`؛ و`#x,y` للمطلق |
| تثبيت الطول | اكتب الطول ثم Tab ثم الزاوية ثم Enter |
| إحداثيات قطبية | `@100<45` (الطول<الزاوية) |
| طول مباشر | اكتب رقماً فقط فيُرسم في اتجاه المؤشر |
| إنهاء / تكرار آخر أمر | Enter أو Space أو الزر الأيمن |
| إلغاء | Esc |
| تكبير / تصغير | عجلة الماوس |
| تحريك العرض | الضغط على العجلة والسحب |
| عرض الرسم كاملاً | نقر مزدوج على العجلة |
| تحديد نافذة | سحب من اليسار لليمين (الكائنات داخل النافذة بالكامل) |
| تحديد تقاطعي | سحب من اليمين لليسار (أي كائن يلمس النافذة) |
| تعديل نقطة | حدد الكائن ثم اضغط على المربع الأزرق (Grip) — Space/Enter يبدّل Stretch → Move → Rotate → Scale → Mirror |
| قائمة الزر الأيمن | بدون أمر: Repeat / Cut / Copy / Paste / Erase / Move / Properties ... |
| تتبع الالتقاط (OTRACK) | F11 — قف على نقطة لحظة ثم تحرك أفقياً/رأسياً لترى خط التتبع |

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
| MTEXT | T, MT | نص متعدد السطور مع التفاف تلقائي (محرر داخل الرسم، Ctrl+Enter للإنهاء) |
| TEXT | DT | نص سطر واحد |
| TEXTEDIT | ED | تعديل نص / نص متعدد / خلية جدول (أو نقر مزدوج) |
| TABLE | TB | جدول بعنوان ورؤوس أعمدة — نقر مزدوج على الخلية لتعديلها |
| SPLINE | SPL | منحنى ناعم يمر بالنقاط |
| DIMLINEAR | DLI | بُعد أفقي/رأسي |
| DIMALIGNED | DAL | بُعد مائل |
| DIMRADIUS / DIMDIAMETER | DRA / DDI | بُعد نصف القطر / القطر |
| DIMANGULAR | DAN | بُعد الزاوية (بين خطين، لقوس، أو بثلاث نقاط) |
| LEADER | LE, MLD | سهم مع ملاحظة |
| PAGESETUP | PS | إعداد الورقة: المقاس A4–A0، الاتجاه، مقياس الرسم، الوحدات، بيانات لوحة العنوان |
| PLOT | Ctrl+P | طباعة الـ Layout إلى ملف PDF بمقياس رسم حقيقي |
| LAYOUT / MODEL | LO / MS | إنشاء Layout جديد / الرجوع لـ Model |
| GCHORIZONTAL / GCVERTICAL | GCH / GCV | قيد أفقي / رأسي |
| GCPARALLEL / GCPERPENDICULAR | GCPA / GCPE | قيد توازي / تعامد |
| GCCOINCIDENT / GCEQUAL / GCFIX | GCCO / GCE / GCF | قيد تطابق نقاط / تساوي أطوال / تثبيت نقطة |
| DCLINEAR | DCL | قيد بُعدي لطول خط |
| AUTOCONSTRAIN / DELCON / CONSTRAINTBAR | AUTOC / — / CBAR | قيود تلقائية / حذف القيود / إظهار وإخفاء |
| EXTRUDE | EXT | إعطاء ارتفاع للأشكال المغلقة (3D) |
| ORBIT / PLAN | 3DO / TOP | عرض ثلاثي الأبعاد بالدوران / الرجوع للمسقط |
| VSCURRENT | VS | Shaded أو Wireframe |
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
| STRETCH | S | مط الكائنات بنافذة تقاطعية |
| BREAK / BREAKATPOINT | BR / BRP | كسر كائن بين نقطتين / عند نقطة |
| JOIN | J | دمج خطوط وأقواس و Polylines |
| CHAMFER | CHA | شطف زاوية بين خطين |
| BLOCK / INSERT | B / I | إنشاء بلوك / إدراج بلوك |
| LAYMCUR, LAYOFF, LAYON, LAYISO, LAYLCK, LAYULK | | أدوات الطبقات |
| XLINE / RAY | XL / RAY | خط إنشائي لانهائي / شعاع |
| POINT / DDPTYPE | PO / PTYPE | نقطة / شكل النقطة |
| DIVIDE / MEASURE | DIV / ME | تقسيم كائن لأجزاء متساوية / بمسافة |
| LENGTHEN | LEN | تغيير الطول (DElta / Percent / Total) |
| PEDIT | PE | تعديل Polyline (Close/Open/Join/Reverse/Spline/Decurve) |
| ALIGN | AL | محاذاة بنقطتين مع تكبير اختياري |
| DIMCONTINUE / DIMBASELINE / DIMSTYLE | DCO / DBA / D | أبعاد متصلة / من خط أساس / نمط الأبعاد |
| GROUP / UNGROUP | G | تجميع |
| QSELECT / SELECTSIMILAR | QSE / SIMILAR | تحديد سريع / تحديد المتشابه |
| PURGE / OVERKILL | PU / OV | تنظيف الطبقات والبلوكات غير المستخدمة / حذف المكرر |
| DONUT / REVCLOUD / BOUNDARY | DO / RC / BO | حلقة مصمتة / سحابة مراجعة / حدود مغلقة |
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

مفاتيح الوظائف: F1 مساعدة، F2 سجل الأوامر، F3 الالتقاط، F7 الشبكة، F8 Ortho، F9 Snap، F10 Polar، F11 تتبع الالتقاط، F12 الإدخال الديناميكي. Ctrl+1 الخصائص، Ctrl+9 سطر الأوامر.

## أدوات التخصصات (Tool Palettes — Ctrl+3 أو تبويبات Architecture / Mechanical / Electrical)

| التخصص | الأدوات |
|---|---|
| معماري | WALL (WA) حوائط مزدوجة بسُمك، أبواب (مفرد / مزدوج / منزلق)، شبابيك، سراير، كنب، ترابيزات، مكتب، حمّام (WC / حوض / بانيو / دش)، مطبخ (حوض / بوتاجاز / تلاجة)، سلم بعدد درجات، أعمدة، محاور Grid، سهم الشمال، منسوب، علامة قطاع |
| ميكانيكا | CENTERMARK (CM)، CENTERLINE (CL)، TOLERANCE (TOL) إطار التفاوتات الهندسية، صامولة، مسمار، وردة، رولمان بلي، ترس، عمود بمجرى خابور، رمز التشطيب، Datum، رمز اللحام |
| كهربا | WIRE (WI)، بريزة، بريزة مزدوجة، مفتاح 1 و 2، لمبة سقف وحائط، فلورسنت، لوحة توزيع، كاشف دخان، Data، TV، مروحة — ومخططات: مقاومة، مكثف، ملف، دايود، LED، أرضي، بطارية، فيوز، قاطع، كونتاكت NO/NC، موتور، لمبة، محول |

الرموز بالملليمتر وبتتحول تلقائياً لوحدة الرسم (من قائمة الوحدات في اللوحة أو OPTIONS). كل رمز بيتعمل بلوك على طبقته (A-DOOR, A-FURN, E-POWR, M-PART ...).

## AutoLISP
- اكتب أي تعبير يبدأ بـ `(` في سطر الأوامر: `(setq a 5)` ، `(command "LINE" '(0 0) '(100 0) "")`
- `(defun c:XX () ...)` يعمل أمر جديد اسمه XX.
- APPLOAD (AP) لتحميل ملف `.lsp`، أو اسحب الملف على الرسم.
- مدعوم: setq, defun, if, cond, while, repeat, foreach, lambda, mapcar, command, getpoint, getdist, getreal, getint, getstring, getangle, getkword, initget, entlast, entsel, entget, entdel, ssget, sslength, ssname, polar, distance, angle, inters, strcat, rtos, itoa, getvar, setvar ... و PAUSE.

## Dialogs
- DIMSTYLE (D): ارتفاع النص، حجم السهم، الدقة، لاحقة (مثل mm)، تطبيق على الموجود.
- QSELECT: تحديد حسب النوع والطبقة واللون ونوع الخط.
- OPTIONS (OP): لون الخلفية، حجم المؤشر، حجم الـ Grips والـ Pickbox، زاوية Polar، وحدات الإدراج.
- التحديد بالسحب = Lasso (يمين = داخل، شمال = تقاطع)، Ctrl+Click للتنقل بين الكائنات المتداخلة.

## واجهات زي أوتوكاد
- **Start**: تبويب البداية — New / Open / Explore Sample Drawings (رسمة شقة جاهزة) / آخر الملفات بصور مصغّرة.
- **Layer Properties Manager** (LA): Status, Name, On, Freeze, Lock, Plot, Color, Linetype, Lineweight, Transparency, Description + بحث.
- **Hatch Creation**: تبويب سياقي بيظهر في الشريط وقت أمر H — معرض الأنماط، المقياس، الزاوية، الطبقة، Close.
- **Blocks palette** (I): صور مصغّرة لكل بلوكات الرسمة، Scale / Rotation / Repeat Placement / Explode. (`-INSERT` للنسخة النصية)
- **Plot** (Ctrl+P): Printer (DWG To PDF / PNG)، مقاس الورق، Plot area (Extents / Display / Window / Layout)، Center the plot، Fit to paper أو مقياس، monochrome.ctb / acad.ctb، Portrait / Landscape، **Preview**.
- **Attributes**: ATTDEF (ATT) بـ dialog، البلوك بيسأل عن القيم عند الإدراج، ودبل كليك يفتح Enhanced Attribute Editor (EATTEDIT). بتتحفظ في DXF.

## Viewports و Block Editor
- **MVIEW (MV)** في الـ Layout: Fit / 2 / 3 / 4 أو بركنين. كل Viewport له مقياس مستقل (من الشريط اللي فوق أو VPSCALE).
- اضغط على إطار الـ Viewport لتحديده: المربعات الزرقا لتغيير حجمه، و Delete لحذفه.
- **دبل كليك جوه Viewport = MSPACE (MS)**: ترسم وتعدّل وتكبّر جواه، والمقياس بيتحدّث. دبل كليك برّه أو **PS** = رجوع للورقة.
- **BEDIT (BE)** أو دبل كليك على بلوك: Block Editor بتبويب خاص — Save Block، Close Block Editor (يسأل Save / Discard)، وكل البلوكات في الرسمة بتتحدّث. التعديل كله يتلغي بـ U.

## مجسمات 3D حقيقية (تبويب Solid)
- **مجسمات أساسية:** BOX، CYLINDER (CYL)، CONE، SPHERE، PYRAMID (PYR)، WEDGE (WE)، TORUS (TOR). ELEV لتحديد منسوب البداية.
- **EXTRUDE (EXT):** الأشكال المقفولة بتتحول لمجسمات. **REVOLVE (REV):** لف شكل مقفول حوالين محور.
- **عمليات بوليانية:** UNION (UNI)، SUBTRACT (SU)، INTERSECT (IN)، SLICE (SL). الحجم بيتحسب في Properties.
- **تعديل:** MOVE / COPY / ROTATE / SCALE / MIRROR / ARRAY بيشتغلوا على المجسمات، و 3DMOVE (3M) للحركة في Z، و ROTATE3D (3R) حوالين X / Y / Z.
- **العرض (WebGL):** -VIEW (V): Top / Front / Back / Left / Right / Bottom / SW-SE-NE-NW Isometric. ORBIT (3DO) أو Shift + الزرار الأوسط للدوران. PLAN للرجوع.
- **Visual Styles (VS):** 2D Wireframe، Wireframe، Hidden، Realistic، Conceptual، Shaded، Shaded with Edges، X-ray.
- في عرض الـ 3D تقدر تختار المجسمات بالضغط عليها أو بالنافذة، وترسم على مستوى العمل.
- المجسمات بتتحفظ في ملف الرسمة (JSON)، وفي DXF بتطلع 3DFACE.

## Properties و Dimension Styles و Text Editor
- **Properties (Ctrl+1)** بنفس تقسيمة أوتوكاد: قائمة نوع الكائن فوق (All / Line / Dimension ...)، أزرار Select / Quick Select، أقسام General / Geometry / Text / Misc / View / Plot style قابلة للطي، وتعديل أكتر من كائن مرة واحدة.
- **Dimension Style Manager (D)**: Standard / ISO-25 / Architectural، Set Current / New / Modify مع معاينة، وتبويبات Lines / Symbols and Arrows / Text / Fit / Primary Units (أسهم Closed filled / Architectural tick / Dot / Open، حجم السهم، النص فوق أو في النص، Horizontal أو Aligned، المقياس الكلي، الدقة، الفاصلة، Prefix / Suffix، Scale factor، Zero suppression). تعديل النمط بيحدّث كل الأبعاد اللي عليه.
- **Text Editor**: تبويب بيظهر وقت كتابة MTEXT — ارتفاع النص، UPPERCASE / lowercase، رموز (° ± Ø ≈ ∠ Δ ...)، Field (التاريخ / اسم الملف)، Find & Replace، Close Text Editor.

## Express Tools ومساحات العمل وشريط الحالة
- تبويب **Express Tools**: TXT2MTXT، TCOUNT، TCASE، BURST، BREAKLINE، FLATTEN، LAYMRG، LAYDEL.
- عزل الكائنات وإخفاؤها: ISOLATEOBJECTS و HIDEOBJECTS و UNISOLATEOBJECTS (زر العزل في شريط الحالة).
- CLEANSCREENON / Ctrl+0: شاشة نظيفة بإخفاء الشريط والتبويبات واللوحات.
- مساحات العمل: Drafting & Annotation و 3D Modeling، من زر الترس في شريط الحالة.
- شريط الحالة فيه كمان: Transparency و Selection Cycling و Annotation Scale و Quick Properties.
- لوحة Quick Properties بتظهر جنب الكائن المختار.

## صفحة البداية (Start)
- شكل مدير ملفات: New Drawing و Upload و New Folder، وأقسام Recent و Sample Files و My Drawings.
- جدول بالأعمدة File Type و Name و Date Modified و Size و Owner، والترتيب بالضغط على العمود، والبحث في المجلد الحالي.
- كليك يمين على الملف: فتح، إعادة تسمية، نقل لمجلد، حذف.
- لوحة موارد على اليمين تقدر تقفلها بزر ».

## الحفظ
- من جهازك (index.html): الملفات بتتنزّل عادي.
- من رابط claude.ai: البرنامج بيستخدم خاصية التنزيل الخاصة بالمنصة؛ JSON و PDF و PNG و SVG بتتحفظ مباشرة، و DXF بيتحفظ جوه ملف ZIP (البرنامج نفسه بيفتح ملف الـ ZIP على طول).

## ملفات DWG
- **الفتح:** البرنامج بيفتح ملفات DWG من إصدار R14 لحد AutoCAD 2018 وما بعده (اتجرب على R14 و2000 و2004 و2007 و2010 و2013 و2018).
  افتح الملف من OPEN أو اسحبه على الرسم. أول مرة بيتحمّل قارئ DWG (حوالي 11 ميجا) من الإنترنت.
- **الحفظ:** الحفظ بصيغة DWG غير متاح. احفظ DXF (أمر DXFOUT) — أوتوكاد بيفتحه مباشرة ومنه تحفظه DWG.
- قارئ DWG هو مكتبة **LibreDWG** (مشروع GNU) عن طريق الحزمة `@mlightcad/libredwg-web@0.8.2`، ورخصتها **GPL-3.0**.
  لو هتوزّع البرنامج لازم يكون بنفس الرخصة. للاستخدام الشخصي أو الداخلي مفيش مشكلة.
- للتشغيل بدون إنترنت: حط الملف `libredwg-web.wasm` من الحزمة دي في `vendor/libredwg/`.

## الملفات / Files

- `.json` — الصيغة الأصلية للبرنامج (تحفظ كل شيء).
- `.dwg` — فتح فقط (انظر قسم ملفات DWG).
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
