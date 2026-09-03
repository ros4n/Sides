import type { Metadata, Viewport } from "next";
import { Staatliches, Courier_Prime, Caveat, Archivo } from "next/font/google";
import { Toaster } from "sonner";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import "./globals.css";

const shoulders = Staatliches({
  variable: "--font-shoulders",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});
const courier = Courier_Prime({
  variable: "--font-courier",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});
// Running text / UI chrome — readable at small sizes where the typewriter face
// struggles. Courier Prime stays on for team sheets, fixtures and field data.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Sides",
    template: "%s · Sides",
  },
  description:
    "Run your crew's private futsal games like a photocopied fanzine — invite-only, teams built live.",
  applicationName: "Sides",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Sides",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "Sides",
    description:
      "Run your crew's private futsal games like a photocopied fanzine — invite-only, teams built live.",
    url: siteUrl,
    siteName: "Sides",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#efe7d6" },
    { media: "(prefers-color-scheme: dark)", color: "#17140f" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${shoulders.variable} ${courier.variable} ${caveat.variable} ${archivo.variable} h-full`}
    >
      <body className="min-h-full">
        {/*
IMPECCABLE DIRECTION — seed f77443d6 · "The Team Sheet Zine" (operate, code-led)

THESIS: A crew's private kickabout, run like a photocopied grassroots-football
fanzine. Refuses the clean SaaS dashboard and the literal magnetic tactics board.

OWN-WORLD: Grained photocopy paper — warm by day, dark pulp at night. One riso
blue in flat blocks carrying 30–60%; black toner ink; a fluoro-pink alarm for
LIVE only. Big Shoulders Display caps at poster scale for headings; Archivo for
running text and UI chrome; Courier Prime typewriter for the team sheets,
fixtures table and field data; Caveat only for biro annotations. Ornament is
functional: staples at module corners, masking tape on
a pinned game, a biro circle on what's yours, a rubber "CREW ONLY" stamp that
is the visibility control. Team colour = flat riso block + hand number.

STORY: The visitor sees their next game with teams already forming, live; scans
the tiled clippings for anything that moved; opens a game; drags name-slips
between two ruled columns while others' Polaroid avatars ride the slips they hold.

FIRST VIEWPORT: Taped cut-out masthead + stamped date. "NEXT UP" poster
headline and the nearest game as a taped clipping with a live two-column TEAM 1
/ TEAM 2 sheet plus pool. Dense tiled column of other games as smaller stapled
clippings, a STOP-PRESS module among them. "START A GAME" inked-stamp block
fixed in the thumb zone. Riso blue owns the masthead bar, the NEXT UP tab and
the START stamp.

FORM: The DIY football fanzine — #7 of 7 on the grounded list. Seed f77443d6.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
        */}
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--paper-2)",
              color: "var(--ink)",
              border: "1px solid var(--ink)",
              borderRadius: "3px",
              fontFamily: "var(--font-courier), monospace",
              boxShadow: "3px 3px 0 rgba(28,24,19,0.2)",
            },
          }}
        />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
