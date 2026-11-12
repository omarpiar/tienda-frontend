function Svg({ children, className = '', size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export const IconoTienda = (props) => (
  <Svg {...props}>
    <path d="M4 10v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9" />
    <path d="M3.5 10 5 4.5A1.5 1.5 0 0 1 6.4 3.5h11.2A1.5 1.5 0 0 1 19 4.5L20.5 10" />
    <path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
    <path d="M9 20v-5h6v5" />
  </Svg>
);

export const IconoVender = (props) => (
  <Svg {...props}>
    <circle cx="9" cy="20" r="1.4" />
    <circle cx="18" cy="20" r="1.4" />
    <path d="M2.5 3.5h2l2.3 11.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 2-1.6l1.3-6.7H6" />
  </Svg>
);

export const IconoInventario = (props) => (
  <Svg {...props}>
    <path d="M21 8.5 12 3 3 8.5v7L12 21l9-5.5v-7Z" />
    <path d="m3 8.5 9 5.5 9-5.5" />
    <path d="M12 14v7" />
  </Svg>
);

export const IconoReportes = (props) => (
  <Svg {...props}>
    <path d="M4 20V10" />
    <path d="M10 20V4" />
    <path d="M16 20v-7" />
    <path d="M22 20H2" />
  </Svg>
);

export const IconoUsuarios = (props) => (
  <Svg {...props}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0" />
    <path d="M16.5 5.3a3 3 0 0 1 0 5.8" />
    <path d="M18 14.2a6.2 6.2 0 0 1 3.2 5.4" />
  </Svg>
);

export const IconoPendientes = (props) => (
  <Svg {...props}>
    <path d="M20.5 12a8.5 8.5 0 1 1-2.5-6" />
    <path d="M20.5 3.5V9H15" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);

export const IconoChevron = (props) => (
  <Svg {...props}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

export const IconoCheck = (props) => (
  <Svg {...props}>
    <path d="m4.5 12.5 5 5 10-11" />
  </Svg>
);

export const IconoCerrarSesion = (props) => (
  <Svg {...props}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="m10 8-4 4 4 4" />
    <path d="M6 12h10" />
  </Svg>
);

export const IconoEscudo = (props) => (
  <Svg {...props}>
    <path d="M12 3 4.5 6v5.5c0 4.3 3.2 7.9 7.5 9.5 4.3-1.6 7.5-5.2 7.5-9.5V6L12 3Z" />
    <path d="m8.8 12 2.2 2.2 4.2-4.4" />
  </Svg>
);

export const IconoPersona = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
  </Svg>
);

export const IconoCandado = (props) => (
  <Svg {...props}>
    <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    <path d="M12 14v2.5" />
  </Svg>
);

export const IconoDestello = (props) => (
  <Svg {...props}>
    <path d="M13.5 2.5 5 13.5h6L10.5 21.5 19 10.5h-6l.5-8Z" />
  </Svg>
);

export const IconoEtiqueta = (props) => (
  <Svg {...props}>
    <path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7a1 1 0 0 1 .7.3l7.8 7.8a1 1 0 0 1 0 1.4l-7.7 7.7a1 1 0 0 1-1.4 0l-7.8-7.8a1 1 0 0 1-.3-.7Z" />
    <circle cx="8" cy="8" r="1.4" />
  </Svg>
);
