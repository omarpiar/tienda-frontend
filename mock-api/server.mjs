// API de demostración en memoria. Mismo contrato que el backend .NET (sección 7 del catálogo de APIs),
// para trabajar el frontend sin .NET ni PostgreSQL. Los datos se pierden al reiniciar.
import http from 'node:http';

const PORT = Number(process.env.PORT ?? 5080);
const rolId = (n) => (n === 'Administrador' ? 1 : 2);
const norm = (v) => String(v ?? '').replace(/\s+/g, '').toLowerCase();

class Problema extends Error {
  constructor(status, code, detail, extra = {}) { super(detail); Object.assign(this, { status, code, extra }); }
}
const validacion = (errores) => new Problema(400, 'VALIDACION', 'Los datos enviados no son válidos.', { errors: errores });

// ---------- datos ----------
let sigUsuario = 1, sigProducto = 1, sigVenta = 1;
const usuarios = [];
const productos = [];
const ventas = [];

const nuevoUsuario = (nombreCompleto, nombreUsuario, pin, rol) => {
  const u = { id: sigUsuario++, nombreCompleto, nombreUsuario, pin, rolId: rolId(rol), activo: true, intentos: 0, bloqueadoHasta: 0 };
  usuarios.push(u); return u;
};
nuevoUsuario('Administrador PuntoPyme', 'admin', '1234', 'Administrador');
nuevoUsuario('Laura Gómez', 'laura', '4821', 'Cajero');

[
  ['Refresco 600ml', '7501055300013', 'Bebidas', 18, 13, 40, 10],
  ['Agua natural 1L', '7501055300020', 'Bebidas', 12, 8, 60, 12],
  ['Pan blanco', '7501000100011', 'Panadería', 32, 24, 6, 8],
  ['Detergente 1L', '7501025400017', 'Limpieza', 45, 33, 22, 6],
  ['Aceite Vegetal 900ml', '770123456789', 'Abarrotes', 75, 58, 3, 5],
  ['Arroz 1kg', '7501000200028', 'Abarrotes', 28, 21, 35, 8],
  ['Frijol negro 1kg', '7501000200035', 'Abarrotes', 38, 29, 0, 8],
  ['Leche entera 1L', '7501020500042', 'Lácteos', 27, 21, 18, 10],
  ['Huevo 12 piezas', '7501000300059', 'Abarrotes', 52, 42, 4, 6],
  ['Papel higiénico 4 rollos', '7501025400064', 'Limpieza', 36, 27, 25, 6],
  ['Jabón de barra', '7501025400071', 'Limpieza', 14, 10, 2, 6],
  ['Galletas surtidas', '7501000400086', 'Botanas', 22, 16, 30, 8],
].forEach(([nombre, sku, categoria, precioVenta, costoCompra, stock, stockMinimo]) =>
  productos.push({ id: sigProducto++, nombre, sku, categoria, precioVenta, costoCompra, stock, stockMinimo }));

// ---------- utilidades ----------
const estadoStock = (p) => (p.stock <= 0 ? 'Agotado' : p.stock <= p.stockMinimo ? 'Bajo' : 'Normal');
const lista = (p) => ({ id: p.id, nombre: p.nombre, sku: p.sku, categoria: p.categoria, precioVenta: p.precioVenta, stock: p.stock, stockMinimo: p.stockMinimo, estadoStock: estadoStock(p) });
const detalle = (p, costos) => {
  const ganancia = costos ? +(p.precioVenta - p.costoCompra).toFixed(2) : null;
  return {
    id: p.id, nombre: p.nombre, sku: p.sku, categoria: p.categoria, precioVenta: p.precioVenta,
    costoCompra: costos ? p.costoCompra : null, ganancia,
    margenPorcentaje: costos ? (p.precioVenta === 0 ? 0 : Math.round((ganancia / p.precioVenta) * 1000) / 10) : null,
    stock: p.stock, stockMinimo: p.stockMinimo, estadoStock: estadoStock(p),
  };
};
const usuarioDto = (u) => ({ id: u.id, nombreCompleto: u.nombreCompleto, nombreUsuario: u.nombreUsuario, rol: u.rolId === 1 ? 'Administrador' : 'Cajero', activo: u.activo });
const ventaDto = (v) => ({ ...v, detalles: v.detalles.map((d) => ({ ...d })) });

