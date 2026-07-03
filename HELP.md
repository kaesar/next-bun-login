# HELP.md — Onboarding Tecnico

Proyecto de practica: **Next.js 16** (App Router) + **Bun** + **SQLite** + **Auth.js v4** (next-auth).

---

## Stack

| Capa             | Tecnologia                | Version |
|------------------|---------------------------|---------|
| Runtime          | Bun                       | 1.3.14  |
| Framework        | Next.js                   | 16.2.9  |
| UI               | React                     | 19.2.4  |
| Estilos          | Tailwind CSS              | v4      |
| Auth             | next-auth (Auth.js)       | 4.24.14 |
| BD               | SQLite via `bun:sqlite`   | —       |
| Validacion       | Zod                       | 4.4.3   |

---

## Estructura del proyecto

```
  ________
./ login /
│
├── app/                        # App Router (Next.js 16)
│   ├── api/auth/[...nextauth]/
│   │   └── route.ts            # API handler de Auth.js
│   ├── components/
│   │   ├── auth-provider.tsx   # SessionProvider (client component)
│   │   └── sign-out-button.tsx # Boton cerrar sesion (client component)
│   ├── lib/
│   │   ├── auth.ts             # Configuracion central de Auth.js
│   │   └── auth/
│   │       └── db.ts           # Funciones de BD para auth
│   ├── login/
│   │   └── page.tsx            # Pagina de login (client component)
│   ├── types/
│   │   └── next-auth.d.ts      # Extension de tipos de sesion
│   ├── globals.css             # Estilos globales + Tailwind
│   ├── layout.tsx              # Layout raiz (envuelve con AuthProvider)
│   └── page.tsx                # Pagina principal (protegida)
├── lib/
│   └── db.ts                   # Conexion SQLite + schema
├── scripts/
│   ├── migrate.ts              # Migracion + seed con password
│   └── reset.ts                # Reset completo de BD
├── proxy.ts                    # Proxy (middleware en Next.js 16)
├── sqlite.db                   # Base de datos SQLite
├── .env.local                  # Variables de entorno
├── next.config.ts              # Config de Next.js
├── tsconfig.json               # Config de TypeScript
├── postcss.config.mjs          # Config PostCSS (Tailwind v4)
└── package.json
```

---

## Flujo de autenticacion

### 1. Proxy — primera linea de defensa

`proxy.ts` se ejecuta antes de CADA request. Verifica el JWT en la cookie.

```
Request entrante
    │
    ▼
proxy.ts ──► ¿Es ruta publica? (/login, /api/auth/*, /_next/*, archivos)
    │              │
    │         SI ──► NextResponse.next() → continua
    │              │
    │         NO ──► getToken({ req }) → verificar JWT
    │                    │
    │               ¿Token valido?
    │                    │
    │              SI ──► NextResponse.next() → continua
    │                    │
    │              NO ──► redirect("/login")
```

**Archivo clave:** `proxy.ts:7-31`

### 2. Login — formulario client-side

`app/login/page.tsx` es un Client Component (`"use client"`). Usa `signIn()` de `next-auth/react`.

```
Usuario ingresa email + password
    │
    ▼
signIn("credentials", { email, password, redirect: false })
    │
    ▼
POST /api/auth/callback/credentials
    │
    ▼
Auth.js llama authorize() en app/lib/auth.ts:13-26
    │
    ├── getUserByEmail() → busca en SQLite
    ├── verifyPassword() → Bun.password.verify() contra Argon2id
    │
    ├── Si falla → retorna { error: "CredentialsSignin" }
    │
    └── Si OK → retorna { id, email, name }
                │
                ▼
        JWT firmado → cookie "next-auth.session-token"
                │
                ▼
        router.push("/") → pagina principal
```

**Archivo clave:** `app/login/page.tsx`

### 3. Sesion — verificacion server-side

`app/page.tsx` es un Server Component. Usa `getServerSession(authOptions)`.

```
GET /
    │
    ▼
page.tsx → getServerSession(authOptions)
    │
    ├── Lee cookie "next-auth.session-token"
    ├── Verifica JWT con NEXTAUTH_SECRET
    ├── Extrae token.id, token.email, etc.
    │
    ├── Si no hay sesion → redirect("/login")
    │
    └── Si hay sesion → renderiza pagina con datos del usuario
```

