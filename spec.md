# DST Cook Pot Simulator — spec.md

> Source of truth ของโปรเจคนี้ (ไม่ใช่แชท). อัปเดตทุกครั้งที่สถานะ/การตัดสินใจ/interface เปลี่ยน.
> อัปเดตล่าสุด: 2026-07-18

## 1. เป้าหมายโปรเจค
เว็บจำลอง (simulator) หม้อปรุงอาหาร (Crock Pot) ของเกม **Don't Starve Together** โดยยึด
กลไกจริงจาก game scripts เป็นหลัก 3 ฟีเจอร์:

1. **Cook** — ผู้ใช้ใส่วัตถุดิบ 4 ชิ้นลงหม้อ → กดปรุง → ได้เมนู 1 อย่าง (สุ่มถ่วงน้ำหนักเหมือนเกมจริง)
2. **Suggest / reverse search** — ใส่วัตถุดิบ (ครบ/บางส่วน) → ระบบแนะนำเมนูที่เป็นไปได้ + โอกาส (%)
3. **Recipe detail** — กดที่เมนู → ดูเงื่อนไข/สูตรตัวอย่าง (card_def) + ค่าสถานะ (health/hunger/sanity) + วิธีทำ

## 2. การตัดสินใจที่ล็อกแล้ว (Decisions)
| เรื่อง | เลือก | เหตุผล |
|--------|-------|--------|
| Tech stack | **React + Vite + TypeScript** | SPA, ข้อมูล static JSON, ไม่ต้องมี backend, deploy ง่าย |
| Recipe `test` logic | **พอร์ตเป็น JS predicate** | pure JS ไม่พึ่ง Lua runtime, เร็ว, คุมได้เต็ม |
| Scope v1 (cooker) | **Crock Pot มาตรฐาน** (`cookpot`, `portablecookpot` base) | ครบคลุมผู้เล่นส่วนใหญ่ก่อน; Warly/Spiced เป็น v2 |
| ภาษา | **สองภาษา (TH/EN) ตั้งแต่แรก** | โครง i18n ไว้ก่อน เติมคำแปลได้ทีหลัง |
| Hosting | Static (Netlify/Vercel/GitHub Pages) | ไม่มี backend |

## 3. แหล่งข้อมูล (Data sources)
ยึด **game scripts** เป็น source of truth:
- `preparedfoods.lua` — สูตร Crock Pot หลัก (~60 สูตร) — mirror: taichunmin/dont-starve-together-game-scripts
- `cooking.lua` — นิยาม ingredient tags + อัลกอริทึม match
- `tuning.lua` — ค่าคงที่ `TUNING.*` (HEALING_MED ฯลฯ) → ต้องดึงเพิ่มเพื่อแปลง stat เป็นตัวเลข **[TODO]**
- `preparednonfoods.lua` — `wetgoop` (fallback เมื่อไม่มีสูตรผ่าน) **[TODO ดึง]**
- i18n ชื่อวัตถุดิบ/เมนู: เทียบ wiki (dontstarve.wiki.gg) — เติมภายหลัง

ไฟล์ .lua ต้นฉบับ cache ไว้ที่ `scripts/lua/` เพื่อ reproducibility (pin ตาม commit/patch).

## 4. กลไกจริงจากเกม (อ้าง cooking.lua 228–278)
```
1. รวม tag ของวัตถุดิบ 4 ช่อง → tags{} (ผลรวมค่า) + names{} (นับชิ้น)
2. วนทุกสูตร: recipe.test(cooker, names, tags) → เก็บ candidates ที่ผ่าน
3. เรียง priority มาก→น้อย → เก็บเฉพาะ "กลุ่ม priority สูงสุด"
4. ในกลุ่ม สุ่มถ่วงน้ำหนักด้วย weight → เมนูจริง
5. ไม่มีสูตรผ่าน → wetgoop
```
รายละเอียด ingredient tags:
- tag ที่มี: `fruit, monster, sweetener, veggie, meat, fish, egg, decoration, fat, dairy, inedible, seed, magic, frozen`
- meta-tag ที่ระบบเติมให้: `precook=1` (variant `_cooked`), `dried=1` (variant `_dried`)
- ค่าตัวอย่าง: `berries→fruit 0.5`, `durian→{fruit1,monster1}`, `royal_jelly→sweetener3`, `meat→meat1`

## 5. Data model / JSON schema

### 5.1 `ingredients.json`
```jsonc
{
  "<prefab>": {
    "tags": { "<tag>": <number> },   // ค่าดิบจาก AddIngredientValues
    "cancook": <bool>,               // มี variant _cooked (+precook 1)
    "candry":  <bool>,               // มี variant _dried  (+dried 1)
    "i18n": { "th": "เนื้อ", "en": "Meat" }
  }
}
```
variant `_cooked` / `_dried` **สร้างอัตโนมัติตอน build** จาก flag ข้างบน (ไม่ต้องเขียนซ้ำ)

### 5.2 `recipes.json`
```jsonc
{
  "name": "butterflymuffin",
  "cookers": ["cookpot", "portablecookpot", "archive_cookpot"],
  "priority": 1,
  "weight": 1,
  "foodtype": "VEGGIE",
  "stats": { "health": 20, "hunger": 37.5, "sanity": 5, "perishtime": 15000, "cooktime": 2 },
  "test": "(names.butterflywings||names.moonbutterflywings) && !tags.meat && (tags.veggie>=0.5)",
  "card_def": [["butterflywings",1],["carrot",2],["berries",1]],
  "i18n": { "th": { "name": "มัฟฟินผีเสื้อ", "how": "..." }, "en": { "name": "Butter Muffin", "how": "..." } }
}
```
- `test` = expression string (พอร์ต Lua→JS: `and→&&`, `or→||`, `not→!`, `nil→undefined`) → compile เป็น `(names,tags)=>boolean` ตอน load
- `card_def` = สูตรตัวอย่างที่การันตีได้เมนูนี้ → ใช้ในฟีเจอร์ 3

