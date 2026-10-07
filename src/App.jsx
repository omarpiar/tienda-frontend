import './App.css'

function App() {
  return (
    <div className="app">
      <div className="card">
        <div className="icon">☁️</div>

        <h1>Frontend React</h1>

       <p>
  🚀 ¡Despliegue automático funcionando!
</p>

<div className="version">
  Versión de prueba #2
</div>

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
