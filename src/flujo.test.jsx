// Prueba de punta a punta: la app real de React contra la API de demostración (mock-api) en memoria.
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from './auth/AuthContext';
import { SyncProvider } from './offline/SyncContext';
import App from './App';

let servidor;
const fetchReal = globalThis.fetch;

beforeAll(async () => {
  process.env.PORT = '5081';
  servidor = (await import('../mock-api/server.mjs')).default;
  await new Promise((r) => setTimeout(r, 300));
});
afterAll(() => {
  servidor.closeAllConnections?.();
  servidor.close();
});

afterEach(() => {
  globalThis.fetch = fetchReal;
  vi.restoreAllMocks();
  cleanup();
});

const textoDe = (nombre) => screen.getByRole('button', { name: nombre }).textContent;

const montar = () =>
  render(
    <AuthProvider>
      <SyncProvider>
        <App />
      </SyncProvider>
    </AuthProvider>,
  );

async function entrar(usuario, pin) {
  const u = userEvent.setup();
  await u.type(screen.getByLabelText(/usuario o celular/i), usuario);
  await u.type(screen.getByLabelText(/^pin/i), pin);
  await u.click(screen.getByRole('button', { name: /iniciar sesión/i }));
  return u;
}

async function abrirPerfil(u) {
  await u.click(screen.getByRole('button', { name: /cambiar de perfil/i }));
}

async function cambiarPerfil(u, rol) {
  await abrirPerfil(u);
  await u.click(screen.getByRole('menuitemradio', { name: new RegExp(rol, 'i') }));
}

async function cerrarSesion(u) {
  await abrirPerfil(u);
  await u.click(screen.getByRole('menuitem', { name: /cerrar sesión/i }));
}

