import type { Words } from "../words";

/** AI-ийн хязгаар: хэрэглээний мөр ба хязгаарт хүрэх үед гарах тайван өгүүлбэр. */
export const ai: Words["ai"] = {
  usage: (today, limit) => `Өнөөдрийн AI ${today} / ${limit}`,
  usageMatch: (match, limit) => ` · энэ тоглолт ${match} / ${limit}`,
  freesUp: (time) => ` ${time}-аас дахин боломжтой болно.`,
  matchTips: (max) => `Дасгалжуулагч энэ тоглолтод ${max} зөвлөгөөгөө өгсөн.`,
  matchPlans: (max) => `Дасгалжуулагч энэ тоглолтод ${max} item төлөвлөгөөгөө гаргасан.`,
  draftAdvice: (max) => `Та өнөөдрийн ${max} драфтын зөвлөгөөгөө ашигласан.`,
  screenshots: (max) => `Та өнөөдрийн ${max} зураг уншилтаа ашигласан.`,
  daily: (max) => `Та өнөөдрийн AI эрхээ (${max}) ашигласан.`,
};
