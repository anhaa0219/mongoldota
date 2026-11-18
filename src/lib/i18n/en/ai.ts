/** AI limits: the usage line and the calm sentence shown when a limit is reached. */
export const ai = {
  usage: (today: number, limit: number) => `AI today ${today} / ${limit}`,
  usageMatch: (match: number, limit: number) => ` · this match ${match} / ${limit}`,
  freesUp: (time: string) => ` It frees up from ${time}.`,
  matchTips: (max: number) => `The coach has given its ${max} tips for this match.`,
  matchPlans: (max: number) => `The coach has made its ${max} item plans for this match.`,
  draftAdvice: (max: number) => `You've used today's ${max} draft advice requests.`,
  screenshots: (max: number) => `You've used today's ${max} screenshot reads.`,
  daily: (max: number) => `You've used today's AI allowance (${max}).`,
};
