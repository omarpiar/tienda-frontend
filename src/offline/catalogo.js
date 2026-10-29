import { apiFetch } from '../api/client';
import { estadoStock } from '../lib/stock';
import { kvGet, kvSet } from './db';

const CLAVE = 'catalogo';

/** Baja todo el catálogo (páginas de 200) y lo guarda para vender sin conexión. */
export async function descargarCatalogo(token) {
  let pagina = 1;
  let productos = [];
  let total = Infinity;

  while (productos.length < total) {
    const r = await apiFetch(`/api/productos?estado=todos&pagina=${pagina}&tamanoPagina=200`, { token });
    productos = productos.concat(r.items);
    total = r.total;
    if (r.items.length === 0) break;
    pagina += 1;
  }

  const catalogo = { productos, guardadoEn: new Date().toISOString() };
  await kvSet(CLAVE, catalogo);
  return catalogo;
}

export const leerCatalogo = async () => (await kvGet(CLAVE)) ?? null;

/** Venta hecha sin conexión: baja el stock local para que la caja no venda lo que ya no hay. */
export async function descontarLocal(detalles) {
  const catalogo = await leerCatalogo();
  if (!catalogo) return null;

  for (const d of detalles) {
    const p = catalogo.productos.find((x) => x.id === d.productoId);
    if (p) {
      p.stock = Math.max(0, p.stock - d.cantidad);
      p.estadoStock = estadoStock(p.stock, p.stockMinimo);
    }
  }
  await kvSet(CLAVE, catalogo);
  return catalogo;
}
