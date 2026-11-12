import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { IconoCandado, IconoCheck, IconoDestello, IconoTienda } from '../components/Iconos';

const BENEFICIOS = [
  'Vende incluso si se cae el internet.',
  'Tu inventario siempre al día.',
  'Reportes claros para decidir mejor.',
];

export default function LoginPage() {
  const { iniciarSesion } = useAuth();
  const [usuario, setUsuario] = useState('');
  const [pin, setPin] = useState('');
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
      await iniciarSesion(usuario, pin);
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
      <div className="login__brillo login__brillo--uno" aria-hidden="true" />
      <div className="login__brillo login__brillo--dos" aria-hidden="true" />

      <section className="login__presentacion" aria-label="PuntoPyme">
        <div className="login__marca">
          <span className="logo logo--grande" aria-hidden="true">
            <IconoTienda size={24} />
          </span>
          <span>PuntoPyme</span>
        </div>

        <h1>
          Tu negocio, en orden.
          <span> Sin complicaciones.</span>
        </h1>
        <p className="login__texto">
          El punto de venta que se adapta a tu día: cobra rápido, cuida tu inventario y toma
          mejores decisiones desde cualquier dispositivo.:v
        </p>

        <ul className="login__beneficios">
          {BENEFICIOS.map((b) => (
            <li key={b}>
              <span className="login__check" aria-hidden="true">
                <IconoCheck size={15} />
              </span>
              {b}
            </li>
          ))}
        </ul>

        <div className="login__vitrina" aria-hidden="true">
          <div className="login__dato login__dato--destacado">
            <span className="login__dato-icono"><IconoDestello size={18} /></span>
            <span>Ventas de hoy</span>
            <strong>$2,480.00</strong>
            <small>+12% vs. ayer</small>
          </div>
          <div className="login__dato">
            <span className="login__dato-icono"><IconoCandado size={18} /></span>
            <span>Modo sin conexión</span>
            <strong>Listo</strong>
            <small>Sigue vendiendo</small>
          </div>
        </div>
      </section>

      <form className="login__panel" onSubmit={enviar} noValidate>
        <div className="login__cabecera">
          <span className="eyebrow">Bienvenido de nuevo</span>
          <h2>Inicia sesión</h2>
          <p>Usa tu usuario y PIN para entrar a tu espacio de trabajo.</p>
        </div>

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

        {error && (
          <p className="aviso aviso--error" role="alert">
            {espera > 0 ? `Demasiados intentos. Intenta de nuevo en ${espera} s.` : error}
          </p>
        )}

        <button className="boton boton--primario boton--entrar" disabled={!puedeEnviar}>
          {enviando ? 'Entrando…' : 'Iniciar sesión'}
        </button>

        <p className="login__nota">
          <IconoCandado size={17} />
          <span>
            Entrarás como <strong>Cajero</strong>. Si tu usuario es administrador, podrás cambiar
            de perfil sin cerrar la sesión.
          </span>
        </p>
      </form>
    </main>
  );
}
