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
