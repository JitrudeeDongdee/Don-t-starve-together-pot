// Tiny i18n: locale context + UI strings (TH default, EN toggle).
// Item/dish names stay English by decision (see spec.md).
import { createContext, useContext, useState, type ReactNode } from 'react';

export type Locale = 'th' | 'en';

const STRINGS = {
  th: {
    subtitle: 'จำลองหม้อปรุงอาหาร Don’t Starve Together — ข้อมูลจาก game scripts จริง',
    kitchen: 'ครัว',
    allRecipes: 'เมนูทั้งหมด',
    ingredients: 'วัตถุดิบ',
    searchIngredient: 'ค้นหาวัตถุดิบ… (เช่น meat, honey)',
    searchRecipe: 'ค้นหาเมนู…',
    pot: 'หม้อปรุงอาหาร',
    cook: 'ปรุง!',
    clear: 'ล้างหม้อ',
    gotDish: 'ได้เมนู',
    possible: 'เมนูที่เป็นไปได้ (โอกาส)',
    emptySlot: 'ช่องว่าง',
    removeHint: 'คลิกเพื่อเอาออก',
    category: 'หมวด',
    all: 'ทั้งหมด',
    health: '❤️ พลังชีวิต',
    hunger: '🍗 ความหิว',
    sanity: '🧠 สติ',
    perish: '⏳ เก็บได้',
    cookTime: 'ปรุง',
    howTo: 'วิธีทำ',
    guaranteed: 'สูตรตัวอย่างที่การันตีได้เมนูนี้:',
    conditions: 'เงื่อนไข (ต้องครบทุกข้อ):',
    neverSpoils: 'ไม่เน่า',
    days: 'วัน',
    priority: 'priority',
    foodOf: (n: number) => `${n} เมนู`,
    type: 'ประเภท',
    spoils: 'การเน่าเสีย',
    cookingTime: 'เวลาปรุง',
    spoilSlow: 'ช้า',
    spoilAvg: 'ปานกลาง',
    spoilFast: 'เร็ว',
    timeShort: 'สั้น',
    timeMed: 'ปานกลาง',
    timeLong: 'นาน',
    sideEffects: 'ผลข้างเคียง',
    coolsBody: 'ลดอุณหภูมิร่างกาย',
    warmsBody: 'เพิ่มอุณหภูมิร่างกาย',
    none: 'ไม่มี',
    fillHint: 'ใส่ครบ 4 ช่องเพื่อดูโอกาสจริง (%)',
    inPot: 'ค่ารวมในหม้อ',
    contactUs: 'ติดต่อเรา',
    contactInfo: 'ข้อมูลติดต่อ',
    contactProjectNote: 'นี่เป็นโปรเจกต์ที่ทำเพื่อให้ฉันเล่นเกมอย่างมีความสุขมากขึ้น หวังว่ามันจะช่วยคุณได้เช่นกัน',
    loadingContact: 'กำลังโหลดข้อมูลจาก GitHub…',
    contactLoadError: 'โหลดข้อมูลติดต่อไม่สำเร็จ',
    requiredIngredients: 'ต้องมี',
    forbiddenIngredients: 'ห้ามใส่',
    oneOfIngredients: 'อย่างใดอย่างหนึ่ง',
    noSpecificRule: 'ไม่มีเงื่อนไขเฉพาะ',
    tagTotalAtLeast: (n: number) => `รวมอย่างน้อย ${n}`,
    statusMaster: 'สถานะรวม',
    ingredientsInPot: 'วัตถุดิบในหม้อ',
    cookExample: 'ตัวอย่างการปรุง',
  },
  en: {
    subtitle: 'Don’t Starve Together crock pot simulator — data straight from the game scripts',
    kitchen: 'Kitchen',
    allRecipes: 'All Recipes',
    ingredients: 'Ingredients',
    searchIngredient: 'Search ingredients… (e.g. meat, honey)',
    searchRecipe: 'Search recipes…',
    pot: 'Crock Pot',
    cook: 'Cook!',
    clear: 'Clear',
    gotDish: 'You got',
    possible: 'Possible dishes (chance)',
    emptySlot: 'Empty slot',
    removeHint: 'Click to remove',
    category: 'Type',
    all: 'All',
    health: '❤️ Health',
    hunger: '🍗 Hunger',
    sanity: '🧠 Sanity',
    perish: '⏳ Perish',
    cookTime: 'Cook',
    howTo: 'How to make',
    guaranteed: 'Guaranteed example recipe:',
    conditions: 'Requirements (all must hold):',
    neverSpoils: 'Never spoils',
    days: 'days',
    priority: 'priority',
    foodOf: (n: number) => `${n} dishes`,
    type: 'Type',
    spoils: 'Spoils',
    cookingTime: 'Cooking Time',
    spoilSlow: 'Slowly',
    spoilAvg: 'Average',
    spoilFast: 'Quickly',
    timeShort: 'Short',
    timeMed: 'Medium',
    timeLong: 'Long',
    sideEffects: 'Side Effects',
    coolsBody: 'Cools the body',
    warmsBody: 'Warms the body',
    none: 'None',
    fillHint: 'Fill all 4 slots for exact chances (%)',
    inPot: 'Pot totals',
    contactUs: 'Contact us',
    contactInfo: 'Contact information',
    contactProjectNote: 'I made this project to make my game time happier. I hope it helps you too.',
    loadingContact: 'Loading profile from GitHub…',
    contactLoadError: 'Failed to load contact information',
    requiredIngredients: 'Required',
    forbiddenIngredients: 'Forbidden',
    oneOfIngredients: 'One of these',
    noSpecificRule: 'No specific ingredient rule',
    tagTotalAtLeast: (n: number) => `at least ${n} total`,
    statusMaster: 'Master status',
    ingredientsInPot: 'Ingredients in pot',
    cookExample: 'Example cook',
  },
};

export type Strings = (typeof STRINGS)['th'];

const LocaleCtx = createContext<{ locale: Locale; t: Strings; setLocale: (l: Locale) => void }>({
  locale: 'th',
  t: STRINGS.th,
  setLocale: () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(
    () => (localStorage.getItem('locale') as Locale) || 'th',
  );
  const set = (l: Locale) => {
    localStorage.setItem('locale', l);
    setLocale(l);
  };
  return (
    <LocaleCtx.Provider value={{ locale, t: STRINGS[locale], setLocale: set }}>
      {children}
    </LocaleCtx.Provider>
  );
}

export const useLocale = () => useContext(LocaleCtx);
