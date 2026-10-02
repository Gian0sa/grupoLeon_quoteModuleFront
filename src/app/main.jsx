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

// ─── Desvanecimiento cinematográfico del Splash Screen al cargar React ────────
if (typeof window !== 'undefined') {
  const isStandalone =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;

  const dismissSplash = () => {
    const splash = document.getElementById('app-splash');
    if (splash && !splash.classList.contains('fade-out')) {
      splash.classList.add('fade-out');
      setTimeout(() => {
        splash.style.display = 'none';
      }, 250);
    }
  };

  if (isStandalone) {
    // 📱 Celular instalado (PWA): Android ya mostró la pantalla nativa oficial.
    // Ocultamos de inmediato el splash web para entrar de una y rápido al Login sin doble capa.
    dismissSplash();
  } else {
    // 💻 Navegador web (PC / pestaña): mostramos la animación de bienvenida
    const splashStart = window.__splashStartTime || 0;
    const elapsed = performance.now() - splashStart;
    const MIN_ANIMATION_TIME = 1100;
    const remaining = Math.max(0, MIN_ANIMATION_TIME - elapsed);

    setTimeout(dismissSplash, remaining);
  }
}

