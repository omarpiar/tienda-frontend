# PuntoPyme: Sprint 1 y 2 completos (10 historias de usuario)

Backend ASP.NET Core + PostgreSQL, frontend React y una API de demostración para trabajar sin instalar nada más que Node.

| Historia | Qué incluye | Dónde |
|---|---|---|
| HU-01 Login y rol | API-01, JWT, bloqueo a 5 intentos, acceso sin conexión | `Application/Auth`, `pages/LoginPage`, `auth/offline.js` |
| HU-02 Agregar productos a la venta | API-04 (por SKU), buscador, escáner (Enter), carrito | `pages/VentaPage` |
| HU-03 Cobrar | API-07, efectivo con cambio, tarjeta, stock descontado en transacción | `Application/Ventas`, `Infrastructure/Repositories/VentaRepository` |
| HU-04 Inventario y alertas | API-02, API-03, barra de stock con mínimo | `Application/Productos`, `pages/InventarioPage` |
| HU-05 Agregar producto | API-05 | `ProductoService`, `components/ProductoForm` |
| HU-06 Editar producto | API-06 (no cambia stock) | igual |
| HU-07 Vender sin conexión | catálogo en IndexedDB, cola de pendientes, sincronización con `idLocal` idempotente, conflictos | `offline/*`, `pages/PendientesPage` |
| HU-08 Reportes | API-08, hoy / semana / mes, ticket promedio, top 10 | `Application/Reportes`, `pages/ReportesPage` |
| HU-09 Agregar usuario | API-11 | `Application/Usuarios`, `components/UsuarioForm` |
| HU-10 Editar o desactivar usuario | API-09, 10, 12, 13, protege al último administrador | `pages/UsuariosPage` |

Las historias 02, 03, 05, 06 y 08 son de Omar en el backlog; las dejé hechas para que el sistema funcione completo. Compárenlas con lo suyo antes de mezclar.

## Cómo correrlo

### Opción A: demo rápida (solo Node 20+)
```bash
cd frontend
npm install
npm run demo
```
Abre http://localhost:5173. Usuarios: `admin` / `1234` (puede entrar como Administrador o Cajero) y `laura` / `4821` (Cajero).
Arranca una API en memoria con el mismo contrato que el backend .NET; los datos se pierden al cerrarla.

### Opción B: sistema completo (.NET 10 + PostgreSQL)
```bash
docker compose up -d                 # PostgreSQL con el esquema ya creado (db/schema.sql)
cd backend
dotnet run --project src/PuntoPyme.Api     # http://localhost:5080
```
```bash
cd frontend
npm install
npm run dev                          # http://localhost:5173
```
En Desarrollo el API crea sola al administrador y, con `Seed:Demo = true`, a `laura` y 12 productos de ejemplo. Los valores de `appsettings.Development.json` (clave JWT, contraseña de la base, PIN de admin) son **solo para local**; en otros ambientes van en user-secrets o variables de entorno.

Para probar el API a mano: `backend/src/PuntoPyme.Api/PuntoPyme.Api.http` (VS Code con REST Client, Visual Studio o Rider). El documento OpenAPI queda en `/openapi/v1.json`.

Si no tienes Docker, crea la base `puntopyme` en tu PostgreSQL y ejecuta `db/schema.sql`.

## Pruebas
```bash
cd frontend && npm test        # 17 pruebas
cd backend && dotnet test      # xUnit + NSubstitute
```
Las pruebas del frontend incluyen un recorrido completo de la app real: login, venta con internet, venta sin internet, sincronización al volver la conexión, acceso sin conexión, reporte y alta de usuario.

## Qué verifiqué y qué no
- **Verificado:** el frontend compila y pasa sus 17 pruebas; la API de demostración responde con el contrato del catálogo; las capas `Domain` y `Application` y los controladores/manejador de errores del `Api` compilan, y la lógica de negocio (ventas, productos, reportes, usuarios y login) corrió con un arnés de 32 comprobaciones, todas correctas.
- **No verificado:** `Infrastructure` (EF Core, Npgsql, BCrypt, JWT), `Program.cs` y las pruebas xUnit. En mi entorno no se pueden bajar paquetes de NuGet, así que no se compilaron. Si `dotnet build` marca algo, es lo primero que hay que revisar. Mi sospecha principal: nombres de paquetes/versiones en los `.csproj` (usé `10.0.*`) y la API de `HasCheckConstraint`.
- Nunca corrí el backend contra un PostgreSQL real. Lo más delicado ahí es `VentaRepository.RegistrarAsync` (descuento de stock condicional dentro de una transacción): pruébenlo con dos ventas simultáneas del mismo producto.

## Para integrar con su repo
- `db/schema.sql` es para correr rápido en local. Si ustedes usan migraciones de EF, **no lo ejecuten en la misma base**: generen las migraciones con `dotnet ef migrations add ...` a partir de las configuraciones en `Infrastructure/Data/Configurations` (producen el mismo esquema).
- Si ya tienen entidades `Producto`, `Usuario` o `Rol`, usen las suyas y quiten las mías (los nombres de campos usados están en `Domain/Entities`).
- Decisiones del documento que quedaron implementadas: D1 el precio lo pone el servidor; D2 el administrador entra como Administrador o Cajero, el cajero solo como Cajero; D3 el margen se calcula sobre el precio de venta; D5 "stock bajo" incluye los agotados; D6 los reportes usan el día local del dispositivo convertido a UTC; D7 los conflictos de stock al sincronizar los resuelve un administrador.
- Las ventas pendientes se envían con el usuario que las hizo (si otra persona inicia sesión en la misma tablet, esperan a que esa persona entre).

## Pendiente (siguiente etapa del documento)
- Manifest, Service Worker y caché de la interfaz (sección 8). Hoy el catálogo y las ventas sin conexión ya funcionan con IndexedDB, pero la app todavía necesita internet para **abrirse** la primera vez.
- Un token de un usuario desactivado sigue valiendo hasta que venza (8 h); se puede endurecer revisando el estado en cada petición.
- El acceso sin conexión no limita intentos de PIN (la validación es local).
