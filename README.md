# 🎮 My Collection · Videojuegos

Aplicación web full stack para llevar el registro personal de tus videojuegos: buscás juegos reales de la tienda de Steam, los agregás a tu biblioteca con un estado (*Quiero jugar*, *Jugando*, *Terminado*, *Abandonado*), los puntuás, escribís reseñas, armás colecciones y ves estadísticas calculadas a partir de tus propios datos.

> Trabajo Práctico Final — **EFSI & DAI 2026**

---

## 📑 Índice

- [Integrantes](#-integrantes)
- [Cómo resolvimos la temática](#-cómo-resolvimos-la-temática)
- [Funcionalidades](#-funcionalidades)
- [Tecnologías](#-tecnologías)
- [Arquitectura](#-arquitectura)
- [Estructura del repositorio](#-estructura-del-repositorio)
- [Instalación y ejecución local](#-instalación-y-ejecución-local)
- [Variables de entorno](#-variables-de-entorno)
- [Cuenta demo](#-cuenta-demo)
- [Base de datos](#-base-de-datos)
- [API REST](#-api-rest)
- [Seguridad](#-seguridad)
- [Deploy](#-deploy)

---

## 👥 Integrantes

| Integrante | GitHub | Principales aportes |
|---|---|---|
| Gael Zolotow | [@gzolotow](https://github.com/gzolotow) | Base del proyecto (React + Vite, estilos globales, proxy a la API), autenticación (JWT en cookie httpOnly, register/login/logout/me, `requireAuth`), AuthContext, cliente Axios con manejo de sesión vencida, rutas públicas y protegidas, navbar, componentes base, pantallas de Login y Registro, migración de RAWG a Steam, pantalla Perfil y deploy en Vercel |
| Julián Canievsky | [@JulianCanievsky](https://github.com/JulianCanievsky) | Home con destacados de Steam, Biblioteca, Detalle del juego |
| Julián Hofman | [@JulianHofman09](https://github.com/JulianHofman09) | Colecciones, seed de la cuenta demo, reseñas, Estadísticas y 404 |

---

## 🎯 Cómo resolvimos la temática

La consigna era una app de "My Collection" sobre una temática a elección. Elegimos **videojuegos** y adaptamos cada parte del sistema a cómo una persona realmente lleva su registro de juegos.

**1. Los estados de un juego.** En vez de "leído / pendiente" usamos los estados propios de un jugador: *Quiero jugar*, *Jugando*, *Terminado* y *Abandonado*. Están definidos igual en el frontend (`utils/constants.js`) y validados en la base con un `CHECK`, así no puede entrar un estado inválido. Cuando un juego pasa a *Jugando* o *Terminado* guardamos la fecha, y eso alimenta las estadísticas por mes y el desafío anual.

**2. Datos que tienen sentido para videojuegos.** Además de favorito y puntuación (1 a 5 estrellas), cada juego de la biblioteca guarda las **horas jugadas** y la **plataforma** en la que lo juega el usuario (PC, PS5, Switch, Steam Deck…). La plataforma la elige el usuario y no viene de la API, porque un mismo juego se puede tener en varias consolas.

**3. Juegos reales desde Steam.** Al principio planeamos usar la API de RAWG, pero la cambiamos por la **API pública de la tienda de Steam** porque no necesita API key y trae los datos en español y con precios en pesos. Como Steam no permite llamadas desde el navegador (no tiene CORS), el **backend hace de intermediario**: el frontend le pide los juegos a nuestra API, la API se los pide a Steam, normaliza la respuesta a un formato propio y la guarda un rato en caché. Steam devuelve las fechas como texto ("24 FEB 2017", "4 ene. 2021"), así que escribimos un parser para convertirlas a fechas reales.

**4. Una copia mínima de cada juego.** Cuando un usuario agrega un juego a su biblioteca o a una colección, guardamos en la tabla `games` solo lo necesario (nombre, portada, fecha, géneros, plataformas, Metacritic). Así la biblioteca, las colecciones y las estadísticas se arman con SQL sobre nuestra base, sin depender de que Steam responda.

**5. Reseñas, colecciones e historial.** Las reseñas están atadas a la biblioteca: solo se puede reseñar un juego que tenés, y si lo sacás se borra la reseña (FK en cascada). Las colecciones son listas libres del usuario (*"Joyas indie"*, *"Para las vacaciones"*). Cada acción queda registrada en una tabla de actividad que se muestra en el perfil.

**6. Estadísticas de jugador.** Todas se calculan en el momento con consultas SQL sobre los datos reales del usuario: géneros favoritos, plataformas más usadas y horas en cada una, juegos terminados por mes, más horas jugadas, décadas de lanzamiento y un **desafío anual** (cuántos juegos querés terminar en el año, configurable desde el perfil).

**7. Cuenta demo con historia.** Para mostrar la app sin cargar todo a mano hicimos un seed con 15 juegos conocidos, reseñas, colecciones y actividad con fechas pasadas, así las estadísticas tienen contenido desde el primer momento.

**Cómo nos organizamos.** Cada integrante trabajó en su propia rama (`gael-zolotow`, `julian-canievsky`, `julian-hofman`) y fuimos integrando los cambios a `main` con Pull Requests. Primero armamos la base (esquema de la base, autenticación, cliente de la API y componentes comunes) y después cada uno tomó pantallas completas, del endpoint del backend a la vista en React.

---

## ✨ Funcionalidades

**Cuenta y sesión**
- Registro e inicio de sesión (con correo **o** nombre de usuario).
- Sesión persistente mediante JWT guardado en una cookie `httpOnly`.
- Cierre de sesión automático si el token vence (el frontend detecta el `401` y redirige al login).
- Rutas públicas (login/registro) y privadas (resto de la app).

**Explorar juegos (Steam)**
- Destacados de la tienda (más vendidos + novedades) en el Home.
- Búsqueda por texto con filtros por género y plataforma, y orden por relevancia, nombre, puntaje Metacritic o fecha de lanzamiento.
- Detalle del juego: portada, descripción, desarrolladores, distribuidores, precio, capturas, géneros y fecha de lanzamiento.

**Biblioteca personal**
- Agregar / quitar juegos.
- Estado: Quiero jugar · Jugando · Terminado · Abandonado.
- Favoritos, puntuación de 1 a 5 estrellas, horas jugadas y plataforma en la que se juega.
- Pestañas por estado, búsqueda y ordenamiento (recientes, agregados, nombre, puntuación, horas, lanzamiento).

**Reseñas**
- Una reseña por juego (crear, editar y borrar). Solo se puede reseñar un juego que esté en la biblioteca.

**Colecciones**
- Crear, renombrar, editar y borrar colecciones propias (ej. *"Joyas indie"*).
- Agregar y quitar juegos; vista de cada colección con mosaico de portadas.

**Perfil**
- Edición de nombre visible, bio, avatar, géneros y plataformas favoritas y objetivo anual de juegos.
- Actividad reciente (historial de todo lo que hizo el usuario).

**Estadísticas** (calculadas en el momento con SQL sobre los datos reales)
- Resumen general, distribución de puntuaciones, géneros favoritos con su promedio, plataformas más usadas y horas en cada una, juegos terminados por mes, mejor puntuados, más horas jugadas, décadas de lanzamiento y progreso del desafío anual.

---

## 🛠 Tecnologías

| Capa | Tecnologías |
|---|---|
| **Frontend** | React 18, Vite 5, React Router 6, Axios, Context API, CSS propio |
| **Backend** | Node.js (≥ 18), Express 4, `pg`, `jsonwebtoken`, `bcryptjs`, `cookie-parser`, `cors`, `dotenv` |
| **Base de datos** | PostgreSQL 14+ |
| **API externa** | API pública de la tienda de Steam (no requiere API key) |
| **Deploy** | Vercel (frontend) · Render (backend) · PostgreSQL en la nube (Neon / Render) |

---

## 🧱 Arquitectura

```
┌──────────────────────┐   /api/*    ┌───────────────────────┐   SQL   ┌──────────────┐
│  Frontend (React)    │ ──────────▶ │  Backend (Express)    │ ──────▶ │  PostgreSQL  │
│  Vite · Vercel       │ ◀────────── │  API REST · Render    │ ◀────── │              │
└──────────────────────┘  JSON +     └───────────┬───────────┘         └──────────────┘
                          cookie JWT             │ fetch + caché en memoria
                                                 ▼
                                      ┌───────────────────────┐
                                      │  Steam Store API      │
                                      └───────────────────────┘
```

- **El frontend nunca llama a Steam directamente**: Steam no habilita CORS, así que el backend hace de intermediario. Además cachea las respuestas en memoria (detalles 6 h, listas 30 min) para no repetir pedidos.
- Al agregar un juego a la biblioteca o a una colección se guarda una copia mínima de sus datos en la tabla `games`, para que la biblioteca, las colecciones y las estadísticas funcionen sin volver a consultar Steam.
- En desarrollo, Vite redirige `/api` al backend local (proxy); en producción lo hace el *rewrite* de `vercel.json`. Así frontend y API comparten origen y la cookie funciona sin problemas.

---

## 📁 Estructura del repositorio

```
TPFINAL/
├── backend/
│   ├── db/
│   │   ├── schema.sql        # Esquema completo de la base
│   │   ├── run-schema.js     # npm run db:schema
│   │   └── seed.js           # npm run seed (cuenta demo)
│   └── src/
│       ├── index.js          # Punto de entrada (verifica la DB y levanta el server)
│       ├── app.js            # Express: CORS, middlewares y rutas
│       ├── db.js             # Pool de PostgreSQL y helper de transacciones
│       ├── middleware/       # requireAuth, manejo de errores
│       ├── routes/           # auth, games, library, reviews, collections, profile, activity, stats
│       ├── services/steam.js # Cliente de la API de Steam + caché
│       └── utils/            # validaciones, errores HTTP, actividad
└── frontend/
    ├── vercel.json           # Rewrites a la API y fallback de la SPA
    ├── vite.config.js        # Proxy /api en desarrollo
    └── src/
        ├── pages/            # Home, Explore, GameDetail, Library, Collections, CollectionDetail,
        │                     # Profile, Stats, Login, Register, NotFound
        ├── components/       # Layout, GameCard, StarRating, Modal, BarChart, ReviewEditor, ...
        ├── context/          # AuthContext, LibraryContext
        ├── services/         # Cliente Axios y servicios por recurso
        ├── hooks/            # useDebounce
        ├── utils/            # constantes y formateo
        └── styles/           # global.css
```

---

## 🚀 Instalación y ejecución local

### Requisitos
- Node.js **18 o superior**
- PostgreSQL **14 o superior** (local o en la nube)

### 1. Clonar el repositorio
```bash
git clone https://github.com/gzolotow/TPFINAL.git
cd TPFINAL
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env      # completar DATABASE_URL, JWT_SECRET, DEMO_EMAIL, DEMO_PASSWORD...
npm run db:schema         # crea las tablas (⚠️ borra y recrea todo)
npm run seed              # opcional: carga la cuenta demo
npm run dev               # API en http://localhost:3000
```

Comprobación rápida: `GET http://localhost:3000/api/health` → `{ "ok": true }`

### 3. Frontend (en otra terminal)
```bash
cd frontend
npm install
cp .env.example .env      # VITE_API_URL=/api
npm run dev               # App en http://localhost:5173
```

### Scripts disponibles

| Carpeta | Script | Descripción |
|---|---|---|
| backend | `npm run dev` | Servidor con recarga automática (`node --watch`) |
| backend | `npm start` | Servidor en modo producción |
| backend | `npm run db:schema` | Ejecuta `schema.sql` (borra y recrea las tablas) |
| backend | `npm run seed` | Crea/recrea la cuenta demo con datos de ejemplo |
| frontend | `npm run dev` | Servidor de desarrollo de Vite |
| frontend | `npm run build` | Build de producción en `dist/` |
| frontend | `npm run preview` | Sirve el build localmente |

---

## 🔐 Variables de entorno

Los archivos `.env` **no se suben al repositorio**; hay un `.env.example` en cada carpeta.

### `backend/.env`

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor | `3000` |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL | `postgresql://postgres:postgres@localhost:5432/mycollection` |
| `DATABASE_SSL` | `true` si la base exige SSL (Neon, Render) | `false` |
| `JWT_SECRET` | Secreto para firmar los tokens (largo y aleatorio) | — |
| `JWT_EXPIRES_IN` | Duración del token | `7d` |
| `CORS_ORIGIN` | Origen(es) permitidos, separados por coma | `http://localhost:5173` |
| `NODE_ENV` | `development` / `production` (en producción la cookie es `Secure`) | `development` |
| `DEMO_EMAIL` / `DEMO_PASSWORD` | Credenciales de la cuenta demo (solo para el seed) | — |

### `frontend/.env`

| Variable | Descripción | Valor |
|---|---|---|
| `VITE_API_URL` | URL base de la API | `/api` |

---

## 🧪 Cuenta demo

`npm run seed` crea el usuario **`demo_gamer`** (con el correo y contraseña definidos en `DEMO_EMAIL` / `DEMO_PASSWORD`) con historia ya cargada:

- 15 juegos reales de Steam (The Witcher 3, Elden Ring, Hollow Knight, Stardew Valley, Celeste, Disco Elysium, etc.) en distintos estados, con puntuaciones, horas, favoritos y reseñas.
- 3 colecciones: *Mundos abiertos para perderse*, *Joyas indie* y *Para las vacaciones*.
- Actividad con fechas pasadas, para que las estadísticas y el historial tengan contenido.

Si Steam no responde, el seed usa datos de respaldo (sin portada), así que también funciona sin internet. Es reproducible: si la cuenta ya existe, la borra y la vuelve a crear.

---

## 🗄 Base de datos

Esquema completo en [`backend/db/schema.sql`](backend/db/schema.sql).

| Tabla | Descripción |
|---|---|
| `users` | Usuarios. `username` y `email` únicos sin distinguir mayúsculas. Perfil, géneros/plataformas favoritas y objetivo anual. |
| `games` | Copia mínima de los datos de Steam (id = appid de Steam): nombre, portada, fecha, géneros, plataformas, Metacritic. |
| `library_items` | Relación usuario ↔ juego: estado, favorito, puntuación (1-5), horas, plataforma, fechas. Único por `(user_id, game_id)`. |
| `reviews` | Una reseña por usuario y juego. FK compuesta a `library_items` con `ON DELETE CASCADE`: si se quita el juego de la biblioteca, se borra la reseña. |
| `collections` | Colecciones del usuario (nombre único por usuario). |
| `collection_items` | Relación N a N colección ↔ juego. |
| `activity` | Historial de acciones del usuario (detalles en JSONB). |

```
users 1──N library_items N──1 games
  │            │ 1
  │            └──0..1 reviews
  ├──N collections 1──N collection_items N──1 games
  └──N activity
```

---

## 📡 API REST

Base: `/api`. Todas las rutas, salvo `/auth/*` y `/health`, requieren sesión (cookie `mc_token` o header `Authorization: Bearer <token>` para probar con Postman).
Los errores se devuelven como `{ "error": "mensaje", "details": { "campo": "mensaje" } }`.

### Autenticación
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register` | Crea una cuenta e inicia sesión |
| POST | `/auth/login` | Inicia sesión con correo o nombre de usuario |
| POST | `/auth/logout` | Cierra la sesión (borra la cookie) |
| GET | `/auth/me` | Usuario de la sesión actual |

### Juegos (Steam)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/games/featured` | Destacados de la tienda |
| GET | `/games/search?q=&genre=&platform=&sort=` | Búsqueda con filtros y orden |
| GET | `/games/:id` | Detalle completo de un juego |

### Biblioteca
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/library?status=&favorite=&q=&sort=` | Mi biblioteca con filtros |
| GET | `/library/:gameId` | Estado de un juego en mi biblioteca |
| POST | `/library` | Agrega un juego |
| PATCH | `/library/:gameId` | Edita estado, favorito, puntuación, horas o plataforma |
| DELETE | `/library/:gameId` | Quita un juego (y su reseña) |

### Reseñas
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/reviews` | Todas mis reseñas |
| GET | `/reviews/:gameId` | Mi reseña de un juego |
| PUT | `/reviews/:gameId` | Crea o edita la reseña |
| DELETE | `/reviews/:gameId` | Borra la reseña |

### Colecciones
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/collections` | Mis colecciones (con cantidad y hasta 4 portadas) |
| POST | `/collections` | Crea una colección |
| GET | `/collections/:id` | Detalle con sus juegos |
| PATCH | `/collections/:id` | Edita nombre / descripción |
| DELETE | `/collections/:id` | Borra la colección |
| POST | `/collections/:id/games` | Agrega un juego |
| DELETE | `/collections/:id/games/:gameId` | Quita un juego |

### Perfil, actividad y estadísticas
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/profile` | Datos del usuario + contadores |
| PATCH | `/profile` | Edita los datos personales |
| GET | `/activity?limit=20` | Actividad reciente |
| GET | `/stats?year=2026` | Estadísticas del usuario |
| GET | `/health` | Estado del servidor |

---

## 🛡 Seguridad

- **Contraseñas** hasheadas con `bcrypt` (10 rondas); nunca se devuelve `password_hash`.
- **JWT en cookie `httpOnly`** (inaccesible desde JavaScript → protege contra XSS), `SameSite=Lax` (protege contra CSRF) y `Secure` en producción.
- Mismo mensaje de error para "usuario inexistente" y "contraseña incorrecta", para no revelar qué cuentas existen.
- **Consultas parametrizadas** en todo el backend; los ordenamientos usan un mapa fijo de columnas, nunca texto del usuario dentro del SQL.
- **Aislamiento por usuario**: cada consulta filtra por `req.user.id`; acceder a una colección ajena responde `404` igual que si no existiera.
- **CORS** restringido al origen del frontend configurado y límite de 100 kB en el body de los requests.
- Operaciones de varios pasos dentro de **transacciones** (`BEGIN` / `COMMIT` / `ROLLBACK`).
- Validación de datos en el backend con errores por campo, que el frontend muestra en cada formulario.

---

## ☁️ Deploy

- **Backend → Render** (`https://mycollection-api.onrender.com`): servicio Node con `npm install` y `npm start`, root `backend/`, y las variables de entorno de producción (`NODE_ENV=production`, `DATABASE_SSL=true`, `CORS_ORIGIN` con la URL de Vercel).
- **Base de datos → PostgreSQL en la nube** (Neon o Render). Se inicializa una vez con `npm run db:schema` y `npm run seed` apuntando a esa `DATABASE_URL`.
- **Frontend → Vercel**: root `frontend/`, build `npm run build`, output `dist/`. El archivo `vercel.json` reenvía `/api/*` al backend de Render y manda el resto de las rutas a `index.html` para que funcione React Router.

> ℹ️ En el plan gratuito de Render el servidor se duerme tras un rato sin uso: la primera petición puede tardar unos segundos.
