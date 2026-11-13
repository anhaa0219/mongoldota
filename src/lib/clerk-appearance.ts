/**
 * Clerk sign-in / sign-up styling, matched to the site's dark palette in globals.css.
 * The site shrinks the root font size (globals.css), and Clerk sizes in rem, so
 * fontSize, spacing and card width are scaled up ~1.5x from Clerk's defaults.
 */
export const clerkAppearance = {
  elements: {
    rootBox: { width: "100%" },
    cardBox: { width: "100%", maxWidth: "100%" },
  },
  variables: {
    fontSize: "1.4rem",
    spacing: "1.75rem",
    colorPrimary: "#feba87",
    colorPrimaryForeground: "#060e18",
    colorBackground: "#0c1622",
    colorForeground: "#ffffff",
    colorMutedForeground: "#a3a3a3",
    colorInput: "#121e2c",
    colorInputForeground: "#ffffff",
    colorNeutral: "#ffffff",
    colorDanger: "#e2492f",
    colorSuccess: "#92c84a",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-jost)",
  },
};
