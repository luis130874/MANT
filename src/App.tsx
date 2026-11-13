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
  const { userProfile } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [printableDocuments, setPrintableDocuments] = useState<PrintableDocument[] | null>(null);

  useEffect(() => {
    if (userProfile && !hasModuleAccess(userProfile, currentTab as ModuloKey)) {
      setCurrentTab(getFirstPermittedTab(userProfile));
    }
  }, [userProfile, currentTab]);

  const handlePrintSingleOrder = (doc: PrintableDocument) => {
    if (!hasActionAccess(userProfile, 'imprimir_pdf')) return;
    setPrintableDocuments([doc]);
  };

  const handlePrintBatchOrders = (docs: PrintableDocument[]) => {
    if (!hasActionAccess(userProfile, 'imprimir_pdf')) return;
    setPrintableDocuments(docs);
  };

  const isCurrentTabAllowed = hasModuleAccess(userProfile, currentTab as ModuloKey);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
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

      <div className="flex-1 max-w-[1600px] w-full mx-auto flex">
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
                />
              )}
              {currentTab === 'correctivos' && (
                <CorrectivosView onPrintOrder={handlePrintSingleOrder} />
              )}
              {currentTab === 'ordenes' && (
                <OrdenesTrabajoView onPrintOrder={handlePrintSingleOrder} />
              )}
              {currentTab === 'calibracion' && (
                <CalibracionView
                  initialTab="plan"
                  onPrintCalibration={handlePrintSingleOrder}
                  onPrintBatchCalibration={handlePrintBatchOrders}
                />
              )}
              {currentTab === 'instrumentos' && (
                <CalibracionView
                  initialTab="instrumentos"
                  onPrintCalibration={handlePrintSingleOrder}
                  onPrintBatchCalibration={handlePrintBatchOrders}
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