## 6. Engine (pure TS, ไม่มี UICONCERN)
```
getIngredientData(slots): { names, tags }       // รวม tag/นับชิ้น
compileTest(expr): (names,tags)=>boolean         // แปลง expression → fn (คุม scope, ห้าม eval มั่ว)
getCandidates(cooker, data): Recipe[]            // filter test → เก็บกลุ่ม priority สูงสุด (fallback wetgoop)
calculateRecipe(cooker, slots): { name, chances }// สุ่มถ่วง weight + คืน % ของแต่ละ candidate
findRecipesByIngredients(partialSlots): Recipe[] // reverse search (ฟีเจอร์ 2)
```

## 7. โครงโปรเจค (proposed)
```
/scripts
  extract.ts        # parse .lua → src/data/*.json (build-time, รันมือ/CI)
  lua/              # ต้นฉบับ .lua ที่ pin ไว้
/src
  /data             # ingredients.json, recipes.json, tuning.json, i18n/
  /engine           # cooking.ts, compileTest.ts, types.ts
  /components       # CookPot, IngredientPicker, ResultReveal, RecipeCard, RecipeBrowser
  /i18n             # th.json, en.json + hook useLocale
  App.tsx, main.tsx
```

## 8. Milestones
- **M0 Data pipeline** — ดึง lua ครบ (+tuning +nonfoods), เขียน extract.ts → JSON, ตรวจ 5 สูตร sample
- **M1 Engine** — port test ครบ, unit test เทียบผลกับ combos ที่รู้คำตอบ (เทียบ dstcraft.com)
- **M2 UI: Cook** — หม้อ 4 ช่อง + picker + ปุ่มปรุง + reveal ผล
- **M3 UI: Suggest** — reverse search + แสดง %
- **M4 UI: Recipe detail + Browser** — หน้ารวมเมนู + detail (card_def/stats)
- **M5 i18n + polish + deploy**

## 9. Open questions / TODO / Gaps
- [x] ดึง `tuning.lua` แปลง `TUNING.*` → ตัวเลขจริง → `scripts/tuning.mjs` (verified)
- [x] ดึง `preparednonfoods.lua` เอา `wetgoop`(อยู่ preparedfoods จริง) + batnosehat/dustmeringue
- [x] รูปไอคอน — ตัดสิน: ใช้จาก wiki ตรงๆ (non-profit)
- [x] phak PM — ตัดสิน: โปรเจคส่วนตัว ไม่ mirror phak
- [ ] ocean fish (`oceanfishdef.lua`) — cooking.lua โหลด dynamic (บรรทัด 118–123) ยังไม่ดึง (v2)
- [ ] แหล่ง i18n ชื่อไทย — เทียบ wiki หรือ strings.po ของเกม (M5)
- [ ] display name ≠ recipe key เช่น key `bonestew` = "Meaty Stew" บน wiki → จัดการชั้น i18n

## 10. Current state (2026-07-18)
### เสร็จ + verified
- [x] **M0 Data pipeline** — `scripts/extract.mjs` (brace-counting parser, Lua→JS test) →
      `src/data/ingredients.json` (124 ตัว) + `src/data/recipes.json` (70 สูตร: 68 base + 2 nonfood)
- [x] **M1 Engine** — `src/engine/cooking.ts` (port GetIngredientValues/GetCandidateRecipes/CalculateRecipe)
      + `scripts/validate.mjs`: **27/27 card_def round-trip ✅, 5/5 spot checks ✅**
- [x] Vite+React+TS scaffold — `npm run build` ผ่าน, dev server เรนเดอร์ + ปรุงจริงในเบราว์เซอร์
      (meat×3+carrot → bonestew, feature 1+2 ทำงาน)
- [x] แก้ bug ระหว่างทาง: inline ingredient list, multi-line/commented test, card_def 3rd item,
      commented-out `seeds` — เก็บใน MEMORY.md

