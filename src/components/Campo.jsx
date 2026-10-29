export default function Campo({ etiqueta, error, ayuda, children }) {
  return (
    <label className={`campo ${error ? 'campo--error' : ''}`}>
      <span>{etiqueta}</span>
      {children}
      {error ? <small className="campo__error" role="alert">{error}</small> : ayuda ? <small>{ayuda}</small> : null}
    </label>
  );
}
