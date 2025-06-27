# DocForge

Proyecto monolito construido con [Remix](https://remix.run/), [Vite](https://vitejs.dev/) y [Tailwind CSS](https://tailwindcss.com/).

## 🚀 Inicio rápido

1. Instala las dependencias:

```bash
npm install
```

2. Inicia el servidor de desarrollo (¡desde la raíz!):

```bash
npm run dev
```

3. Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la app.

## 📦 Scripts principales

> **Puedes ejecutar estos comandos desde la raíz del proyecto** gracias al `package.json` de la raíz, que reenvía los scripts a `apps/web`.

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
- El `package.json` de la raíz solo contiene scripts para tu comodidad, el principal está en `apps/web`.

---

¡Feliz documentación y desarrollo con Remix! 🚀

## Configuración de la base de datos para colaboradores

Este proyecto usa **PostgreSQL** y **Prisma** como ORM. Para que puedas crear, migrar o resetear la base de datos localmente, sigue estos pasos:

### 1. Permisos necesarios

El usuario de PostgreSQL que uses en tu `.env` debe tener permiso para crear bases de datos (`CREATEDB`). Esto es necesario porque Prisma usa una "shadow database" para aplicar migraciones de forma segura.

**Para dar el permiso:**

```
sudo -u postgres psql
ALTER USER tu_usuario CREATEDB;
\q
```

Reemplaza `tu_usuario` por el usuario que usas en tu `DATABASE_URL`.

---

### 2. Comandos útiles con Prisma

- **Crear y migrar la base de datos (aplicar migraciones):**
  ```sh
  npx prisma migrate dev
  ```

- **Crear una nueva migración (cuando cambias el modelo):**
  ```sh
  npx prisma migrate dev --name nombre_migracion
  ```

- **Borrar y recrear la base de datos (desarrollo):**
  ```sh
  npx prisma migrate reset
  ```

- **Actualizar el cliente Prisma después de cambiar el modelo:**
  ```sh
  npx prisma generate
  ```

---

### 3. Variables de entorno

Asegúrate de tener un archivo `.env` con la variable `DATABASE_URL` apuntando a tu base de datos PostgreSQL local.

```
DATABASE_URL="postgresql://usuario:clave@localhost:5432/nombre_db"
```

---

### 4. Más información

- [Documentación oficial de Prisma](https://www.prisma.io/docs)
- [Documentación de PostgreSQL](https://www.postgresql.org/docs/)