const firmar = (u, rol) => {
  const exp = Date.now() + 8 * 3600_000;
  const cuerpo = Buffer.from(JSON.stringify({ sub: u.id, name: u.nombreUsuario, role: rol, exp })).toString('base64url');
  return { token: `mock.${cuerpo}.firma`, expiraEnUtc: new Date(exp).toISOString() };
};
function autenticar(req) {
  const h = req.headers.authorization ?? '';
  if (!h.startsWith('Bearer ')) throw new Problema(401, 'NO_AUTENTICADO', 'Inicia sesión para continuar.');
  try {
    const c = JSON.parse(Buffer.from(h.split('.')[1], 'base64url').toString());
    if (c.exp < Date.now()) throw new Error('vencido');
    return c;
  } catch { throw new Problema(401, 'NO_AUTENTICADO', 'Tu sesión venció. Inicia sesión de nuevo.'); }
}
const soloAdmin = (c) => { if (c.role !== 'Administrador') throw new Problema(403, 'SIN_PERMISO', 'Solo un administrador puede hacer esto.'); };
const pagina = (q, n, d, max) => Math.min(Math.max(parseInt(q.get(n) ?? d, 10) || d, 1), max);

// ---------- rutas ----------
const rutas = [];
const ruta = (metodo, patron, fn) => rutas.push({ metodo, re: new RegExp(`^${patron}$`), fn });

ruta('POST', '/api/auth/login', (req, { cuerpo }) => {
  const err = {};
  if (!String(cuerpo.nombreUsuario ?? '').trim()) err.nombreUsuario = ['Escribe tu usuario.'];
  if (!/^\d{4,6}$/.test(cuerpo.pin ?? '')) err.pin = ['El PIN debe tener de 4 a 6 dígitos.'];
  if (!['Administrador', 'Cajero'].includes(cuerpo.rol)) err.rol = ['Elige Administrador o Cajero.'];
  if (Object.keys(err).length) throw validacion(err);

  const u = usuarios.find((x) => x.nombreUsuario === norm(cuerpo.nombreUsuario));
  const malas = () => new Problema(401, 'CREDENCIALES_INVALIDAS', 'Usuario o PIN incorrectos');
  if (!u || !u.activo) throw malas();
  if (u.bloqueadoHasta > Date.now()) {
    const s = Math.ceil((u.bloqueadoHasta - Date.now()) / 1000);
    throw new Problema(429, 'USUARIO_BLOQUEADO', `Demasiados intentos. Intenta de nuevo en ${s} segundos.`, { headers: { 'Retry-After': String(s) } });
  }
  if (u.pin !== cuerpo.pin) {
    if (++u.intentos >= 5) { u.bloqueadoHasta = Date.now() + 60_000; u.intentos = 0; }
    throw malas();
  }
  u.intentos = 0; u.bloqueadoHasta = 0;
  if (cuerpo.rol === 'Administrador' && u.rolId !== 1) throw new Problema(403, 'ROL_NO_PERMITIDO', 'Tu usuario no tiene permiso para entrar como Administrador.');
  return [200, { ...firmar(u, cuerpo.rol), usuario: { id: u.id, nombreCompleto: u.nombreCompleto, nombreUsuario: u.nombreUsuario, rol: cuerpo.rol } }];
});

ruta('GET', '/api/productos', (req, { q }) => {
  autenticar(req);
  const estado = q.get('estado') ?? 'todos';
  if (!['todos', 'stockBajo', 'agotados'].includes(estado)) throw validacion({ estado: ['Usa todos, stockBajo o agotados.'] });
  const buscar = (q.get('buscar') ?? '').trim().toLowerCase();
  let r = productos.filter((p) => !buscar || p.nombre.toLowerCase().includes(buscar) || p.sku.toLowerCase().includes(buscar));
  if (estado === 'stockBajo') r = r.filter((p) => p.stock <= p.stockMinimo);
  if (estado === 'agotados') r = r.filter((p) => p.stock === 0);
  r.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const pag = pagina(q, 'pagina', 1, 1e9), tam = pagina(q, 'tamanoPagina', 50, 200);
  return [200, { items: r.slice((pag - 1) * tam, pag * tam).map(lista), total: r.length, pagina: pag, tamanoPagina: tam }];
});
ruta('GET', '/api/productos/sku/([^/]+)', (req, { m }) => {
  autenticar(req);
  const p = productos.find((x) => x.sku.toLowerCase() === decodeURIComponent(m[1]).trim().toLowerCase());
  if (!p) throw new Problema(404, 'PRODUCTO_NO_ENCONTRADO', 'No encontramos un producto con ese código.');
  return [200, lista(p)];
});
ruta('GET', '/api/productos/(\\d+)', (req, { m }) => {
  const c = autenticar(req);
  const p = productos.find((x) => x.id === +m[1]);
  if (!p) throw new Problema(404, 'PRODUCTO_NO_ENCONTRADO', 'No encontramos ese producto.');
  return [200, detalle(p, c.role === 'Administrador')];
});

