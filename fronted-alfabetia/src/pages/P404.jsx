import { useNavigate } from 'react-router-dom';

export default function P404() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-24 h-24 bg-error-container text-on-error-container rounded-3xl flex items-center justify-center mb-6 shadow-sm">
        <span className="material-symbols-outlined text-5xl">location_off</span>
      </div>
      <h1 className="font-display-lg text-4xl md:text-5xl font-bold text-on-surface mb-4">
        Página no encontrada
      </h1>
      <p className="font-body-lg text-on-surface-variant max-w-md mb-8">
        La ruta a la que intentas acceder no existe o fue movida en el sistema AlfabetIA.
      </p>
      <button 
        onClick={() => navigate('/')}
        className="bg-primary text-on-primary px-8 py-4 rounded-2xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2"
      >
        <span className="material-symbols-outlined">home</span>
        Volver al Dashboard
      </button>
    </div>
  );
}
