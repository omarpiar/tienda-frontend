import { useEffect, useState } from 'react';
import { useAuth } from './auth/AuthContext';
import { useSync } from './offline/SyncContext';
import LoginPage from './pages/LoginPage';
import VentaPage from './pages/VentaPage';
import InventarioPage from './pages/InventarioPage';
import PendientesPage from './pages/PendientesPage';
import ReportesPage from './pages/ReportesPage';
import UsuariosPage from './pages/UsuariosPage';

const VISTAS = [
  { id: 'venta', texto: 'Vender', solo: null },
  { id: 'inventario', texto: 'Inventario', solo: null },
  { id: 'reportes', texto: 'Reportes', solo: 'Administrador' },
  { id: 'usuarios', texto: 'Usuarios', solo: 'Administrador' },
  { id: 'pendientes', texto: 'Pendientes', solo: null },
];

export default function App() {
  const { sesion, cerrarSesion } = useAuth();
  const { enLinea, pendientes, aviso, limpiarAviso } = useSync();
  const [vista, setVista] = useState('venta');

  // Al cambiar de persona o de rol, se vuelve a la pantalla de venta
  useEffect(() => setVista('venta'), [sesion?.usuario?.id, sesion?.usuario?.rol]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(limpiarAviso, 6000);
    return () => clearTimeout(t);
  }, [aviso, limpiarAviso]);

  if (!sesion) return <LoginPage />;

  const rol = sesion.usuario.rol;
  const visibles = VISTAS.filter((v) => !v.solo || v.solo === rol);
  const conflictos = pendientes.filter((p) => p.estado !== 'pendiente').length;

  return (
    <div className="app">
      <header className="barra">
        <h1 className="marca marca--chica">PuntoPyme</h1>
        <div className="barra__sesion">
          <span className={`conexion ${enLinea ? 'conexion--si' : 'conexion--no'}`}>
            {enLinea ? 'En línea' : 'Sin conexión'}
          </span>
          <span>{sesion.usuario.nombreCompleto}</span>
          <span className="etiqueta etiqueta--rol">{rol}</span>
          <button className="boton boton--texto" onClick={cerrarSesion}>Cerrar sesión</button>
        </div>
      </header>

      <nav className="nav" aria-label="Secciones">
        {visibles.map((v) => (
          <button key={v.id} className={`nav__boton ${vista === v.id ? 'nav__boton--activo' : ''}`} aria-current={vista === v.id ? 'page' : undefined} onClick={() => setVista(v.id)}>
            {v.texto}
            {v.id === 'pendientes' && pendientes.length > 0 && (
              <span className={`nav__cuenta ${conflictos ? 'nav__cuenta--alerta' : ''}`}>{pendientes.length}</span>
            )}
          </button>
        ))}
      </nav>

      {aviso && <p className="aviso aviso--flotante" role="status">{aviso}</p>}

      <main className="contenido">
        {vista === 'venta' && <VentaPage />}
        {vista === 'inventario' && <InventarioPage />}
        {vista === 'reportes' && rol === 'Administrador' && <ReportesPage />}
        {vista === 'usuarios' && rol === 'Administrador' && <UsuariosPage />}
        {vista === 'pendientes' && <PendientesPage />}
      </main>
    </div>
  );
}