describe('flujo completo', () => {
  it('cajero: vende con internet, vende sin internet y al volver se sincroniza', async () => {
    localStorage.clear();
    montar();
    const u = await entrar('laura', '4821');

    // Catálogo descargado: se busca el producto por nombre
    await screen.findByText('Agua natural 1L');
    await u.type(screen.getByLabelText(/buscar producto/i), 'refresco');

    // Venta con conexión (efectivo)
    await u.click(await screen.findByRole('button', { name: /Refresco 600ml/ }));
    await u.type(screen.getByLabelText('Recibido'), '50');
    await u.click(screen.getByRole('button', { name: 'COBRAR' }));
    await screen.findByText(/Venta registrada · V-\d+/);

    // Se cae el internet
    const caido = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    globalThis.fetch = caido;
    window.dispatchEvent(new Event('offline'));
    await screen.findAllByText('Sin conexión');

    await u.click(await screen.findByRole('button', { name: /Agua natural 1L/ }));
    await u.click(screen.getByRole('button', { name: 'Tarjeta' }));
    await u.click(screen.getByRole('button', { name: 'COBRAR' }));
    await screen.findByText(/Venta guardada sin conexión/);
    expect(textoDe(/Pendientes/)).toMatch(/1$/);

    // Vuelve el internet: se envía sola y la cola queda vacía
    globalThis.fetch = fetchReal;
    window.dispatchEvent(new Event('online'));
    await screen.findByText(/1 venta sincronizada/, {}, { timeout: 8000 });
    await waitFor(() => expect(textoDe(/Pendientes/)).not.toMatch(/\d$/));

  });

  it('login incorrecto muestra el mensaje y un cajero no ve Reportes ni Usuarios', async () => {
    localStorage.clear();
    montar();
    const u = await entrar('laura', '0000');
    await screen.findByText('Usuario o PIN incorrectos');

    await u.type(screen.getByLabelText(/^pin/i), '4821');
    await u.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    await screen.findByText('Nueva venta');
    expect(screen.queryByRole('button', { name: 'Reportes' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Usuarios' })).toBeNull();
    await abrirPerfil(u);
    expect(screen.queryByRole('menuitemradio', { name: /administrador/i })).toBeNull();
    await u.keyboard('{Escape}');
  });

  it('administrador: ve el reporte con la venta del test anterior y crea un usuario', async () => {
    localStorage.clear();
    montar();
    const u = await entrar('admin', '1234');
    await screen.findByText('Nueva venta');

    await cambiarPerfil(u, 'Administrador');
    await screen.findByRole('button', { name: 'Reportes' });

    await u.click(screen.getByRole('button', { name: 'Reportes' }));
    await screen.findByText('Ticket promedio');
    await waitFor(() => expect(screen.getByText('Transacciones').nextSibling.textContent).toBe('2'));

    await u.click(screen.getByRole('button', { name: 'Usuarios' }));
    await screen.findByText('Laura Gómez');
    await u.click(screen.getByRole('button', { name: '+ Nuevo usuario' }));
    const dialogo = await screen.findByRole('dialog');
    await u.type(within(dialogo).getByLabelText(/nombre completo/i), 'Pedro Ruiz');
    await u.type(within(dialogo).getByLabelText(/usuario o celular/i), 'Pedro');
    await u.type(within(dialogo).getByLabelText(/^pin/i), '12');
    await u.click(within(dialogo).getByRole('button', { name: 'Guardar' }));
    await within(dialogo).findByText(/de 4 a 6 dígitos/i);

    await u.type(within(dialogo).getByLabelText(/^pin/i), '34');
    await u.click(within(dialogo).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await screen.findByText('Pedro Ruiz');
  });

  it('HU-01 sin conexión: después de entrar una vez con internet, el PIN se valida en el dispositivo', async () => {
    localStorage.clear();
    montar();
    let u = await entrar('laura', '4821');
    await screen.findByText('Nueva venta');
    await cerrarSesion(u);

    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    // PIN incorrecto: se rechaza aun sin internet
    u = await entrar('laura', '0000');
    await screen.findByText('Usuario o PIN incorrectos');

    // PIN correcto: entra con la sesión guardada
    await u.type(screen.getByLabelText(/^pin/i), '4821');
    await u.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    await screen.findByText('Nueva venta');
    expect(screen.getByText('Laura Gómez')).toBeTruthy();
  });

  it('administrador sin conexión puede cambiar a un rol que ya usó en el dispositivo', async () => {
    localStorage.clear();
    montar();
    let u = await entrar('admin', '1234');
    await screen.findByText('Nueva venta');

    await cambiarPerfil(u, 'Administrador');
    await screen.findByRole('button', { name: 'Reportes' });
    await cerrarSesion(u);

    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    u = await entrar('admin', '1234');
    await screen.findByText('Nueva venta');
    await cambiarPerfil(u, 'Administrador');

    await screen.findByRole('button', { name: 'Reportes' });
    expect(screen.getByRole('button', { name: 'Reportes' })).toBeTruthy();
  });

  it('administrador: crea categoría, repone stock, consulta historial y elimina un producto', async () => {
    localStorage.clear();
    montar();
    const u = await entrar('admin', '1234');
    await screen.findByText('Nueva venta');
    await cambiarPerfil(u, 'Administrador');
    await screen.findByRole('button', { name: 'Categorías' });

    await u.click(screen.getByRole('button', { name: 'Categorías' }));
    await u.click(await screen.findByRole('button', { name: '+ Nueva categoría' }));
    let dialogo = await screen.findByRole('dialog');
    await u.type(within(dialogo).getByLabelText(/nombre/i), 'Pruebas E2E');
    await u.click(within(dialogo).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await screen.findByText('Pruebas E2E');

    await u.click(screen.getByRole('button', { name: 'Inventario' }));
    await u.click(await screen.findByRole('button', { name: '+ Agregar producto' }));
    dialogo = await screen.findByRole('dialog');
    await u.type(within(dialogo).getByLabelText(/nombre/i), 'Producto E2E');
    await u.type(within(dialogo).getByLabelText(/código/i), 'E2E-001');
    await within(dialogo).findByRole('option', { name: 'Pruebas E2E' });
    await u.selectOptions(within(dialogo).getByLabelText(/categoría/i), 'Pruebas E2E');
    await u.type(within(dialogo).getByLabelText(/precio de venta/i), '100');
    await u.type(within(dialogo).getByLabelText(/costo de compra/i), '50');
    await u.type(within(dialogo).getByLabelText(/stock inicial/i), '2');
    await u.type(within(dialogo).getByLabelText(/stock mínimo/i), '1');
    await u.click(within(dialogo).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await screen.findByText('Producto E2E');

    await u.click(await screen.findByRole('button', { name: /Producto E2E/ }));
    dialogo = await screen.findByRole('dialog');
    await u.type(within(dialogo).getByLabelText(/reponer stock/i), '5');
    await u.click(within(dialogo).getByRole('button', { name: 'Reponer' }));
    await within(dialogo).findByText('Stock repuesto correctamente.');

    await u.click(within(dialogo).getByRole('button', { name: 'Ver historial' }));
    await within(dialogo).findByText('Reposición de stock');
    await within(dialogo).findByText('Creación');

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await u.click(within(dialogo).getByRole('button', { name: 'Eliminar producto' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(screen.queryByText('Producto E2E')).toBeNull());
  });
});
