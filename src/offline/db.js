// IndexedDB: catálogo local ("kv") y cola de ventas pendientes ("pendientes").
const NOMBRE = 'puntopyme';
let promesa;

function abrir() {
  promesa ??= new Promise((ok, err) => {
    const r = indexedDB.open(NOMBRE, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore('kv');
      r.result.createObjectStore('pendientes', { keyPath: 'idLocal' });
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => err(r.error);
  });
  return promesa;
}

async function tx(almacen, modo, fn) {
  const db = await abrir();
  return new Promise((ok, err) => {
    const t = db.transaction(almacen, modo);
    const req = fn(t.objectStore(almacen));
    t.oncomplete = () => ok(req?.result);
    t.onerror = () => err(t.error);
    t.onabort = () => err(t.error);
  });
}

export const kvGet = (clave) => tx('kv', 'readonly', (s) => s.get(clave));
export const kvSet = (clave, valor) => tx('kv', 'readwrite', (s) => s.put(valor, clave));
export const pendientesTodas = () => tx('pendientes', 'readonly', (s) => s.getAll());
export const pendientesGuardar = (venta) => tx('pendientes', 'readwrite', (s) => s.put(venta));
export const pendientesBorrar = (idLocal) => tx('pendientes', 'readwrite', (s) => s.delete(idLocal));
