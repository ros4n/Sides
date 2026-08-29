import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sides",
    short_name: "Sides",
    description:
      "Plan private futsal games, build teams live, and keep your crew in the loop.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0d0c",
    theme_color: "#16a34a",
    categories: ["sports", "social", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Dashboard", url: "/dashboard" },
      { name: "New event", url: "/events/new" },
      { name: "Friends", url: "/friends" },
    ],
  };
}
