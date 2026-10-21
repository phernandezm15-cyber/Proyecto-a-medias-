import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FarmaciaDB" },
      { name: "description", content: "Sistema de gestión para farmacias: inventario, ventas y proveedores." },
      { property: "og:title", content: "FarmaciaDB" },
      { property: "og:description", content: "Sistema de gestión para farmacias: inventario, ventas y proveedores." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
});
