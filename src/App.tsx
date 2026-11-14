/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MaintenanceProvider, useMaintenance } from './context/MaintenanceContext';
import { LoginScreen } from './components/LoginScreen';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { PlanMaestroView } from './components/PlanMaestroView';
import { PreventivosView } from './components/PreventivosView';
import { CorrectivosView } from './components/CorrectivosView';
import { OrdenesTrabajoView } from './components/OrdenesTrabajoView';
import { CalibracionView } from './components/CalibracionView';
import { EquiposView } from './components/EquiposView';
import { RepuestosView } from './components/RepuestosView';
import { ClientesView } from './components/ClientesView';
import { TecnicosView } from './components/TecnicosView';
import { ConfiguracionView } from './components/ConfiguracionView';
import { UsuariosView } from './components/UsuariosView';
import { PrintModal, PrintableDocument } from './components/PrintModal';
import { NewOrderModal } from './components/NewOrderModal';
import { ShareOrderModal } from './components/ShareOrderModal';
import { DigitalOrderExecutionModal } from './components/DigitalOrderExecutionModal';
import {
  DeepLinkOrderQuery,
  DigitalOrderTarget,
  clearDeepLinkOrderStorage,
  parseDeepLinkOrderFromWindow,
  resolveDigitalOrderTarget
} from './utils/digitalOrderLink';
import { getFirstPermittedTab, hasActionAccess, hasModuleAccess } from './utils/rbac';
import { ModuloKey } from './types';
import { CheckCircle2, AlertCircle, X, Lock } from 'lucide-react';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useMaintenance();

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full no-print">
      {toasts.map(toast => {
        const isSuccess = toast.type === 'success';
        const isWarning = toast.type === 'warning';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`p-3.5 rounded-xl border shadow-lg flex items-start justify-between gap-3 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200 ${
              isSuccess
                ? 'bg-slate-900 text-white border-slate-800'
                : isWarning
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : isError
                ? 'bg-rose-50 text-rose-900 border-rose-300'
                : 'bg-white text-slate-900 border-slate-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
              {isWarning && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
              {isError && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
              <span className="font-medium leading-relaxed">{toast.text}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-200 p-0.5 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

const MainLayout: React.FC = () => {
  const { userProfile, isSuperAdmin } = useAuth();
  const {
    clientes,
    equipos,
    historial,
    correctivos,
    ordenesTrabajo,
    calibraciones,
    instrumentos,
    frecuencias,
    selectedAnio,
    setSelectedCliente,
    cloudLoading,
    addToast
  } = useMaintenance();

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [printableDocuments, setPrintableDocuments] = useState<PrintableDocument[] | null>(null);
  const [sharingOrder, setSharingOrder] = useState<DigitalOrderTarget | null>(null);
  const [executingOrder, setExecutingOrder] = useState<DigitalOrderTarget | null>(null);
  const [pendingDeepLink, setPendingDeepLink] = useState<DeepLinkOrderQuery | null>(() =>
    parseDeepLinkOrderFromWindow()
  );

  useEffect(() => {
    if (userProfile && !hasModuleAccess(userProfile, currentTab as ModuloKey)) {
      setCurrentTab(getFirstPermittedTab(userProfile));
    }
  }, [userProfile, currentTab]);

  // Resolve deep-linked digital order once Firestore cloud data has loaded
  useEffect(() => {
    if (!pendingDeepLink || cloudLoading || !userProfile) return;

    const resolved = resolveDigitalOrderTarget(pendingDeepLink, {
      clientes,
      equipos,
      historial,
      correctivos,
      ordenesTrabajo,
      calibraciones,
      instrumentos,
      frecuencias,
      defaultAnio: selectedAnio
    });

    if (resolved) {
      if (isSuperAdmin && resolved.cliente) {
        setSelectedCliente(resolved.cliente);
      }
      setExecutingOrder(resolved);
      setPendingDeepLink(null);
    } else if (equipos.length > 0 || clientes.length > 0 || correctivos.length > 0 || ordenesTrabajo.length > 0 || calibraciones.length > 0) {
      addToast(
        `No se encontró la orden "${pendingDeepLink.folio}" en su planta autorizada.`,
        'warning'
      );
      clearDeepLinkOrderStorage();
      setPendingDeepLink(null);
    }
  }, [
    pendingDeepLink,
    cloudLoading,
    userProfile,
    clientes,
    equipos,
    historial,
    correctivos,
    ordenesTrabajo,
    calibraciones,
    instrumentos,
    frecuencias,
    selectedAnio,
    isSuperAdmin,
    setSelectedCliente,
    addToast
  ]);

  const handlePrintSingleOrder = (doc: PrintableDocument) => {
    if (!hasActionAccess(userProfile, 'imprimir_pdf')) return;
    setPrintableDocuments([doc]);
  };

  const handlePrintBatchOrders = (docs: PrintableDocument[]) => {
    if (!hasActionAccess(userProfile, 'imprimir_pdf')) return;
    setPrintableDocuments(docs);
  };

  const handleCloseExecutionModal = () => {
    setExecutingOrder(null);
    clearDeepLinkOrderStorage();
  };

  const isCurrentTabAllowed = hasModuleAccess(userProfile, currentTab as ModuloKey);

  return (
    <div className="print-app-root min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* 3-zone Top Bar Contract */}
      <TopBar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenNewOrder={() => {
          if (hasActionAccess(userProfile, 'emitir_ordenes')) {
            setIsNewOrderModalOpen(true);
          }
        }}
      />

      <div className={`flex-1 max-w-[1600px] w-full mx-auto flex ${printableDocuments ? 'no-print' : ''}`}>
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
        />

        {/* Main Viewport Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden min-w-0">
          {!isCurrentTabAllowed ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
              <Lock className="w-8 h-8 text-slate-400 mx-auto" />
              <h2 className="text-sm font-bold text-slate-900">Módulo No Habilitado</h2>
              <p className="text-xs text-slate-500">
                Su perfil de acceso no tiene habilitado este módulo. Contacte al Administrador de su Empresa.
              </p>
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && <DashboardView />}
              {currentTab === 'plan' && <PlanMaestroView />}
              {currentTab === 'preventivos' && (
                <PreventivosView
                  onPrintOrder={handlePrintSingleOrder}
                  onPrintBatch={handlePrintBatchOrders}
                  onShareOrder={setSharingOrder}
                  onOpenDigitalExecution={setExecutingOrder}
                />
              )}
              {currentTab === 'correctivos' && (
                <CorrectivosView
                  onPrintOrder={handlePrintSingleOrder}
                  onShareOrder={setSharingOrder}
                  onOpenDigitalExecution={setExecutingOrder}
                />
              )}
              {currentTab === 'ordenes' && (
                <OrdenesTrabajoView
                  onPrintOrder={handlePrintSingleOrder}
                  onShareOrder={setSharingOrder}
                  onOpenDigitalExecution={setExecutingOrder}
                />
              )}
              {currentTab === 'calibracion' && (
                <CalibracionView
                  initialTab="plan"
                  onPrintCalibration={handlePrintSingleOrder}
                  onPrintBatchCalibration={handlePrintBatchOrders}
                  onShareOrder={setSharingOrder}
                  onOpenDigitalExecution={setExecutingOrder}
                />
              )}
              {currentTab === 'instrumentos' && (
                <CalibracionView
                  initialTab="instrumentos"
                  onPrintCalibration={handlePrintSingleOrder}
                  onPrintBatchCalibration={handlePrintBatchOrders}
                  onShareOrder={setSharingOrder}
                  onOpenDigitalExecution={setExecutingOrder}
                />
              )}
              {currentTab === 'equipos' && <EquiposView />}
              {currentTab === 'repuestos' && <RepuestosView />}
              {currentTab === 'clientes' && <ClientesView />}
              {currentTab === 'tecnicos' && <TecnicosView />}
              {currentTab === 'configuracion' && <ConfiguracionView />}
              {currentTab === 'usuarios' && <UsuariosView />}
            </>
          )}
        </main>
      </div>

      {/* Global Quick New Order Modal */}
      <NewOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
      />

      {/* Share Digital Order Link / WhatsApp Modal */}
      {sharingOrder && (
        <ShareOrderModal
          target={sharingOrder}
          onClose={() => setSharingOrder(null)}
          onOpenDigitalExecution={(ord) => setExecutingOrder(ord)}
        />
      )}

      {/* Mobile-Friendly Digital Field Execution & Touch Signature Modal */}
      {executingOrder && (
        <DigitalOrderExecutionModal
          target={executingOrder}
          onClose={handleCloseExecutionModal}
          onOpenPrint={handlePrintSingleOrder}
          onOpenShare={(ord) => setSharingOrder(ord)}
        />
      )}

      {/* High-Fidelity Printable Document Modal */}
      {printableDocuments && (
        <PrintModal
          documents={printableDocuments}
          onClose={() => setPrintableDocuments(null)}
        />
      )}

      {/* Global Notification Toasts */}
      <ToastContainer />
    </div>
  );
};

const AuthenticatedApp: React.FC = () => {
  const { authStatus } = useAuth();

  if (authStatus !== 'authorized') {
    return <LoginScreen />;
  }

  return (
    <MaintenanceProvider>
      <MainLayout />
    </MaintenanceProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