function validarProducto(b, alta, excluirId) {
  const err = {};
  const nombre = String(b.nombre ?? '').trim(), sku = String(b.sku ?? '').trim();
  if (!nombre) err.nombre = ['Escribe el nombre del producto.'];
  if (!sku) err.sku = ['Escribe el código (SKU).'];
  if (b.precioVenta == null) err.precioVenta = ['Escribe el precio de venta.'];
  else if (b.precioVenta < 0) err.precioVenta = ['El precio no puede ser negativo.'];
  if (b.costoCompra < 0) err.costoCompra = ['El costo no puede ser negativo.'];
  if (alta && b.stock < 0) err.stock = ['El stock no puede ser negativo.'];
  if (b.stockMinimo < 0) err.stockMinimo = ['El stock mínimo no puede ser negativo.'];
  if (Object.keys(err).length) throw validacion(err);
  const precio = +b.precioVenta, costo = +(b.costoCompra ?? 0);
  if (precio < costo) throw new Problema(400, 'PRECIO_MENOR_AL_COSTO', 'El precio de venta no puede ser menor al costo de compra.');
  if (productos.some((p) => p.sku.toLowerCase() === sku.toLowerCase() && p.id !== excluirId)) throw new Problema(409, 'SKU_DUPLICADO', 'Ya existe un producto con ese código (SKU).');
  return { nombre, sku, categoria: String(b.categoria ?? '').trim() || null, precioVenta: precio, costoCompra: costo, stockMinimo: b.stockMinimo ?? 5 };
}
ruta('POST', '/api/productos', (req, { cuerpo }) => {
  soloAdmin(autenticar(req));
  const p = { id: sigProducto++, ...validarProducto(cuerpo, true), stock: cuerpo.stock ?? 0 };
  productos.push(p);
  return [201, detalle(p, true)];
});
ruta('PUT', '/api/productos/(\\d+)', (req, { m, cuerpo }) => {
  soloAdmin(autenticar(req));
  const p = productos.find((x) => x.id === +m[1]);
  if (!p) throw new Problema(404, 'PRODUCTO_NO_ENCONTRADO', 'No encontramos ese producto.');
  Object.assign(p, validarProducto(cuerpo, false, p.id)); // el stock no se toca
  return [200, detalle(p, true)];
});

ruta('POST', '/api/ventas', (req, { cuerpo: b }) => {
  const c = autenticar(req);
  const err = {};
  if (!b.idLocal) err.idLocal = ['Falta el identificador de la venta.'];
  if (!b.fechaVentaUtc) err.fechaVentaUtc = ['Falta la fecha de la venta.'];
  if (!['Efectivo', 'Tarjeta'].includes(b.metodoPago)) err.metodoPago = ['Elige Efectivo o Tarjeta.'];
  if (Object.keys(err).length) throw validacion(err);
  if (!Array.isArray(b.detalles) || !b.detalles.length) throw new Problema(400, 'CARRITO_VACIO', 'Agrega al menos un producto para cobrar.');
  if (b.detalles.some((d) => !Number.isInteger(d.cantidad) || d.cantidad <= 0)) throw validacion({ detalles: ['Cada cantidad debe ser un entero mayor que 0.'] });
  if (new Date(b.fechaVentaUtc) > Date.now() + 5 * 60_000) throw validacion({ fechaVentaUtc: ['La fecha de la venta no puede estar en el futuro.'] });

  const previa = ventas.find((v) => v.idLocal === b.idLocal);
  if (previa) return [200, ventaDto(previa)]; // idempotente

  const pedidos = new Map();
  for (const d of b.detalles) pedidos.set(d.productoId, (pedidos.get(d.productoId) ?? 0) + d.cantidad);
  const faltan = [...pedidos.keys()].filter((id) => !productos.some((p) => p.id === id));
  if (faltan.length) throw new Problema(400, 'PRODUCTO_NO_ENCONTRADO', 'Algunos productos del carrito ya no existen.', { productoIds: faltan });
  const faltantes = [...pedidos].map(([id, n]) => ({ p: productos.find((x) => x.id === id), n })).filter(({ p, n }) => n > p.stock)
    .map(({ p, n }) => ({ productoId: p.id, nombre: p.nombre, disponible: p.stock, solicitado: n }));
  if (faltantes.length) throw new Problema(409, 'STOCK_INSUFICIENTE', 'Algunos productos no tienen existencias suficientes.', { faltantes });

  const detalles = [...pedidos].map(([id, n]) => {
    const p = productos.find((x) => x.id === id);
    return { productoId: id, nombre: p.nombre, cantidad: n, precioUnitario: p.precioVenta, subtotal: +(p.precioVenta * n).toFixed(2) };
  });
  const total = +detalles.reduce((s, d) => s + d.subtotal, 0).toFixed(2);
  let montoRecibido = null, cambio = null;
  if (b.metodoPago === 'Efectivo') {
    if (b.montoRecibido == null || b.montoRecibido < total) throw new Problema(400, 'MONTO_INSUFICIENTE', 'El monto recibido no alcanza para cubrir el total.');
    montoRecibido = b.montoRecibido; cambio = +(b.montoRecibido - total).toFixed(2);
  }
  for (const [id, n] of pedidos) productos.find((x) => x.id === id).stock -= n;
  const u = usuarios.find((x) => x.id === c.sub);
  const venta = {
    id: sigVenta++, folio: '', idLocal: b.idLocal, fechaVentaUtc: new Date(b.fechaVentaUtc).toISOString(), fechaRegistroUtc: new Date().toISOString(),
    cajero: u?.nombreCompleto ?? '', metodoPago: b.metodoPago, total, montoRecibido, cambio, detalles,
  };
  venta.folio = `V-${String(venta.id).padStart(6, '0')}`;
  ventas.push(venta);
  return [201, ventaDto(venta)];
});

