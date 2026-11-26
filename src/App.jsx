import { useEffect, useState } from 'react';
import { useAuth } from './auth/AuthContext';
import { useSync } from './offline/SyncContext';
import LoginPage from './pages/LoginPage';
import VentaPage from './pages/VentaPage';
import InventarioPage from './pages/InventarioPage';
import PendientesPage from './pages/PendientesPage';
import ReportesPage from './pages/ReportesPage';
import HistorialVentasPage from './pages/HistorialVentasPage';
import UsuariosPage from './pages/UsuariosPage';
import SelectorPerfil from './components/SelectorPerfil';
import Modal from './components/Modal';
import {
  IconoHistorial,
  IconoInventario,
  IconoPendientes,
  IconoReportes,
  IconoTienda,
  IconoUsuarios,
  IconoVender,
} from './components/Iconos';

const VISTAS = [
  { id: 'venta', texto: 'Vender', solo: null, Icono: IconoVender },
  { id: 'inventario', texto: 'Inventario', solo: null, Icono: IconoInventario },
  { id: 'reportes', texto: 'Reportes', solo: 'Administrador', Icono: IconoReportes },
  { id: 'historial', texto: 'Historial', solo: 'Administrador', Icono: IconoHistorial },
  { id: 'usuarios', texto: 'Usuarios', solo: 'Administrador', Icono: IconoUsuarios },
  { id: 'pendientes', texto: 'Pendientes', solo: null, Icono: IconoPendientes },
];

export default function App() {
  const { sesion } = useAuth();
  const { enLinea, pendientes, aviso, resultadoSync, limpiarAviso, limpiarResultadoSync } = useSync();
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
        <div className="barra__marca">
          <span className="logo" aria-hidden="true">
            <IconoTienda size={21} />
          </span>
          <div className="barra__titulo">
            <h1 className="marca">PuntoPyme</h1>
            <span>Punto de venta</span>
          </div>
        </div>

        <div className="barra__acciones">
          <span className={`conexion ${enLinea ? 'conexion--si' : 'conexion--no'}`}>
            {enLinea ? 'En línea' : 'Sin conexión'}
          </span>
          <SelectorPerfil />
        </div>
      </header>

      <nav className="nav" aria-label="Secciones">
        {visibles.map((v) => (
          <button
            key={v.id}
            className={`nav__boton ${vista === v.id ? 'nav__boton--activo' : ''}`}
            aria-current={vista === v.id ? 'page' : undefined}
            onClick={() => setVista(v.id)}
          >
            <v.Icono size={20} />
            <span>{v.texto}</span>
            {v.id === 'pendientes' && pendientes.length > 0 && (
              <span className={`nav__cuenta ${conflictos ? 'nav__cuenta--alerta' : ''}`}>
                {pendientes.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      {aviso && <p className="aviso aviso--flotante" role="status">{aviso}</p>}

      {resultadoSync && (
        <Modal
          titulo="Sincronización de ventas"
          subtitulo="Resultado del envío con internet."
          onCerrar={limpiarResultadoSync}
        >
          <dl className="datos">
            <div><dt>Ventas enviadas</dt><dd>{resultadoSync.sincronizadas}</dd></div>
            <div><dt>Conflictos de existencias</dt><dd>{resultadoSync.conflictos}</dd></div>
            <div><dt>Otros errores</dt><dd>{resultadoSync.errores}</dd></div>
          </dl>
          {resultadoSync.conflictos > 0 && <p className="aviso aviso--error">Revisa la sección Pendientes para resolverlos.</p>}
          <button className="boton boton--primario hoja__accion" onClick={limpiarResultadoSync}>Aceptar</button>
        </Modal>
      )}

      <main className="contenido">
        {vista === 'venta' && <VentaPage />}
        {vista === 'inventario' && <InventarioPage />}
        {vista === 'reportes' && rol === 'Administrador' && <ReportesPage />}
        {vista === 'historial' && rol === 'Administrador' && <HistorialVentasPage />}
        {vista === 'usuarios' && rol === 'Administrador' && <UsuariosPage />}
        {vista === 'pendientes' && <PendientesPage />}
      </main>
    </div>
  );
}