**Archivo clave:** `app/page.tsx`

---

## Conexion a la base de datos

**Archivo:** `lib/db.ts`

```ts
import { Database } from "bun:sqlite";

const db = new Database("sqlite.db", { create: true });
db.exec("PRAGMA foreign_keys = ON;");
```

- Singleton: una sola instancia de `Database` compartida por toda la app
- `bun:sqlite` usa `?` como placeholder (NO `$1`)
- `db.query(sql).get(param)` → un registro
- `db.query(sql).all()` → todos los registros
- `db.exec(sql)` → DDL (CREATE, ALTER, etc.)

### Esquema

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT UNIQUE,
  password TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

La columna `password` se agrega con `ALTER TABLE` si no existe (idempotente).

---

## Password hashing — Bun nativo

**Archivo:** `app/lib/auth/db.ts`

```ts
export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password);  // Argon2id por defecto
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return Bun.password.verify(password, hashedPassword);
}
```

- `Bun.password.hash()` → Argon2id (mas seguro que bcrypt)
- `Bun.password.verify()` → verifica contra el hash
- Sin dependencias externas (se elimino `bcryptjs`)

---

## Scripts de base de datos

| Comando              | Que hace |
|----------------------|----------|
| `bun run db:migrate` | Crea tabla `users` + seed usuario con password |
| `bun run db:reset`   | Elimina `sqlite.db` + re-ejecuta migrate |

**Credenciales de prueba:**
```
Email:    james@example.com
Password: password123
```

---

## Variables de entorno

**Archivo:** `.env.local`

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-change-this-in-production
```

- `NEXTAUTH_URL`: URL base para callbacks de Auth.js
- `NEXTAUTH_SECRET`: clave para firmar JWT (obligatoria en produccion)

---

## Tipos de sesion

**Archivo:** `app/types/next-auth.d.ts`

Extiende los tipos de next-auth para incluir `id` en la sesion:

```ts
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
  }
}
```

---

## Componentes clave

### Server Components (se ejecutan en el servidor)

| Archivo | Rol |
|---------|-----|
| `app/layout.tsx` | Layout raiz, envuelve hijos con `AuthProvider` |
| `app/page.tsx` | Pagina principal, verifica sesion con `getServerSession()` |

### Client Components (se ejecutan en el navegador)

| Archivo | Rol |
|---------|-----|
| `app/login/page.tsx` | Formulario de login, usa `signIn()` |
| `app/components/auth-provider.tsx` | `<SessionProvider>` de next-auth |
| `app/components/sign-out-button.tsx` | Boton de cerrar sesion, usa `signOut()` |

---

## Proxy vs Middleware (Next.js 16)

Next.js 16 renombró `middleware.ts` a `proxy.ts`. La funcion se exporta como `proxy` en vez de `middleware`.

```ts
// Next.js 15 y anteriores (middleware.ts)
export { default } from "next-auth/middleware"

// Next.js 16 (proxy.ts) — Auth.js v4 no tiene soporte nativo
// Se implementa manualmente con getToken()
import { getToken } from "next-auth/jwt"
export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request })
  if (!token) return NextResponse.redirect(new URL("/login", request.url))
  return NextResponse.next()
}
```

---

## Comandos

```bash
# Desarrollo
bun run dev          # Servidor en http://localhost:3000

# Build
bun run build        # Build de produccion
bun run start        # Iniciar produccion

# Base de datos
bun run db:migrate   # Migrar schema + seed usuario con password
bun run db:reset     # Reset completo

# Lint
bun run lint         # ESLint
```

---

## Dependencias

```
dependencies:
  next          16.2.9
  next-auth     4.24.14
  react         19.2.4
  react-dom     19.2.4
  zod           4.4.3

devDependencies:
  @types/bun        1.3.14
  @types/node       ^20
  @types/react      ^19
  @types/react-dom  ^19
  tailwindcss       ^4
  @tailwindcss/postcss  ^4
  eslint            ^9
  eslint-config-next   16.2.9
  typescript        ^5
```

> No hay dependencias de hashing — se usa `Bun.password`.