ruta('GET', '/api/reportes/ventas', (req, { q }) => {
  soloAdmin(autenticar(req));
  const d = new Date(q.get('desdeUtc')), h = new Date(q.get('hastaUtc'));
  if (isNaN(d) || isNaN(h) || h <= d) throw validacion({ hastaUtc: ['La fecha final debe ser mayor que la inicial.'] });
  if ((h - d) / 86400000 > 366) throw validacion({ hastaUtc: ['El rango no puede pasar de 366 días.'] });
  const en = ventas.filter((v) => new Date(v.fechaVentaUtc) >= d && new Date(v.fechaVentaUtc) < h);
  const total = +en.reduce((s, v) => s + v.total, 0).toFixed(2);
  const porProd = new Map();
  for (const v of en) for (const x of v.detalles) {
    const a = porProd.get(x.productoId) ?? { productoId: x.productoId, nombre: x.nombre, cantidadVendida: 0 };
    a.cantidadVendida += x.cantidad; porProd.set(x.productoId, a);
  }
  const top = [...porProd.values()].sort((a, b) => b.cantidadVendida - a.cantidadVendida || a.nombre.localeCompare(b.nombre, 'es')).slice(0, 10);
  return [200, { desdeUtc: d.toISOString(), hastaUtc: h.toISOString(), totalVentas: total, numeroTransacciones: en.length, ticketPromedio: en.length ? Math.round((total / en.length) * 100) / 100 : 0, productosMasVendidos: top }];
});

