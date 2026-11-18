/** The Stats page's rule-based suggestions (shown while the AI coach thinks, or when it is unavailable). */
export const suggest = {
  advice: {
    gold_per_min: { title: "Raise your farm", advice: "Farm between fights, and clear nearby camps whenever your lane is pushed." },
    xp_per_min: { title: "Gain levels faster", advice: "Spend less time dead or walking, and stay near waves and fights to soak XP." },
    last_hits_per_min: { title: "Hit more creeps", advice: "Practise last hits in a demo lobby for 10 minutes before you queue." },
    hero_damage_per_min: { title: "Do more damage in fights", advice: "Join fights earlier and spend your spells on heroes, not creeps." },
    kills_per_min: { title: "Look for more kills", advice: "When your lane is pushed, rotate to a nearby lane and follow up on your team's stuns." },
    deaths_per_min: { title: "Die less", advice: "Carry a TP, check the minimap every few seconds, and don't farm unwarded lanes alone." },
  },
  weakDetail: (label: string, yours: string, hero: string, typical: string, rank: string, advice: string) =>
    `${label}: ${yours} on ${hero} (typical ${typical}), ${rank} of ${hero} players. ${advice}`,
  moreThan: (percent: string) => `more than ${percent}`,
  betterThanOnly: (percent: string) => `better than only ${percent}`,
  strengthTitle: (label: string) => `${label} is your strength`,
  strengthDetail: (yours: string, hero: string, percent: string) => `${yours} on ${hero}, better than ${percent} of ${hero} players. Play to it: pick fights and items that use it.`,
  versus: (recentRate: string, recentGames: number, earlierRate: string) => `${recentRate} win rate in your last ${recentGames} games vs ${earlierRate} before`,
  slumpTitle: "Recent slump",
  slumpDetail: (versus: string) => `${versus}. Take a break after two losses in a row, and replay one loss to find the fight that decided it.`,
  riseTitle: "You're on the rise",
  riseDetail: (versus: string) => `${versus}. Keep the same heroes and lanes while it works.`,
  dyingTitle: "Dying more lately",
  dyingDetail: (recent: string, games: number, earlier: string) => `${recent} deaths a game in your last ${games} vs ${earlier} before. Play the first 10 minutes safer.`,
  laneTitle: (lane: string) => `Try ${lane} more`,
  laneDetail: (bestRate: string, bestLane: string, bestGames: number, mainRate: string, mainLane: string) =>
    `You win ${bestRate} in the ${bestLane} (${bestGames} games) but ${mainRate} in the ${mainLane}, where you play most.`,
  heroTitle: (hero: string) => `${hero} works for you`,
  heroDetail: (rate: string, games: number, hero: string, mainRate: string, mainHero: string) =>
    `${rate} win rate over ${games} games on ${hero} vs ${mainRate} on ${mainHero}. Pick it more in ranked.`,
  steadyTitle: "Nothing stands out",
  steadyDetail: (hero: string) => `Your numbers are close to typical ${hero} players. Keep playing and check back after more games.`,
};
