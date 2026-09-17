import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { EnquiriesView } from './components/EnquiriesView';
import { QuotationsView } from './components/QuotationsView';
import { SalesOrdersView } from './components/SalesOrdersView';
import { InventoryView } from './components/InventoryView';
import { RefreshCw } from 'lucide-react';

type Screen = 'enquiries' | 'quotations' | 'sales-orders' | 'inventory';

function MainApp() {
  const { user, loading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('enquiries');
  const [preselectedEnquiryId, setPreselectedEnquiryId] = useState<string | undefined>(undefined);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-500" />
          <p className="text-sm font-medium">Initializing Manufacturing ERP...</p>
        </div>
      </div>
    );
  }

  // SCREEN 1: LOGIN (If not authenticated)
  if (!user) {
    return <LoginView />;
  }

  const isAdmin = user.role === 'ADMIN';

  // Guard against non-admin accessing inventory screen
  const activeScreen = (!isAdmin && currentScreen === 'inventory') ? 'sales-orders' : currentScreen;

  const handleNavigateToQuotations = (enquiryId?: string) => {
    setPreselectedEnquiryId(enquiryId);
    setCurrentScreen('quotations');
  };

  const handleNavigateToSalesOrders = () => {
    setCurrentScreen('sales-orders');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar with Navigation Tabs & Role Status */}
      <Navbar
        currentScreen={activeScreen}
        onSelectScreen={(screen) => {
          setPreselectedEnquiryId(undefined);
          setCurrentScreen(screen);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeScreen === 'enquiries' && (
          <EnquiriesView onNavigateToQuotations={handleNavigateToQuotations} />
        )}

        {activeScreen === 'quotations' && (
          <QuotationsView
            preselectedEnquiryId={preselectedEnquiryId}
            onNavigateToSalesOrders={handleNavigateToSalesOrders}
          />
        )}

        {activeScreen === 'sales-orders' && <SalesOrdersView />}

        {activeScreen === 'inventory' && isAdmin && <InventoryView />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
