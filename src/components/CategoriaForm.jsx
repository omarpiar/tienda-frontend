import { useState } from 'react';
import { apiFetch, errorDeFormulario } from '../api/client';
import Campo from './Campo';
import Modal from './Modal';

export default function CategoriaForm({ categoria, token, onGuardado, onCerrar }) {
  const editando = Boolean(categoria);
  const [nombre, setNombre] = useState(categoria?.nombre ?? '');
  const [errores, setErrores] = useState({});
  const [general, setGeneral] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErrores({});
    setGeneral('');
    setGuardando(true);
    try {
      const guardada = await apiFetch(editando ? `/api/categorias/${categoria.id}` : '/api/categorias', {
        metodo: editando ? 'PUT' : 'POST', cuerpo: { nombre }, token,
      });
      onGuardado(guardada);
    } catch (err) {
      const { campos, general: g } = errorDeFormulario(err, { CATEGORIA_DUPLICADA: 'nombre' });
      setErrores(campos);
      setGeneral(g);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={editando ? 'Editar categoría' : 'Nueva categoría'} onCerrar={onCerrar}>
      <form onSubmit={enviar} noValidate>
        <Campo etiqueta="Nombre" error={errores.nombre}>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={100} autoFocus />
        </Campo>
        {general && <p className="aviso aviso--error" role="alert">{general}</p>}
        <button className="boton boton--primario" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </form>
    </Modal>
  );
}
