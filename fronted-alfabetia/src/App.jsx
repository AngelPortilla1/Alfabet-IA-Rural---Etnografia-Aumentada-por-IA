import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import P0_Home from './pages/P0_Home';
import P1_RegistrarRelato from './pages/P1_RegistrarRelato';
import P2_ModeloMental from './pages/P2_ModeloMental';
import P3_RutaPedagogica from './pages/P3_RutaPedagogica';
import P4_ColadeRevisiones from './pages/P4_ColadeRevisiones';
import P5_Segmentos from './pages/P5_Segmentos';
import P6_AprobacionCurricular from './pages/P6_AprobacionCurricular';
import P7_Auditoria from './pages/P7_Auditoria';
import MentalModelsAnalysis from './pages/MentalModelsAnalysis';
import P_DashboardResumen from './pages/P_DashboardResumen';
import P_GestionConsentimiento from './pages/P_GestionConsentimiento';
import P_Documentacion from './pages/P_Documentacion';
import P_ChatEtnografico from './pages/P_ChatEtnografico';
import P404 from './pages/P404';
import ScrollToTop from './components/ScrollToTop';
import { ToastProvider } from './components/ToastContext';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<P0_Home />} />
            <Route path="/registrar-relato" element={<P1_RegistrarRelato />} />
            <Route path="/chat-etnografico" element={<P_ChatEtnografico />} />
            <Route path="/modelo-mental/:pid" element={<P2_ModeloMental />} />
            <Route path="/ruta-pedagogica/:pid" element={<P3_RutaPedagogica />} />
            <Route path="/revisiones" element={<P4_ColadeRevisiones />} />
            <Route path="/aprobacion-curricular" element={<P6_AprobacionCurricular />} />
            {/* F3.1: Pantalla de Segmentos Comunitarios */}
            <Route path="/segmentos" element={<P5_Segmentos />} />

            <Route path="/auditoria" element={<P7_Auditoria />} />
            <Route path="/auditoria/:pid" element={<P7_Auditoria />} />
            <Route path="/analisis-modelos" element={<MentalModelsAnalysis />} />
            <Route path="/dashboard" element={<P_DashboardResumen />} />
            <Route path="/consentimiento" element={<P_GestionConsentimiento />} />
            <Route path="/documentacion" element={<P_Documentacion />} />

            {/* F4: Pantalla 404 Catch-all */}
            <Route path="*" element={<P404 />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}