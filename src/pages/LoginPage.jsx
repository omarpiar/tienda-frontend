import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

const ROLES = ['Cajero', 'Administrador'];

export default function LoginPage() {
  const { iniciarSesion } = useAuth();
  const [usuario, setUsuario] = useState('');
  const [pin, setPin] = useState('');
  const [rol, setRol] = useState('Cajero');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(0);

  // Cuenta regresiva cuando el usuario queda bloqueado (429)
  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const pinValido = /^\d{4,6}$/.test(pin);
  const puedeEnviar = usuario.trim() !== '' && pinValido && !enviando && espera <= 0;

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await iniciarSesion(usuario, pin, rol);
    } catch (err) {
      setPin('');
      if (err.status === 429) setEspera(err.retryAfter ?? 60);
      setError(
        err.status === 400 && err.errors
          ? Object.values(err.errors).flat().join(' ')
          : err.message,
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="login">
      <form className="login__panel" onSubmit={enviar} noValidate>
        <h1 className="marca">PuntoPyme</h1>
        <p className="login__lema">Ventas e inventario de tu negocio, incluso sin internet.</p>

        <label className="campo">
          <span>Usuario o celular</span>
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoFocus
          />
        </label>

        <label className="campo">
          <span>PIN</span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            aria-describedby="ayuda-pin"
          />
          <small id="ayuda-pin">De 4 a 6 dígitos.</small>
        </label>

        <fieldset className="roles">
          <legend>Entrar como</legend>
          {ROLES.map((r) => (
            <label key={r} className={`roles__opcion ${rol === r ? 'roles__opcion--activa' : ''}`}>
              <input type="radio" name="rol" value={r} checked={rol === r} onChange={() => setRol(r)} />
              {r}
            </label>
          ))}
        </fieldset>

        {error && (
          <p className="aviso aviso--error" role="alert">
            {espera > 0 ? `Demasiados intentos. Intenta de nuevo en ${espera} s.` : error}
          </p>
        )}

        <button className="boton boton--primario" disabled={!puedeEnviar}>
          {enviando ? 'Entrando…' : 'Iniciar sesión'}
        </button>
      </form>
    </main>
  );
}
