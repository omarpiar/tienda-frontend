import './App.css'

function App() {
  return (
    <div className="app">
      <div className="card">
        <div className="icon">☁️</div>

        <h1>Frontend React</h1>

        <p>
          Proyecto de prueba para despliegue automático en Azure.
        </p>

        <div className="status">
          <span className="dot"></span>
          Aplicación funcionando
        </div>

        <button onClick={() => alert('¡React funciona correctamente!')}>
          Probar aplicación
        </button>
      </div>
    </div>
  )
}

export default App
