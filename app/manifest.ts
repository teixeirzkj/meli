import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Rotas — conferência de pacotes",
    short_name: "Rotas",
    description:
      "Confira rotas e pacotes pela câmera do celular, sem papel e sem planilha.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F7FA",
    theme_color: "#12295C",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["business", "productivity", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // O Android recorta o ícone; estes têm a arte nos 80% centrais.
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Nova rota", short_name: "Nova rota", url: "/rotas/nova" },
      { name: "Histórico", short_name: "Histórico", url: "/historico" },
    ],
  };
}
