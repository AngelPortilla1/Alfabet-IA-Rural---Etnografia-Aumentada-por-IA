import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Componente utilitario que resetea el scroll de la ventana a la posición superior (0,0)
 * cada vez que la ruta (URL) cambia. Soluciona el problema de "Scroll Leakage".
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