ruta('GET', '/api/usuarios', (req, { q }) => {
  soloAdmin(autenticar(req));
  const b = (q.get('buscar') ?? '').trim().toLowerCase(), rol = q.get('rol'), act = q.get('activo');
  let r = usuarios.filter((u) => !b || u.nombreCompleto.toLowerCase().includes(b) || u.nombreUsuario.includes(b));
  if (rol) r = r.filter((u) => u.rolId === rolId(rol));
  if (act === 'true' || act === 'false') r = r.filter((u) => u.activo === (act === 'true'));
  return [200, r.sort((a, b2) => a.nombreCompleto.localeCompare(b2.nombreCompleto, 'es')).map(usuarioDto)];
});
ruta('GET', '/api/usuarios/(\\d+)', (req, { m }) => {
  soloAdmin(autenticar(req));
  return [200, usuarioDto(usuarioOrThrow(+m[1]))];
});
const usuarioOrThrow = (id) => usuarios.find((u) => u.id === id) ?? (() => { throw new Problema(404, 'USUARIO_NO_ENCONTRADO', 'No encontramos ese usuario.'); })();
const adminsActivos = () => usuarios.filter((u) => u.rolId === 1 && u.activo).length;
function validarUsuario(b, pinObligatorio, excluirId) {
  const err = {}, nombreUsuario = norm(b.nombreUsuario);
  if (!String(b.nombreCompleto ?? '').trim()) err.nombreCompleto = ['Escribe el nombre completo.'];
  if (!nombreUsuario) err.nombreUsuario = ['Escribe el usuario o celular.'];
  if (!['Administrador', 'Cajero'].includes(b.rol)) err.rol = ['Elige Administrador o Cajero.'];
  if ((pinObligatorio || b.pin) && !/^\d{4,6}$/.test(b.pin ?? '')) err.pin = ['El PIN debe tener de 4 a 6 dígitos.'];
  if (Object.keys(err).length) throw validacion(err);
  if (usuarios.some((u) => u.nombreUsuario === nombreUsuario && u.id !== excluirId)) throw new Problema(409, 'USUARIO_DUPLICADO', 'Ya existe un usuario con ese nombre.');
  return nombreUsuario;
}
ruta('POST', '/api/usuarios', (req, { cuerpo: b }) => {
  soloAdmin(autenticar(req));
  const nombreUsuario = validarUsuario(b, true);
  return [201, usuarioDto(nuevoUsuario(b.nombreCompleto.trim(), nombreUsuario, b.pin, b.rol))];
});
ruta('PUT', '/api/usuarios/(\\d+)', (req, { m, cuerpo: b }) => {
  soloAdmin(autenticar(req));
  const u = usuarioOrThrow(+m[1]);
  const nombreUsuario = validarUsuario(b, false, u.id);
  if (u.rolId === 1 && rolId(b.rol) !== 1 && u.activo && adminsActivos() <= 1) throw new Problema(409, 'ULTIMO_ADMINISTRADOR', 'El sistema debe conservar al menos un administrador activo.');
  Object.assign(u, { nombreCompleto: b.nombreCompleto.trim(), nombreUsuario, rolId: rolId(b.rol) });
  if (b.pin) Object.assign(u, { pin: b.pin, intentos: 0, bloqueadoHasta: 0 });
  return [200, usuarioDto(u)];
});
ruta('PATCH', '/api/usuarios/(\\d+)/estado', (req, { m, cuerpo: b }) => {
  const c = autenticar(req); soloAdmin(c);
  if (typeof b.activo !== 'boolean') throw validacion({ activo: ['Indica si el usuario queda activo o inactivo.'] });
  const u = usuarioOrThrow(+m[1]);
  if (!b.activo && u.activo) {
    if (u.id === c.sub) throw new Problema(409, 'NO_PUEDES_DESACTIVARTE', 'No puedes desactivar tu propia cuenta.');
    if (u.rolId === 1 && adminsActivos() <= 1) throw new Problema(409, 'ULTIMO_ADMINISTRADOR', 'El sistema debe conservar al menos un administrador activo.');
  }
  u.activo = b.activo;
  if (b.activo) { u.intentos = 0; u.bloqueadoHasta = 0; }
  return [200, usuarioDto(u)];
});
ruta('GET', '/health', () => [200, { estado: 'ok' }]);

// ---------- servidor ----------
const server = http.createServer(async (req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': req.headers.origin ?? '*',
    'Access-Control-Allow-Headers': 'content-type, authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Expose-Headers': 'Retry-After, Location',
  };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }

  const url = new URL(req.url, 'http://x');
  let headersExtra = {};
  try {
    const raw = await new Promise((ok) => { let s = ''; req.on('data', (c) => (s += c)); req.on('end', () => ok(s)); });
    let cuerpo = {};
    try { cuerpo = raw ? JSON.parse(raw) : {}; } catch { throw new Problema(400, 'VALIDACION', 'El cuerpo no es un JSON válido.'); }
    for (const r of rutas) {
      const m = r.metodo === req.method && r.re.exec(url.pathname);
      if (m) {
        const [status, datos] = r.fn(req, { q: url.searchParams, m, cuerpo });
        res.writeHead(status, { 'Content-Type': 'application/json', ...cors });
        return res.end(JSON.stringify(datos));
      }
    }
    throw new Problema(404, 'RUTA_NO_ENCONTRADA', 'Ruta no encontrada.');
  } catch (e) {
    if (!(e instanceof Problema)) { console.error(e); e = new Problema(500, 'ERROR', 'Error interno del servidor de demostración.'); }
    headersExtra = e.extra?.headers ?? {};
    const { headers, ...resto } = e.extra ?? {};
    res.writeHead(e.status, { 'Content-Type': 'application/problem+json', ...cors, ...headersExtra });
    res.end(JSON.stringify({ status: e.status, title: e.message, detail: e.message, code: e.code, ...resto }));
  }
});

export default server;
server.listen(PORT, () => console.log(`API de demostración en http://localhost:${PORT}  (admin/1234, laura/4821)`));