### commands
- `npm run extract`  → regenerate JSON จาก scripts/lua/*.lua
- `npm run validate` → รัน cross-validation harness
- `npm run dev` / `npm run build`

### M2 UI — เสร็จ + verified (ธีมเกม DST, ครบ 3 ฟีเจอร์)
- ธีม DST (ไม้/parchment/chalk) — `src/index.css`
- Components: `IngredientPicker` (grid + ค้นหา, tile สีตามหมวด), `CookPot` (4 ช่อง + ปรุง + reveal),
  `RecipeDetail` (modal: stats + วิธีทำ = card_def หรือ humanizeTest ภาษาไทย), `RecipeBrowser` (70 เมนู)
- `src/format.ts` — prettyName, categoryOf/สี, `humanizeTest` (แปลง test → เงื่อนไขไทย), perishDays
- **Verify (in-browser, desktop):** ใส่ 4 วัตถุดิบ → ปรุงได้ Ratatouille; suggestion 100%;
  detail โชว์ stats+เงื่อนไข; browser 70 เมนู; search กรอง 124→4 (honey). `npm run build` ผ่าน

### M3 — เสร็จ + verified (2026-07-18): ไอคอนเกมจริง + i18n + GA4 + ปรับ UI
- **ไอคอนเกมจริง 185 ไฟล์** จาก dontstarve.wiki.gg (MediaWiki API) → `public/icons/`
  - `scripts/names.mjs` = mapping prefab→ชื่อ EN (validate กับ wiki แล้ว 185/185)
  - `scripts/fetch_icons.mjs` = resolve+download+สร้าง `src/data/names.json` + `icons.json`
  - ชื่อที่เคยเดาผิดแล้วแก้จาก wiki จริง: potatotornado=Fancy Spiralled Tubers,
    frognewton=Figgy Frogwich, dustmeringue=Amberosia, ancientfruit_nightvision=Nightberry,
    refined_dust=Collected Dust, *_cooked ผักฟาร์ม=Roasted xxx
  - pondeel = legacy ไม่มีรูป → letter-chip fallback (`ItemIcon`)
- **i18n TH/EN** — `src/i18n.tsx` (context+localStorage), ปุ่ม 🌐 มุมขวาบน, UI+เงื่อนไขสูตร
  (humanizeTest) สองภาษา; ชื่อไอเทม EN คงที่ (ตามการตัดสินใจ)
- **GA4** — `src/analytics.ts` อ่าน `VITE_GA_ID` (.env.example มีแล้ว; ไม่ใส่ ID = ปิดสนิท)
  events: pageview, `cook` (dish+ingredients), `view_recipe`
- **UI** — หม้อขึ้นบนสุด, filter หมวด 9 หมวด (เนื้อ/ปลา/ผัก/ผลไม้/ไข่/หวาน/นม/มอนสเตอร์/อื่นๆ),
  โภชนาการ ❤️🍗🧠 ใน result/suggestion/browser
- **Verify (in-browser):** filter เนื้อ 124→35, drumstick×2+meat×2 → Meaty Stew (meat 3.0
  ถูกตามเกม) + stats +12/+150/+5, toggle EN เปลี่ยนทั้ง UI+เงื่อนไข, ไม่มี console error,
  build ผ่าน, engine validation ยัง 27/27

### M4 — เสร็จ + verified (2026-07-18): ธีม Cookbook + ปุ่มเคลียร์ค้นหา
- **ธีมเปลี่ยนเป็น parchment cookbook เหมือนในเกม** — กระดาษ+กรอบไม้+tab หนังสือ+ฟอนต์ลายมือ
  (Patrick Hand จาก Google Fonts), tile เป็นช่อง slot สี่เหลี่ยม inset
- **หน้า detail จัดเลย์เอาต์ตามเกม**: กรอบรูปเมนู + วงกลม stat 3 วง + Type/Spoils/Cooking Time
  (label เชิงคุณภาพเหมือนเกม: Slowly/Long ฯลฯ + ค่าจริงในวงเล็บ) + เส้นคั่นหัวข้อสองข้าง
- **SearchBox component** — ปุ่ม ✕ เคลียร์ค่า (โชว์เมื่อมีข้อความ) ใช้ทั้ง picker และ browser
- **Verify (in-browser):** ค้น "berr"→8 รายการ+ปุ่ม ✕ โชว์ → กด ✕ → กลับ 124+ปุ่มหาย;
  หน้า Taffy ตรงกับ screenshot เกม (Goodies/Slowly/Long, วงกลม −3/+25/+15, honey×3+berries×1);
  build ผ่าน
- หมายเหตุ verify: JS probe อ่าน DOM ทันทีหลัง click อาจได้ค่าเก่า (React 18 batch) —
  ใช้ screenshot เป็นตัวตัดสิน
- **tile วัตถุดิบ = รูปล้วนในช่องจัตุรัส** (ไม่มีข้อความ, ชื่อ+หมวดอยู่ใน tooltip) —
  verified: กริดจัตุรัส, คลิกใส่หม้อได้, tooltip "Birchnut — Other"
- **ช่องหม้อ = จัตุรัส 4 ช่องเรียงแนวนอน** (แทนหม้อกลม 2×2) สไตล์เดียวกับ tile —
  verified: meat×2+berries+carrot → Meatballs 100% → ปรุงได้ผลถูกต้อง
- **stat badge = รูป HUD meter จริงของเกม** (Health/Hunger/Sanity Meter จาก wiki, อยู่ใน
  UI_NAMES ของ fetch_icons.mjs → ui_health/ui_hunger/ui_sanity ใน icons.json) + ป้ายค่า
  parchment ซ้อนใต้ (z-index กันรูปทับ) + เส้นประดับใต้ชื่อ + section "Side Effects"
  (จาก stats.temperature: ติดลบ=Cools the body, บวก=Warms, ไม่มี=None) —
  verified: Ice Cream = ❤️0 / 🍗25 / 🧠50 + "Cools the body" หน้าตาตรง mod "Always on Status"
- **โหมดแนะนำอัตโนมัติ (ไม่มีปุ่ม Cook/Clear แล้ว)** — แนะนำสดตั้งแต่ใส่ชิ้นแรก:
  - หม้อเต็ม 4 → กลุ่มผู้ชนะจริง + % (engine.chances เหมือนเดิม)
  - หม้อไม่เต็ม → `engine.reachable()`: enumerate การเติมช่องว่างด้วย filler multiset แล้วรวม
    เมนูที่ "ชนะได้จริง" (ไม่ใช่แค่ test ผ่าน) — filler เลือกตามช่องว่าง (`fillersFor`):
    3 ว่าง=CORE 24 ตัว, 2 ว่าง=MID ~50 ตัว(ชื่อที่ test อ้างทั้งหมด), 1 ว่าง=ทั้ง 124
  - เอาวัตถุดิบออก = คลิกที่ช่อง (เหมือนเดิม), ตัด wetgoop ออกจากโหมด reachable
- ~~badge ค่ารวมในหม้อ~~ — เคยมี chip ข้อความ tag รวม แต่**ถอดออกแล้ว**ตามคำขอ
  (TAG_SHORT/TAG_COLOR ยัง export ไว้ใน format.ts เผื่อใช้ภายหลัง)
- **ถอดข้อความ UI ออก (คำขอ 2026-07-18):** title/subtitle บนสุด, หัวข้อ "Possible dishes
  (chance)", hint "Fill all 4 slots…", chip ประเภทวัตถุดิบใต้หม้อ — เหลือปุ่มภาษา+tab+เนื้อหา
  (i18n key possible/fillHint/inPot/subtitle ไม่ถูกใช้แล้วแต่คงไว้)
- **fallback รูปที่ดึงไม่ได้ (ItemIcon):** ถ้าเป็น **ingredient** ให้แสดง "ชื่อวัตถุดิบ" ในกรอบแทนรูป
  (ใน IngredientPicker / ช่องหม้อ / card_def ใน RecipeDetail); ส่วนกรณีอื่นยังใช้ placeholder "?"
  ตามเดิม — verified: typecheck ✅, validate 27/27 ✅, build ✅
- **ล็อกไม่ให้เลื่อนจอแนวตั้ง:** ตั้ง `html/body/#root` เป็น `overflow: hidden` และปรับ `.app/.content/.layout`
  ให้เป็น fixed viewport + scroll เฉพาะภายใน panel/list (suggestion/grid/browser list) —
  verified: build ✅, หน้าไม่เกิด page vertical scrollbar
- **เพิ่ม Contact us ข้างปุ่มภาษา:** ปุ่ม `✉ Contact us` ใน header เปิด modal แล้วดึงข้อมูลจาก
  `https://api.github.com/users/JitrudeeDongdee` แสดง avatar + profile/contact fields
  (GitHub, name, bio, location, company, email, website, X) พร้อม loading/error state — verified: typecheck ✅, build ✅
- **Contact us แสดงอีเมล+LinkedIn แบบกำหนดตรง:** เพิ่ม `publicEmail` และ `linkedInUrl` ใน
  `ContactUsModal` และส่งค่าจาก `App.tsx` (`jitrudee9723@gmail.com`,
  `https://www.linkedin.com/in/jitreudee-doungdee-a034972a6/`) เพื่อให้แสดงได้แน่นอนแม้ GitHub API
  คืน `email=null` — verified: build ✅
- **Contact us เพิ่มข้อความใต้รูปแบบสองภาษา + ป้ายสไตล์เกม:** เพิ่ม i18n key `contactProjectNote`
  (TH/EN) และแสดงใต้ avatar ใน `ContactUsModal` ด้วยคลาส `.contact-note-badge` (พื้น parchment,
  กรอบเข้ม, เงา inset) ให้ฟีลป้ายในเกม — verified: build ✅
- **ปุ่ม Contact us ใน header เป็นไอคอนล้วน:** ปรับปุ่มจาก `✉ Contact us` ให้เหลือ `✉` อย่างเดียว
  ตามคำขอ โดยคง `title`/`aria-label` เป็นข้อความแปลภาษาเพื่อ accessibility — verified: build ✅
- **Recipe detail ปรับการ์ดวัตถุดิบ + Forbidden section:** ใน `How to make` และ rule chip ที่เป็น
  ingredient จริง เปลี่ยนมาใช้ `ItemIcon` แบบ `variant="square"` เป็นคอมโพเนนต์กลาง ทำให้ถ้ามีรูป
  จะแสดงเป็นช่องสี่เหลี่ยมจัตุรัสโดยไม่โชว์ชื่อ; ถ้าไม่มีรูปค่อย fallback เป็นชื่อในช่องเดิม.
  ส่วนหัวข้อ Forbidden เปลี่ยนจาก `🚫 Forbidden` เป็นเส้นคั่นพร้อมข้อความกลาง (`Divider`) —
  verified: build ✅
- **Recipe detail Required section ใช้ divider:** เปลี่ยนหัวข้อ `✅ Required` ให้เป็นเส้นคั่นแนวนอน
  พร้อมข้อความกลาง (`Divider`) เพื่อให้สไตล์ตรงกับ How to make / Forbidden — verified: build ✅
- **How to make มีข้อความสรุป tag ของสูตรตัวอย่าง:** เหนือการ์ดวัตถุดิบของ `card_def` แสดงสรุปแบบข้อความ
  จาก tag รวมของสูตรตัวอย่าง เช่น `Meat 2, Sweet 1` โดยคำนวณผ่าน `engine.getIngredientData`; การ์ด
  วัตถุดิบด้านล่างยังเป็นสี่เหลี่ยมไอคอนล้วน ไม่แสดงข้อความข้างการ์ด — verified: build ✅
- **ItemIcon square เพิ่มกรอบดำหนา:** ปรับ `.item-icon-square` จากกรอบเดิมเป็น `4px solid #000`
  เพื่อให้ช่องไอคอนสี่เหลี่ยมเด่นขึ้นใน Recipe detail / จุดที่ reuse variant นี้ — verified: build ✅
- **ItemIcon square art เพิ่ม border ด้านใน:** เพิ่มคลาส `item-icon-square-art` ให้ `<img>` ภายใน
  `ItemIcon` แบบ `variant="square"` และใส่ `border: 2px solid #000` + `border-radius: 6px`
  เพื่อให้ตัวรูปด้านในมีกรอบดำอีกชั้น — verified: build ✅
- **ItemIcon ใช้ square เป็นค่า default:** เปลี่ยน `ItemIcon` ให้ `variant="square"` เป็นค่าเริ่มต้น
  และคืน `className="item-icon-square"` ให้ wrapper ทำให้หน้าที่เรียก `ItemIcon` โดยไม่ระบุ variant
  (เช่น IngredientPicker/CookPot/RecipeBrowser) ได้กรอบ border ตาม default ใหม่ — verified: build ✅
- **ItemIcon ตัดกรอบซ้อนชั้นในออก:** หลังเปลี่ยน square เป็น default พบกรอบซ้อนสองชั้น
  (`.item-icon-square` + border ที่ `<img>` ด้านใน) จึงเอา border ด้านในออกให้เหลือกรอบนอกชั้นเดียว —
  verified: build ✅
- **Recipe detail Required / Forbidden เป็นไอคอนล้วน:** ปรับ `RuleCard` ให้สอง section นี้ซ่อนไม่ให้แสดง
  ข้อความของ tag/ingredient เหลือเฉพาะไอคอนในกรอบ; ส่วน `One of these` ยังแสดงข้อความเหมือนเดิม —
  verified: build ✅
- **Recipe detail ซ่อน Side Effects ถ้าไม่มีผลจริง:** แสดง section `Side Effects` เฉพาะเมื่อ
  `temperature` ทำให้เกิดผลลัพธ์จริง (ไม่ใช่ `None/ไม่มี`) — verified: build ✅
- **Example cook แสดงได้หลายแบบและไม่มีลูกศร:** จากเดิมโชว์ตัวอย่างเดียวพร้อมลูกศร เปลี่ยนเป็น
  รายการคอมโบตัวอย่างสูงสุด 6 แถว โดยเริ่มจาก `card_def` แล้วลองแทนวัตถุดิบใกล้เคียงที่ยังปรุงเมนูเดิม
  ได้จริงผ่าน `engine.getCandidates`; ตัดลูกศรและผลลัพธ์ท้ายแถวออก — verified: build ✅
- **ItemIcon variants ชัดเป็น 3 แบบ:** `plain` = มีพื้นหลังแต่ไม่มีกรอบ, `square` = มีพื้นหลังและ
  กรอบดำ, `bare` = ไม่มีพื้นหลัง/ไม่มีกรอบ. ปรับจุดที่ไม่ควรมีพื้นหลังซ้อน (เช่น IngredientPicker,
  RecipeBrowser, บางส่วนใน CookPot, รูปหลักใน RecipeDetail) ให้ใช้ `bare` ชัดเจน — verified: build ✅
- **ItemIcon เพิ่ม variant `forbidden`:** เพิ่มกรอบสีแดงและเส้นคาดทแยงเป็นลุคห้ามใช้ที่ตัว
  `ItemIcon` โดยตรง และผูก `RuleCard` ฝั่ง Forbidden ให้ใช้ variant นี้แทนการวาดเส้นทับจาก wrapper —
  verified: build ✅
- **ItemIcon forbidden ปรับเป็นโทนดำ + เส้นคาดกลับทิศ:** ปรับ `variant="forbidden"` ให้ใช้กรอบดำ
  แบบเดียวกับไอคอนปกติ และให้เส้นคาดทแยงพาดจากมุมขวาบนไปมุมซ้ายล่างจริง
  (`translate(-50%, -50%) rotate(-45deg)` + ขยายความกว้างเส้น) —
  verified: build ✅
- **Required Ingredients parser แม่นขึ้น:** ปรับ `RecipeDetail` ให้ parse เงื่อนไข `recipe.test`
  ได้ครอบคลุมขึ้นสำหรับ `names.x > 1`, `tags.x > 1`, รูปแบบรวมชื่อหลาย variant ที่มีตัวเปรียบเทียบ
  และตัด required tag/name ซ้ำที่เกิดจากเงื่อนไขคู่กัน เช่น `tags.veggie` + `tags.veggie >= 0.5`
  ให้เหลือไอคอนเดียวต่อชนิด — verified: build ✅
- **แยก RecipeDetail เป็นไฟล์ย่อย:** ลดความยาว `src/components/RecipeDetail.tsx` โดยย้าย divider,
  rule card, example cook renderer, และ utility/parsing logic ไปไว้ใน
  `src/components/recipe-detail/` เพื่อให้อ่าน/แก้ง่ายขึ้นโดยไม่เปลี่ยนพฤติกรรม — verified: build ✅
- **RecipeBrowser จำกัดความกว้างบน desktop:** เพิ่มคลาส `recipe-browser-panel` ให้แท็บเมนูทั้งหมด
  และตั้งความกว้าง `min(100%, 760px)` พร้อมจัดกึ่งกลาง เพื่อไม่ให้บรรทัดอ่านยาวเต็มจอบน desktop —
  verified: build ✅
- **Example cook หลากหลายขึ้นและรวมดิบ/สุกเป็นตัวเดียว:** ปรับ utility ให้ dedupe ตัวอย่างด้วยชื่อฐาน
  (`_cooked`/`_dried` นับเป็น ingredient เดียวกันใน example key) และเวลา render จะแสดงชื่อ/ไอคอนจาก
  base ingredient เดียวกัน ทำให้ตัวอย่างไม่ซ้ำกันเพียงเพราะต่างกันแค่ดิบ/สุก — verified: build ✅
- **Tab เมนูทั้งหมด (tab 2) เต็มจอ:** เมื่อเข้าแท็บ browser ให้ `.app` ขยายเต็มความกว้าง viewport
  (`.app.app-browser { max-width: none; width: 100%; }`) และลิสต์เมนูใช้ความสูงที่เหลือทั้งหมด
  (`.recipe-browser-list` แบบ flex+overflow) — verified: typecheck ✅, build ✅
- **Recipe detail ปรับ “วิธีทำ” เป็นภาพนำ:** เอา section Type/Spoils/Cooking Time ออก,
  เพิ่ม visual rule cards แยก Required / One-of / Forbidden (Forbidden มีขีดทับบนไอคอน+ข้อความ)
  โดย parse จาก `recipe.test` + ใช้ไอคอนแทน tag สำคัญ และคง card_def แบบรูปเป็นตัวอย่างสูตร —
  verified: typecheck ✅, validate 27/27 ✅, build ✅
- **หน้า Pot เพิ่มข้อมูลในหม้อ + status master:** ใต้ช่องหม้อแสดง
  1) รายการวัตถุดิบที่ใส่จริงพร้อมจำนวน (`Ingredients in pot`)
  2) ค่า tag รวม (`Master status`) จาก `engine.getIngredientData` เช่น Meat/Fruit/Monster ...
  เพื่อให้อ่านเงื่อนไขสูตรง่ายขึ้นแบบเรียลไทม์ — verified: typecheck ✅, validate 27/27 ✅, build ✅
- **ปรับหน้าตา pot meta ให้เหมือนเมนูแนะนำ:** รายการ `Ingredients in pot` และ `Master status`
  แสดงเป็นแถวสไตล์เดียวกับ `.suggest-item` (ซ้ายไอคอน+ชื่อ, ขวาค่าจำนวน) แทน chip เดิม —
  verified: typecheck ✅, build ✅
- **ย้ายข้อมูลในหม้อลง Suggest list โดยตรง:** แสดง section `Ingredients in pot` และ `Master status`
  ไว้ส่วนบนของ `suggest-list` ก่อนรายการเมนูที่เป็นไปได้ (ตามคำขอ) แทนการแสดงเป็นบล็อกแยก —
  verified: typecheck ✅, build ✅
- **Ingredients in pot ใช้ StatMeters:** เปลี่ยนค่าท้ายแถวจาก `×จำนวน` เป็น
  ค่า `health/hunger/sanity` ของ “วัตถุดิบรายชิ้น” ด้วย `StatMeters.tsx` (ถ้ามีข้อมูล),
  และคง `×จำนวน` ไว้เฉพาะกรณีซ้ำ. เพิ่ม pipeline เบื้องต้น `scripts/ingredient_stats.mjs`
  อ่านไฟล์ prefab โดยตรงจาก game scripts แล้วสร้าง `src/data/ingredient_stats.json`
  (**coverage ปัจจุบัน 26/124; ที่เหลือแสดง `—` ชั่วคราว**) —
  verified: typecheck ✅, validate 27/27 ✅, build ✅
- **Recipe detail มีตัวอย่างการ cook:** หาก recipe มี `card_def` ให้แสดงบล็อก
  `Example cook` เป็น 4 วัตถุดิบ → ผลลัพธ์เมนู เพื่อเห็นภาพการใส่ลงหม้อจริงนอกเหนือจาก rule cards —
  verified: typecheck ✅, validate 27/27 ✅, build ✅
- **Kitchen layout ตอนหม้อว่าง:** ถ้ายังไม่มีวัตถุดิบในหม้อ (`filled.length === 0`)
  ให้ `IngredientPicker` ขยายกินพื้นที่หลัก และ panel หม้อย่อลงเหลือเฉพาะส่วนที่จำเป็น เพื่อลดพื้นที่ว่าง —
  verified: typecheck ✅, build ✅
- **กรอบวัตถุดิบใน IngredientPicker เป็นขอบนอก:** ย้ายกรอบดำจาก `ItemIcon` ด้านในไปไว้ที่
  `button.tile` โดยตรง และตัดกรอบชั้นในของ `.item-icon-square` ออกเฉพาะในกริดวัตถุดิบ;
  hover ใช้ `outline` สีทองที่ขอบนอกแทน — verified: typecheck ✅, build ✅
- **CookPot / RecipeBrowser คุม border ได้ด้วย prop:** เพิ่ม `showBorder?: boolean`
  ให้ทั้งสองคอมโพเนนต์ และเพิ่มคลาส `.panel-borderless` เพื่อปิดกรอบ/outline/shadow เฉพาะจุดที่เรียกใช้;
  ปัจจุบัน `App.tsx` ส่ง `showBorder={false}` ให้ทั้ง `CookPot` และ `RecipeBrowser`; และโหมดนี้
  ปิด border ของ element ย่อยในคอมโพเนนต์ด้วย (slot / suggest row / recipe row / icon frame) —
  ยังไม่ rerun verify ตาม preference ล่าสุด: ค่อยตรวจตอน push
- **CookPot แบบ no-border คงพื้นหลัง/กรอบเดิม:** ปรับ `CookPot` ให้ใช้คลาส `panel-no-border`
  เมื่อ `showBorder={false}` ซึ่งซ่อนเส้น border ด้วย `border-color: transparent` แต่ยังคง background,
  outline, spacing และ shadow เดิมไว้; ส่วน `RecipeBrowser` ยังใช้ `panel-borderless` แบบโล่งเต็ม —
  ยังไม่ rerun verify ตาม preference ล่าสุด: ค่อยตรวจตอน push
- **SEO พื้นฐานเพิ่มแล้ว:** `index.html` มี title + meta description + robots meta + canonical +
  OG/Twitter text meta, หน้า app มี `h1` แบบ `sr-only`, และเพิ่ม `public/robots.txt` /
  `public/sitemap.xml` สำหรับ URL `https://jitrudeedongdee.github.io/Don-t-starve-together-pot/` —
  ยังไม่ rerun verify ตาม preference ล่าสุด: ค่อยตรวจตอน push
- **Vite รองรับ GitHub Pages path แล้ว:** ตั้ง `base: '/Don-t-starve-together-pot/'` ใน
  `vite.config.ts` เพื่อให้ asset/build path ตรงกับ subpath ของ GitHub Pages repo นี้ —
  ยังไม่ rerun verify ตาม preference ล่าสุด: ค่อยตรวจตอน push
- **GitHub Pages auto deploy workflow เพิ่มแล้ว:** สร้าง `.github/workflows/deploy.yml`
  ให้ build ด้วย `npm ci` + `npm run build` แล้ว deploy ไป Pages เมื่อมี push เข้า `main`
  (และรันมือได้ผ่าน `workflow_dispatch`) — ยังไม่ rerun verify ตาม preference ล่าสุด:
  ค่อยตรวจตอน push
- **จัดหัว UI ประหยัดพื้นที่ (คำขอ 2026-07-18):** ถอด h2 "🍲 Crock Pot" + "🥕 Ingredients"
  ออก, รวม tab (ชิดซ้าย) + ปุ่มภาษา (ชิดขวา) ไว้แถวเดียว (`.app-header` flex space-between) —
  verified screenshot. RecipeBrowser ยังคง h2 "📖 All Recipes (N)" (ไม่ได้ถูกขอให้เอาออก)
- **StatMeters component กลาง** (`src/components/StatMeters.tsx`) — ใช้รูป HUD meter จริง
  ทุกที่ แทน emoji ❤️🍗🧠 เดิม. 2 ขนาด: `lg` (badge ใหญ่+ป้ายค่า, ใน RecipeDetail),
  `sm` (meter เล็ก+ค่า inline, ใน CookPot suggestion + RecipeBrowser).
  รวมโค้ด meter ที่เคยกระจาย 3 ที่มาไว้จุดเดียว (ลบ StatBadge/MiniStats/inline emoji) —
  verified: ลิสต์ใช้ meter เล็ก, detail Fig-Stuffed Trunk = badge 60/150/15, build ผ่าน
- verified: 1 meat → chip "Meat 1" + แนะนำ 25 เมนู (Surf'n'Turf, Ceviche, Unagi…) + hint;
  meat×2+berries+carrot → chips Meat 2/Veggie 1/Fruit 0.5 + Meatballs 100%;
  reachable(1 ชิ้น) ~73ms; validate 27/27 ยังผ่าน

### M5 — แก้บั๊ก RecipeRuleCard แสดงเงื่อนไขผิด (2026-07-18)
**อาการ:** Dragonpie โชว์ "How to make: Fruit 2, Veggie 2" และไม่มี Required เลย ทั้งที่สูตรจริง
บังคับ Dragon Fruit + ห้ามเนื้อ.

**root cause 3 จุด** (ทั้งหมดอยู่ในชั้นแสดงผล ไม่ใช่ engine — engine ถูกมาตลอด):
1. `splitTopLevel(andPart,"||")` ไม่ strip วงเล็บก่อน → `(names.dragonfruit || ...)` ไม่ถูก split,
   parseAtom คืน null, clause ถูก `continue` ทิ้งเงียบๆ → **กระทบ 35/70 สูตร**
2. `stripOuterParens` เช็คแค่จำนวนวงเล็บสมดุล → `(A) && (B)` โดนตัดวงเล็บนอกผิด ทำให้ depth เพี้ยน
   → 2 กลุ่ม OR ยุบเป็นกลุ่มเดียว (unagi โชว์ "cutlichen/kelp/eel/pondeel" รวมกัน ซึ่งผิด)
3. `howToSummary` derive จาก `card_def` (ตัวอย่าง combo) ไม่ใช่จาก `recipe.test` → บรรยายเงื่อนไขผิด

**แก้:**
- แยก parser เป็นโมดูล pure `src/components/recipe-detail/ruleParser.ts` (ไม่ import app/data
  เพื่อให้เทสด้วย node ตรงๆ ได้) — เดิน expression แบบ recursive, strip วงเล็บเฉพาะเมื่อวงเล็บแรก
  คู่กับตัวสุดท้ายจริง, รองรับ compound OR member เช่น `((tags.veggie && >=0.5) || tags.fruit)`
- RuleChip เก็บ `min` / `minExclusive` (`>` vs `>=`) / `max` → การ์ดโชว์ `≥0.5`, `>1`, `≤1` ได้ถูก
  (เดิม `drumstick > 1` แสดงเป็น `≥1` ซึ่งน้อยกว่าจริง)
- clause แบบ `(!tags.monster || tags.monster <= 1)` = เพดาน ไม่ใช่ข้อบังคับ → ไม่ขึ้น Required
- `howToSummary` อ่านจาก `recipe.test` แทน card_def
- เพิ่ม `scripts/validate_rules.mjs` (`npm run validate-rules`) เทียบ chip ที่ได้กับ `names.*`
  ในสูตรจริงทุกตัว กัน regress

**Verify:** `validate-rules` → 70/70 ไม่มี clause หาย; UI: Dragonpie = Required "Dragon Fruit"
+ Forbidden meat + How to make "Dragon Fruit"; Unagi = 2 กลุ่มแยก [Lichen/Kelp] [Eel/Pondeel];
engine validation ยัง 27/27; build ผ่าน

### M6 — UX: ความกว้าง browser, tab เท่ากัน, suggestion เรียงตาม Required (2026-07-18)
**1. RecipeBrowser ยืดเต็มจอ** — `.app.app-browser { max-width: none }` ทำให้แถวกว้าง ~1900px
ชื่อซ้ายสุด/สถานะขวาสุด ต้องกวาดสายตาไกล.
→ แก้: cap `max-width: 860px` **คงไว้ 1 คอลัมน์** (ลองทำ grid หลายคอลัมน์แล้ว แต่ผู้ใช้เลือก 1 คอลัมน์)
→ verified @1800px: appWidth 860, rowWidth **786px** (เดิม ~1900), columns = 1

**2. tab กว้างเท่ากันเสมอ** — ใช้ **grid** ไม่ใช่ flex:
`.tabs { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(8.5rem, 1fr) }`
เหตุผล: auto column ทุกคอลัมน์ใช้ sizing function เดียวกัน → กว้างเท่ากันเสมอ. ถ้าใช้
`flex: 1 1 0` + `min-width` label ที่ยาวเกิน floor จะดันเฉพาะแท็บตัวเอง แล้วไม่เท่ากันอีก
→ verified: TH 136/136, EN 136/136 และ **stress test label ยาว 34 ตัวอักษร → 244/244**
(แบบ flex เดิมจะได้ 136/244)

**3. suggestion เรียงเมนูที่ Required ตรงกับของในหม้อขึ้นก่อน**
- ปัญหา: `engine.reachable()` เรียงตาม priority ของเกม → เมนูที่ "บังคับ" ของในหม้อจริงๆ จมอยู่ล่าง
- เพิ่ม `src/engine/rankSuggestions.ts` (pure, รันด้วย node ได้): นับว่าหม้อ satisfy
  "หน่วยความต้องการที่เป็นชื่อไอเทม" ของสูตรกี่อัน (oneOf group นับเป็น 1 หน่วย เข้าเงื่อนไขถ้ามีสักตัว)
  แล้วเรียง hits ↓ → missing ↑ → priority ↓ → ชื่อ
- **Verified:**
  | ในหม้อ | เดิม (5 อันดับแรก) | ใหม่ |
  |---|---|---|
  | honey | leafymeatsouffle, surfnturf… | **honeyham, honeynuggets**, powcake… |
  | dragonfruit | leafymeatsouffle, surfnturf… | **dragonpie**, surfnturf… |
  | butterflywings | leafymeatsouffle… | **butterflymuffin**… |
  | twigs+meat | surfnturf, leafloaf… | **fishsticks, kabobs**… |
  ยืนยันใน UI: ใส่ Honey → top5 = Honey Ham, Honey Nuggets, Powdercake, Ice Cream, Monster Lasagna

### M7 — ลบ ingredient variant ที่ไม่มีอยู่จริงในเกม (2026-07-18)
**อาการ:** IngredientPicker มี "Honey (Cooked)" ฯลฯ ซึ่งเกมไม่มีไอเทมนี้ (ชื่อ fallback เพราะ
ไม่มีใน names.json)

**root cause:** extractor ตีความ flag `cancook`/`candry` ของ `AddIngredientValues` ใน cooking.lua
ว่า "มี variant นี้เป็นไอเทมจริง" แต่ flag พวกนี้แค่บอกว่า **ตาราง cooking tag ควรมี row นั้น**
ไม่ได้แปลว่าไอเทมมีอยู่ — Klei ตั้ง flag ไว้เผื่อ ทำให้เราสร้างวัตถุดิบผีขึ้นมา 6 ตัว

**ตรวจกับ prefab จริง (`prefabs/*.lua`) — มี positive control (meats/veggies เจอ cookable จริง):**
| variant ผี | หลักฐาน |
|---|---|
| honey_cooked | `honey.lua` ไม่มี component `cookable` |
| honeycomb_cooked | `honeycomb.lua` ไม่มี `cookable` |
| royal_jelly_cooked | `royal_jelly.lua` ไม่มี `cookable` |
| cutlichen_cooked | `cutlichen.lua` ไม่มี `cookable` |
| pondeel_cooked | `pondfish.lua`: pondeel ปรุงได้ **`eel_cooked`** |
| batnose_dried | `meats.lua`: batnose ตากได้ **`smallmeat_dried`**; register แค่ batnose/batnose_cooked |

**แก้:** `PHANTOM_VARIANTS` ใน `scripts/extract.mjs` (พร้อม comment อ้างหลักฐานรายตัว) กรองตอน
generate → แก้ที่ต้นทางข้อมูล ไม่ใช่ซ่อนที่ UI

**Verify:** ไม่มีสูตรไหนอ้างถึงทั้ง 6 ตัว (เช็คก่อนลบ) · ingredients 124 → **118** · ของจริงอยู่ครบ
(honey/royal_jelly/cutlichen/pondeel/batnose/batnose_cooked/smallmeat_dried/eel_cooked) ·
UI: ค้น "honey" ได้ 2 รายการ (ไม่มี Cooked แล้ว), ไม่เหลือ tile ที่ชื่อ fallback "(Cooked)/(Dried)" ·
engine 27/27 · rules 70/70 · build ผ่าน

### M8 — Example cook: precompute + ตรวจ phantom ซ้ำ (2026-07-18)
**A. honey_cooked ตกค้าง** — `src/data/ingredient_stats.json` ถูก generate ก่อนลบ phantom เลยยังมี
124 keys และหลุดเข้า bundle. แก้: รัน `npm run ingredient-stats` ใหม่ →
ตรวจครบทุกไฟล์แล้ว: ingredients/ingredient_stats **118 keys**, names/icons 190, card_def, bundle
— ไม่เหลือ phantom สักตัว ✓  *(บทเรียน: ลบข้อมูลต้นทางแล้วต้อง regenerate ไฟล์ที่ derive ทั้งหมด)*

**B. Example cook**
- ปัญหาเดิม: **43/70 เมนูไม่มี card_def → ไม่แสดงตัวอย่างเลย**; ที่มีก็ค้นตอน runtime
- วัดแล้วพบว่า "แสดงทุกสูตรที่เป็นไปได้" ไม่เวิร์ค: combo ทั้งหมด 1,088,430 แบบ,
  มัธยฐาน **2,677 combo/เมนู** (meatballs 318,630) → ตกลงเอา **3 ตัวอย่าง**
- ย้ายไป precompute ตอน build: `scripts/cook_examples.mjs` → `src/data/cook_examples.json`
  (runtime ค้นไม่ไหว — shroomcake มี combo ที่ใช้ได้ **แค่ 1 แบบ** จาก 1.09M)
- **raw/cooked ยุบเป็นแบบเดียว**: ไล่เฉพาะตัวแทน 1 ตัวต่อ base (118 → 70 ตัว)
  + มี guard ว่าไม่มีสูตรไหนบังคับเฉพาะรูปสุก/แห้ง
- **การเลือกตัวอย่าง** ลองมา 3 แบบ: (1) วัตถุดิบต่างกันน้อยสุด → ได้ "บาร์นาเคิล×4" ไร้ประโยชน์
  (2) versatility → ได้ "Birchnut+Nightberry+Asparagus" ซ้ำทุกเมนู
  (3) **ให้น้ำหนักตามวัตถุดิบที่เกมใช้ใน card_def เอง** (Honey/Twigs/Berries/Potato/Meat/Morsel…)
  → ได้ผลตรงกับที่ผู้เล่นทำจริง: Honey Ham = Honey×2+Meat×2, Meaty Stew = Meat×2+Morsel×2
- card_def ของเกม (ถ้ามี) ถูกวางเป็นตัวอย่างแรกเสมอ
- เพิ่ม `scripts/validate_examples.mjs` — ตรวจว่าทุก combo ปรุงออกมาเป็นเมนูนั้นจริง,
  ไม่มีวัตถุดิบผี, ไม่มี raw/cooked ซ้ำ

**Verify:** examples ครบ **70/70** เมนู · 208 combo ผ่านหมด · engine 27/27 · rules 70/70 · build ผ่าน
**commands ใหม่:** `npm run cook-examples`, `npm run validate-examples`

### ค้างไว้ (ถัดไป)
- ใส่ GA4 Measurement ID จริงตอน deploy (สร้าง property → ใส่ `VITE_GA_ID` ใน .env.local/hosting)
- deploy จริง (Netlify/Vercel/GitHub Pages) — ยังไม่เลือก
- ocean fish (v2), portablecookpot/Warly + spiced (v2), แปลชื่อไทย (ถ้าเปลี่ยนใจ)
- แยก unit test เป็น vitest (ตอนนี้ verify ด้วย scripts/validate.mjs)
- **แผนฟีเจอร์ภาคเกม (ยังไม่ implement):** เพิ่มฟิลด์ `games` ต่อ recipe เช่น
  `["dst","ds","sw"]` ผ่าน data pipeline ที่อ่านจากหลายแหล่ง (DST scripts + DS/SW recipe tables),
  จากนั้นแสดง badge ใน detail ว่าเมนูนี้ทำได้ในภาคไหน; ต้องออกแบบ mapping key ที่ชื่อไม่ตรงกัน
  ระหว่างเกมก่อน (phase แยกต่างหาก)
