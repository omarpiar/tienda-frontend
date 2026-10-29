import { useState } from 'react';
import { apiFetch, errorDeFormulario } from '../api/client';
import Campo from './Campo';
import Modal from './Modal';

/** HU-09 (alta) y HU-10 (edición). En edición el PIN es opcional: vacío = se conserva el actual. */
export default function UsuarioForm({ usuario, token, onGuardado, onCerrar }) {
  const editando = Boolean(usuario);
  const [f, setF] = useState({
    nombreCompleto: usuario?.nombreCompleto ?? '',
    nombreUsuario: usuario?.nombreUsuario ?? '',
    rol: usuario?.rol ?? 'Cajero',
    pin: '',
  });
  const [errores, setErrores] = useState({});
  const [general, setGeneral] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErrores({});
    setGeneral('');
    setGuardando(true);
    try {
      const cuerpo = { ...f, ...(editando && !f.pin ? { pin: null } : {}) };
      const guardado = await apiFetch(editando ? `/api/usuarios/${usuario.id}` : '/api/usuarios', {
        metodo: editando ? 'PUT' : 'POST', cuerpo, token,
      });
      onGuardado(guardado);
    } catch (err) {
      const { campos, general: g } = errorDeFormulario(err, { USUARIO_DUPLICADO: 'nombreUsuario' });
      setErrores(campos);
      setGeneral(g);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={editando ? 'Editar usuario' : 'Nuevo usuario'} onCerrar={onCerrar}>
      <form onSubmit={enviar} noValidate>
        <Campo etiqueta="Nombre completo" error={errores.nombreCompleto}>
          <input value={f.nombreCompleto} onChange={(e) => setF({ ...f, nombreCompleto: e.target.value })} maxLength={150} autoFocus />
        </Campo>
        <Campo etiqueta="Usuario o celular" error={errores.nombreUsuario} ayuda="Con él entra a la app. Sin espacios.">
          <input value={f.nombreUsuario} onChange={(e) => setF({ ...f, nombreUsuario: e.target.value })} autoCapitalize="none" maxLength={50} />
        </Campo>
        <Campo etiqueta="Rol" error={errores.rol}>
          <select value={f.rol} onChange={(e) => setF({ ...f, rol: e.target.value })}>
            <option>Cajero</option>
            <option>Administrador</option>
          </select>
        </Campo>
        <Campo
          etiqueta={editando ? 'PIN nuevo (opcional)' : 'PIN'}
          error={errores.pin}
          ayuda={editando ? 'Déjalo vacío para conservar el actual. Si lo cambias, el usuario se desbloquea.' : 'De 4 a 6 dígitos.'}
        >
          <input type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" value={f.pin}
            onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, '') })} />
        </Campo>

        {general && <p className="aviso aviso--error" role="alert">{general}</p>}
        <button className="boton boton--primario" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
      </form>
    </Modal>
  );
}
