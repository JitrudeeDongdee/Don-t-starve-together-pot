# MEMORY — DST Cook Pot Simulator

บันทึกความรู้/บทเรียนเฉพาะโปรเจคนี้ (per-project เท่านั้น). state หลักอยู่ใน spec.md

## Key facts
- กลไก match ของเกม = tag + priority + weight (ไม่ใช่ mapping ตายตัว) — ดู spec.md ข้อ 4
- `recipe.test` ในเกมเป็นฟังก์ชัน Lua → โปรเจคนี้พอร์ตเป็น JS predicate (expression string → compile)
- ingredient variant `_cooked`/`_dried` เกมสร้างอัตโนมัติจาก flag cancook/candry (+tag precook/dried)
- ไฟล์ต้นฉบับ mirror: taichunmin/dont-starve-together-game-scripts (preparedfoods, cooking, preparedfoods_warly)
- fallback เมื่อไม่มีสูตรผ่าน = wetgoop (อยู่ preparednonfoods.lua)

## Lessons (what happened / root cause / correct behavior)
- **นับ recipe ผิดด้วย grep** — `grep "^\t...="` ได้ 45 แต่จริงมี 68. root cause: recipe บางตัวใน
  preparedfoods.lua ใช้ space indent ไม่ใช่ tab. correct: อย่านับด้วย indent-based regex ใช้ brace-counting parser.
- **regex block boundary เปราะ** — non-greedy `{...}` ตัดผิดที่ card_def / ไปจับ table ครอบ.
  correct: parse ด้วยการนับวงเล็บสมดุล (matchBraces) + เดินเฉพาะลูกตรงของ outer table.
- **AddIngredientValues arg แรกใช้ `[^,]`** → พังกับ inline list หลายชื่อ `{"honey","honeycomb"}`.
  correct: จับเป็น `(\{[^}]*\}|\w+)`.
- **ต้อง strip Lua comment `--` ก่อน parse** ทั้ง test body (มี `--names.moon_cap`) และ ingredient
  (บรรทัด `-- AddIngredientValues({"seeds"}...)` ที่ถูก comment ไว้ ห้ามนับเป็นวัตถุดิบจริง).
- **verify ค่าคงที่เสมอ** — เดา PERISH_SLOW=15000 ผิด, จริง = 15×480 = 7200 (game-seconds).
- **recipe key ≠ display name** — key `bonestew` คือ "Meaty Stew". จัดการที่ชั้น names.json ไม่ใช่แก้ engine.
- **หา wiki file name อย่าเดาจากความจำ** — เดาผิด 10/185 (เช่น dustmeringue จริงๆ ชื่อ "Amberosia",
  potatotornado = "Fancy Spiralled Tubers"). correct: validate ทุกชื่อผ่าน MediaWiki API
  (`action=query&prop=imageinfo`) แล้วค้นชื่อจริงด้วย `list=search` กับ spawn code — หน้า wiki ระบุ spawnCode.
- **form_input/type ของ browser automation ไม่ trigger React onChange** — ค่าไม่เข้า state.
  correct: ใช้ native value setter + `dispatchEvent(new Event("input",{bubbles:true}))` ผ่าน javascript_tool.
- **อ่าน DOM ทันทีหลัง .click() ใน javascript_tool ได้ค่าเก่า** — React 18 batch render ไม่ทัน.
  correct: verify ผลด้วย screenshot แยก call ไม่ใช่อ่าน DOM ใน call เดียวกับ click.
- **parser เงื่อนไขสูตร drop clause เงียบๆ 35/70 สูตร** (เช่น Dragonpie ไม่โชว์ว่าบังคับแก้วมังกร).
  root cause 2 ชั้น: (1) `splitTopLevel(part,"||")` ถูกเรียกโดยไม่ strip วงเล็บก่อน → `(A||B)` ไม่ถูก
  split แล้ว parseAtom คืน null → clause หายไปเฉยๆ (2) `stripOuterParens` เช็คแค่ "จำนวนวงเล็บเท่ากัน"
  ทำให้ `(A) && (B)` ถูกตัดวงเล็บนอกผิด → depth เพี้ยน → 2 กลุ่ม OR ถูกยุบรวมเป็นกลุ่มเดียว (unagi).
  correct: parser ต้อง (ก) เดิน expression แบบ recursive ไม่ใช่ 1 ชั้น (ข) strip วงเล็บเฉพาะเมื่อ
  วงเล็บตัวแรก "คู่กับ" ตัวสุดท้ายจริง (ค) มี `scripts/validate_rules.mjs` เทียบ chip กับ names.* ใน
  test ทุกสูตรกัน regress — **อย่าเชื่อ UI ว่าถูกเพราะมันแสดงผลได้ ต้องมี test เทียบกับ source จริง**
- **อย่า derive "เงื่อนไขสูตร" จาก card_def** — card_def คือ *ตัวอย่าง* combo เดียว การเอา tag รวมของมัน
  มาโชว์ใต้หัวข้อ "How to make" ทำให้กลายเป็นข้อมูลผิด (Dragonpie ขึ้น "Fruit 2, Veggie 2" ทั้งที่จริง
  บังคับแค่แก้วมังกร + ห้ามเนื้อ). correct: อ่านจาก `recipe.test` เท่านั้น.
- **flag ในไฟล์เกมไม่ได้แปลว่าไอเทมมีอยู่จริง** — `cancook`/`candry` ของ `AddIngredientValues`
  บอกแค่ว่าตาราง cooking tag ควรมี row นั้น ไม่ได้แปลว่าปรุง/ตากได้จริง → เราสร้างวัตถุดิบผี 6 ตัว
  (honey_cooked ฯลฯ). correct: ยืนยันการมีอยู่ของไอเทมกับ `prefabs/*.lua` (component `cookable`/
  `dryable` + ชื่อ product + Prefab ที่ register จริง) และทำ **positive control** เสมอ (เช็คว่า
  meats/veggies เจอ cookable จริง) ก่อนสรุปว่า "ไม่เจอ = ไม่มี"
- **error ใน console ของ Vite dev อาจเป็นซากจากตอน HMR กลางคัน ไม่ใช่บั๊กจริง** — ระหว่างแก้
  `App.tsx` มีจังหวะที่ลบ `const { t, locale } = useLocale()` ออกไปแล้วแต่ JSX ยังอ้าง `t` อยู่
  → HMR render พังชั่วคราวและ error ค้างใน console buffer แม้ reload แล้วก็ยังเห็น (buffer ไม่ถูกล้าง).
  correct: อย่าเพิ่งไล่แก้ตาม error ที่ค้าง — เปิด **แท็บใหม่** แล้วโหลดหน้าเดิม ถ้า console สะอาด
  แปลว่าเป็นซาก HMR; ดู timestamp ใน stack (`App.tsx?t=...`) ประกอบว่าเป็นเวอร์ชันเก่าหรือไม่.
