// Última consulta de inventario por filtro, para poder consultar sin conexión.
const PREFIJO = 'puntopyme.inventario.';

export function guardarInventario(clave, datos) {
  try {
    localStorage.setItem(PREFIJO + clave, JSON.stringify({ datos, guardadoEn: new Date().toISOString() }));
  } catch {
    /* almacenamiento lleno: se ignora, es solo una ayuda */
  }
}

export function leerInventario(clave) {
  try {
    return JSON.parse(localStorage.getItem(PREFIJO + clave));
  } catch {
    return null;
  }
}
