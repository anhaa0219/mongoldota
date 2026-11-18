import type { Words } from "../words";

/** Статистик хуудасны дүрэмд суурилсан зөвлөмж (AI бодож байх эсвэл ажиллахгүй үед харагдана). */
export const suggest: Words["suggest"] = {
  advice: {
    gold_per_min: { title: "Farm-аа нэмэгдүүл", advice: "Тулааны хооронд farm хий, lane чинь түлхэгдсэн үед ойролцоох camp-уудыг цэвэрлэ." },
    xp_per_min: { title: "Түвшингээ хурдан ахиул", advice: "Үхэж, алхаж өнгөрөөх хугацаагаа багасга, XP авахын тулд wave болон тулааны ойролцоо бай." },
    last_hits_per_min: { title: "Илүү олон creep ал", advice: "Тоглолт хайхаасаа өмнө demo lobby-д 10 минут last hit дасгал хий." },
    hero_damage_per_min: { title: "Тулаанд илүү хохирол учруул", advice: "Тулаанд эрт нэгдэж, ид шидээ creep биш баатарт зарцуул." },
    kills_per_min: { title: "Илүү олон алалт хай", advice: "Lane чинь түлхэгдсэн үед ойрын lane руу шилжиж, багийнхаа stun-ийг дагаж ор." },
    deaths_per_min: { title: "Цөөн үх", advice: "TP авч яв, хэдэн секунд тутам minimap хар, ward-гүй lane-д ганцаараа farm бүү хий." },
  },
  weakDetail: (label, yours, hero, typical, rank, advice) => `${label}: ${hero} дээр ${yours} (ердийн ${typical}), ${hero} тоглогчдын ${rank}. ${advice}`,
  moreThan: (percent) => `${percent}-иас нь илүү их үхдэг`,
  betterThanOnly: (percent) => `зөвхөн ${percent}-иас нь илүү`,
  strengthTitle: (label) => `${label} бол таны давуу тал`,
  strengthDetail: (yours, hero, percent) => `${hero} дээр ${yours}, ${hero} тоглогчдын ${percent}-иас илүү. Үүнийгээ ашигла: түүнд тохирох тулаан, item сонго.`,
  versus: (recentRate, recentGames, earlierRate) => `Сүүлийн ${recentGames} тоглолтод ${recentRate} ялалт, өмнө нь ${earlierRate}`,
  slumpTitle: "Сүүлийн үеийн уналт",
  slumpDetail: (versus) => `${versus}. Хоёр удаа дараалан ялагдвал завсарлага ав, нэг ялагдлаа дахин үзэж шийдвэрлэсэн тулааныг ол.`,
  riseTitle: "Та өсөж байна",
  riseDetail: (versus) => `${versus}. Үр дүнтэй байгаа үед ижил баатар, lane-аа үргэлжлүүл.`,
  dyingTitle: "Сүүлийн үед их үхэж байна",
  dyingDetail: (recent, games, earlier) => `Сүүлийн ${games} тоглолтод тоглолт бүрт ${recent} үхэл, өмнө нь ${earlier}. Эхний 10 минутыг илүү болгоомжтой тогло.`,
  laneTitle: (lane) => `${lane}-д илүү тоглож үз`,
  laneDetail: (bestRate, bestLane, bestGames, mainRate, mainLane) =>
    `Та ${bestLane}-д ${bestRate} ялдаг (${bestGames} тоглолт), харин хамгийн их тоглодог ${mainLane}-д ${mainRate}.`,
  heroTitle: (hero) => `${hero} танд тохирч байна`,
  heroDetail: (rate, games, hero, mainRate, mainHero) => `${hero}-оор ${games} тоглолтод ${rate} ялалт, ${mainHero}-оор ${mainRate}. Ranked-д үүнийг илүү сонго.`,
  steadyTitle: "Онцгой зүйл алга",
  steadyDetail: (hero) => `Таны үзүүлэлт ердийн ${hero} тоглогчдынхтой ойролцоо. Үргэлжлүүлэн тоглож, дараа дахин шалгаарай.`,
};
