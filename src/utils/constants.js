const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const COUNTRY_CODES = [
  { value: "+970", label: "Palestine" },
  { value: "+972", label: "Israel" },
];

const ITEM_LIMITS = {
  MAX_NAME_LENGTH: 100,
  MAX_URL_LENGTH: 500,
  MAX_PRICE: 1_000_000,
  MAX_QUANTITY: 100_000,
  MAX_IMAGES_PER_ITEM: 6,
};

const REGIONS = [
  { value: "hebron", label: "الخليل" },
  { value: "dura", label: "دورا" },
  { value: "al-fawwar", label: "الفوار" },
  { value: "bani-naim", label: "بني نعيم" },
  { value: "yatta", label: "يطا" },
  { value: "halhul", label: "حلحول" },
  { value: "beit-ummur", label: "بيت أمر" },
  { value: "al-dhaheriyeh", label: "الظاهرية" },
  { value: "as-samu", label: "السموع" },
  { value: "sa-ir", label: "سعير" },
  { value: "surif", label: "صوريف" },
  { value: "tarqumiyah", label: "ترقوميا" },
  { value: "idhna", label: "إذنا" },
  { value: "beit-kahil", label: "بيت كاحل" },
  { value: "beit-awwa", label: "بيت عوا" },
  { value: "al-arrub", label: "مخيم العروب" },
  { value: "kharas", label: "خاراس" },
  { value: "nuba", label: "نوبا" },
  { value: "ash-shuyukh", label: "الشيوخ" },
  { value: "taffuh", label: "تفوح" },
  { value: "deir-sammit", label: "دير سامت" },
];

module.exports = {
  UUID_V4_REGEX,
  COUNTRY_CODES,
  ITEM_LIMITS,
  REGIONS,
};
