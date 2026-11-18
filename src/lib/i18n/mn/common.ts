import type { Words } from "../words";

/** Сайт даяар хэрэглэгдэх үгс. */
export const common: Words["common"] = {
  language: "Хэл",
  more: "Бусад",
  logOut: "Гарах",
  ago: {
    justNow: "дөнгөж сая",
    minutes: (count) => `${count} мин өмнө`,
    hours: (count) => `${count} ц өмнө`,
    days: (count) => `${count} өдрийн өмнө`,
    months: (count) => `${count} сарын өмнө`,
  },
};
