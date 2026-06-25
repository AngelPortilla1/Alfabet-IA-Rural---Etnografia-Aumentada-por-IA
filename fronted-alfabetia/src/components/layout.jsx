import { Outlet, Link, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './footer';

export default function Layout() {

  return (
    <div className="relative min-h-screen">
      
      {/* Atmospheric Background Layers */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-surface-container-lowest to-surface-container-high opacity-80"></div>
        <div className="absolute inset-0 topographic-bg"></div>
        {/* Soft glowing orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-container rounded-full mix-blend-multiply filter blur-[100px] opacity-20"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary-container rounded-full mix-blend-multiply filter blur-[120px] opacity-20"></div>
      </div>

      <Header />

      {/* Main Content */}
      <div className="relative z-10 pt-[100px] pb-24">
        
        {/* Breadcrumbs */}
        {(() => {
          const location = useLocation();
          if (location.pathname === '/') return null;

          const paths = location.pathname.split('/').filter(p => p);
          
          // Diccionario para humanizar las rutas
          const routeNames = {
            'registrar-relato': 'Registrar Relato',
            'chat-etnografico': 'Chat Etnográfico',
            'modelo-mental': 'Modelo Mental BDI',
            'ruta-pedagogica': 'Ruta Curricular',
            'revisiones': 'Cola de Revisiones',
            'aprobacion-curricular': 'Aprobación Pedagógica',
            'segmentos': 'Segmentos Comunitarios',
            'auditoria': 'Auditoría de Datos',
            'analisis-modelos': 'Análisis Experimental',
            'dashboard': 'Estado del Sistema',
            'consentimiento': 'Gestión de Consentimiento',
          };

          return (
            <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop mb-4">
              <nav className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant overflow-x-auto pb-2 scrollbar-hide">
                <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1 shrink-0">
                  <span className="material-symbols-outlined text-[14px]">home</span>
                  Inicio
                </Link>
                {paths.map((segment, index) => {
                  const isLast = index === paths.length - 1;
                  const to = `/${paths.slice(0, index + 1).join('/')}`;
                  const label = routeNames[segment] || segment; // Si no está en el diccionario, es un ID dinámico
                  
                  return (
                    <div key={to} className="flex items-center gap-2 shrink-0">
                      <span className="material-symbols-outlined text-[14px] opacity-50">chevron_right</span>
                      {isLast ? (
                        <span className="text-primary">{label.replace(/_/g, ' ')}</span>
                      ) : (
                        <Link to={to} className="hover:text-primary transition-colors">{label.replace(/_/g, ' ')}</Link>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          );
        })()}

        <Outlet />
      </div>

      {/* Footer */}
      <Footer />
      
    </div>
  );
}