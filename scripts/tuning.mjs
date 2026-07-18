// TUNING + FOODTYPE constants used by crock pot recipes.
// Values resolved from scripts/lua/tuning.lua (verified 2026-07-18).
// Base constants: seg_time=30, total_day_time=480, calories_per_day=75, perish_warp=1

const total_day_time = 480;
const perish_warp = 1;
const calories_per_day = 75;

export const TUNING = {
  // Healing (tuning.lua ~1951)
  HEALING_TINY: 1,
  HEALING_SMALL: 3,
  HEALING_MEDSMALL: 8,
  HEALING_MED: 20,
  HEALING_MEDLARGE: 30,
  HEALING_LARGE: 40,
  HEALING_HUGE: 60,
  HEALING_MOREHUGE: 75,
  HEALING_SUPERHUGE: 100,

  // Sanity (~1961)
  SANITY_SUPERTINY: 1,
  SANITY_TINY: 5,
  SANITY_SMALL: 10,
  SANITY_MED: 15,
  SANITY_MEDLARGE: 20,
  SANITY_LARGE: 33,
  SANITY_HUGE: 50,

  // Calories / hunger (~1987)
  CALORIES_TINY: calories_per_day / 8, // 9.375
  CALORIES_SMALL: calories_per_day / 6, // 12.5
  CALORIES_MEDSMALL: calories_per_day / 4, // 18.75
  CALORIES_MED: calories_per_day / 3, // 25
  CALORIES_LARGE: calories_per_day / 2, // 37.5
  CALORIES_HUGE: calories_per_day, // 75
  CALORIES_MOREHUGE: (calories_per_day * 4) / 3, // 100
  CALORIES_SUPERHUGE: calories_per_day * 2, // 150

  // Perish times, in game-seconds (~1972)
  PERISH_ONE_DAY: 1 * total_day_time * perish_warp, // 480
  PERISH_TWO_DAY: 2 * total_day_time * perish_warp, // 960
  PERISH_SUPERFAST: 3 * total_day_time * perish_warp, // 1440
  PERISH_FAST: 6 * total_day_time * perish_warp, // 2880
  PERISH_FASTISH: 8 * total_day_time * perish_warp, // 3840
  PERISH_MED: 10 * total_day_time * perish_warp, // 4800
  PERISH_SLOW: 15 * total_day_time * perish_warp, // 7200
  PERISH_PRESERVED: 20 * total_day_time * perish_warp, // 9600
  PERISH_SUPERSLOW: 40 * total_day_time * perish_warp, // 19200

  // Food temperature (~2250)
  HOT_FOOD_BONUS_TEMP: 40,
  COLD_FOOD_BONUS_TEMP: -40,
  FOOD_TEMP_BRIEF: 5,
  FOOD_TEMP_AVERAGE: 10,
  FOOD_TEMP_LONG: 15,

  // Hunger regen (batnosehat, ~5470). value depends on calories_per_day/total_day_time
  HUNGERREGEN_TICK_VALUE: (5 * (calories_per_day * 2.5)) / (0.5 * total_day_time * perish_warp),

  // Special-food effects used as stat placeholders in the cookbook
  JELLYBEAN_TICK_VALUE: 2, // jellybean health-over-time (tuning.lua ~189)
  PANFLUTE_SLEEPTIME: 20, // used by some sleep foods (~1853)
};
