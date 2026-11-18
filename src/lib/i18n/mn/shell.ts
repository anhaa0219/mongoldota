import type { Words } from "../words";

/** Нэвтэрсэн хэсгийн хүрээ (цэс, товчлуурууд, мэдэгдэл), нийтлэг хэсгүүд ба нэвтрэх дэлгэц. */
export const shell: Words["shell"] = {
  nav: { stats: "Статистик", draft: "Драфт", live: "Шууд зөвлөгөө", heroes: "Эрэлттэй баатрууд", history: "Түүх" },
  sections: "Хэсгүүд",
  home: "Нүүр хуудас",
  medalTitle: "OpenDota-гийн тооцоолсон медаль ба MMR",
  player: "Тоглогч",
  linkSteam: "Steam холбох",
  syncStats: "Dota статистикаа татах",
  openSteamProfile: "Steam профайл нээх",
  steamLinked: "Steam холбогдсон",
  unlinkSteam: "Steam салгах",
  notice: {
    notLinked: "Статистикаа харахын тулд Steam-ээ холбоно уу",
    noMatches: "Нээлттэй тоглолт олдсонгүй. Dota 2 дотор: Settings > Options > Social > Expose Public Match Data-г асаана уу.",
    error: "Статистикийг ачаалж чадсангүй. Нэг минутын дараа дахин оролдоно уу.",
  },
  analyse: {
    failed: "OpenDota шинжилгээг эхлүүлж чадсангүй. Дараа дахин оролдоно уу.",
    requested: "OpenDota энэ тоглолтыг шинжилж байна. Хэдэн минутын дараа дахин шалгана уу.",
    checkAgain: "Дахин шалгах",
    explain: "Алтны график, item-ийн хугацаа, ward болон үхлүүдийг харахын тулд OpenDota replay-г шинжлэх хэрэгтэй (зөвхөн сүүлийн тоглолтууд).",
    asking: "OpenDota-аас асууж байна…",
    analyse: "OpenDota-аар шинжлүүлэх",
  },
  advice: {
    refreshTitle: "AI зөвлөгөө 12 цагт нэгээс илүүгүй шинэчлэгдэнэ",
    updatedJustNow: "Дөнгөж сая шинэчлэгдсэн",
    updatedAgo: (time) => `${time}-ийн өмнө шинэчлэгдсэн`,
    newIn: (time) => `шинэ зөвлөгөө ${time}-ийн дараа`,
    newNextVisit: "шинэ зөвлөгөө дараагийн удаа",
    underAMinute: "нэг минут хүрэхгүй",
    hoursMinutes: (hours, minutes) => `${hours} ц ${minutes} мин`,
    minutes: (minutes) => `${minutes} мин`,
  },
  auth: {
    welcome: "Тавтай морил",
    tagline: "Dota 2 тоглолтын шинжилгээ: таны статистик, баатар сонголт, lane-ийн таамаг.",
    features: ["Тоглолт бүрийн таны статистик", "Таны үүрэгт тохирох баатрууд", "Horn-оос өмнөх lane-ийн таамаг"],
  },
};
