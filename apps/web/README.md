# DocForge

Proyecto monolito construido con [Remix](https://remix.run/), [Vite](https://vitejs.dev/) y [Tailwind CSS](https://tailwindcss.com/).

## 🚀 Inicio rápido

1. Instala las dependencias:

```bash
npm install
```

2. Inicia el servidor de desarrollo:

```bash
npm run dev
```

3. Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la app.

## 📦 Scripts principales

- `npm run dev` — Inicia el servidor Remix en modo desarrollo
- `npm run build` — Compila la app para producción
- `npm run start` — Inicia el servidor Remix en modo producción (después de `build`)
- `npm run lint` — Linting del código
- `npm run typecheck` — Verificación de tipos TypeScript

## 🗂️ Estructura principal

```
apps/web/
├── app/
│   ├── components/      # Componentes React reutilizables
│   ├── routes/          # Rutas Remix (páginas y endpoints)
│   ├── services/        # Servicios y lógica de negocio
│   ├── tailwind.css     # Estilos globales (Tailwind)
│   └── root.tsx         # Entry point Remix
├── public/              # Archivos estáticos
├── package.json         # Dependencias y scripts
├── tailwind.config.ts   # Configuración Tailwind
├── remix.config.js      # Configuración Remix
├── vite.config.ts       # Configuración Vite
└── ...
```

## ⚙️ Variables de entorno

Crea un archivo `.env` en `apps/web/` con tus claves necesarias, por ejemplo:

```
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
SESSION_SECRET=xxx
```

## 📝 Notas

- Este proyecto fue migrado desde Next.js a Remix. Si encuentras referencias a Next.js, puedes ignorarlas o eliminarlas.
- Toda la lógica y componentes están en `apps/web/app/`.
- Si tienes dudas sobre la estructura de componentes, revisa el archivo `components/README.md`.

---

¡Feliz documentación y desarrollo con Remix! 🚀
