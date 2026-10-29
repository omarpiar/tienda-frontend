import { useEffect } from 'react';

export default function Modal({ titulo, subtitulo, onCerrar, children }) {
  useEffect(() => {
    const alTeclear = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  return (
    <div className="hoja-fondo" onClick={onCerrar}>
      <section className="hoja" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <header className="hoja__cabecera">
          <div>
            <h2>{titulo}</h2>
            {subtitulo && <p className="tenue">{subtitulo}</p>}
          </div>
          <button className="boton boton--texto" onClick={onCerrar}>Cerrar</button>
        </header>
        {children}
      </section>
    </div>
  );
}
