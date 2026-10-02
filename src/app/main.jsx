import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// ─── Blindaje contra Google Translate y extensiones que mutan el DOM ───────────
// Cuando el traductor de Chrome o una extensión modifica un texto, React pierde la
// referencia del nodo y lanza DOMException: NotFoundError en removeChild o insertBefore,
// haciendo que la pantalla se vuelva blanca. Este polyfill captura y neutraliza el error.
if (typeof window !== 'undefined') {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('DOM mutation safety: Node to remove is not a child of this node.', child);
      }
      return child;
    }
    return originalRemoveChild.call(this, child);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('DOM mutation safety: Reference node is not a child of this node.', referenceNode);
      }
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode);
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// ─── Desvanecimiento ágil del Splash Screen al cargar React ──────────────────
if (typeof window !== 'undefined') {
  const dismissSplash = () => {
    const splash = document.getElementById('app-splash');
    if (splash && !splash.classList.contains('fade-out')) {
      splash.classList.add('fade-out');
      setTimeout(() => {
        splash.style.display = 'none';
      }, 260);
    }
  };

  // Desvanecer ágilmente tan pronto la aplicación React esté montada
  // Si cargó ultra rápido en caché, damos un instante mínimo (~300ms) para que no sea abrupto
  const elapsedMs = typeof performance !== 'undefined' ? performance.now() : 0;
  const remainingMs = Math.max(0, 300 - elapsedMs);

  setTimeout(dismissSplash, remainingMs);
}

