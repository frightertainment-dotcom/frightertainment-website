# Frightertainment typography

The interface loads three type families directly on each HTML page: **Grenze Gotisch** for selected display headings, **Barlow Condensed** for navigation and compact labels, and **DM Sans** for body copy and data. Film titles remain in readable mixed case and wrap at spaces. The original Frightertainment logo is unchanged.

All three families are available through Google Fonts under the **SIL Open Font License 1.1**. Sources: [Grenze Gotisch](https://github.com/Omnibus-Type/Grenze-Gotisch), [Barlow Condensed](https://github.com/google/fonts/tree/main/ofl/barlowcondensed), and [DM Sans](https://github.com/google/fonts/tree/main/ofl/dmsans). The browser requests the stylesheet on every direct page load; Barlow Condensed and DM Sans use local sans-serif fallbacks, and Grenze Gotisch falls back to Georgia. `font-display: swap` behaviour is used by the Google Fonts stylesheet, so content stays readable if remote fonts are unavailable.
