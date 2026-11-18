/** Words used across the whole site. */
export const common = {
  language: "Language",
  more: "More",
  logOut: "Log out",
  ago: {
    justNow: "just now",
    minutes: (count: number) => `${count} min ago`,
    hours: (count: number) => `${count} h ago`,
    days: (count: number) => `${count} d ago`,
    months: (count: number) => `${count} mo ago`,
  },
};
