import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/layout/main-layout/main-layout';
import VibeBuilderDashboard from '@/pages/dashboard/VibeBuilderDashboard';
import VibeBuilderEditor from '@/pages/editor/VibeBuilderEditor';
import PublicSite from '@/pages/public/PublicSite';
import { AuthRoutes } from './auth.route';
import { Guard } from '@/state/store/auth/guard';
import { ThemeProvider } from '@/styles/theme/theme-provider';
import { SidebarProvider } from '@/components/ui-kit/sidebar';
import { Toaster } from '@/components/ui-kit/toaster';
import { useLanguageContext } from '@/i18n/language-context';
import { LoadingOverlay } from '@/components/core';
import { NotFoundPage } from '@/modules/error-view';

export const AppRoutes = () => {
  const { isLoading } = useLanguageContext();

  if (isLoading) {
    return <LoadingOverlay />;
  }
  return (
    <div className="min-h-screen bg-background font-sans antialiased relative">
      <ThemeProvider>
        <SidebarProvider>
          <Routes>
            {AuthRoutes}

            {/* Full-viewport Editor — NO sidebar, NO top header */}
            <Route
              path="/editor"
              element={
                <Guard>
                  <VibeBuilderEditor />
                </Guard>
              }
            />

            {/* Standard layout routes */}
            <Route
              element={
                <Guard>
                  <MainLayout />
                </Guard>
              }
            >
              <Route path="/vibebuilder" element={<VibeBuilderDashboard />} />
              <Route path="/404" element={<NotFoundPage />} />
            </Route>

            {/* Public Routes */}
            <Route path="/site/:username/:pageSlug?" element={<PublicSite />} />

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/vibebuilder" />} />

            <Route path="*" element={<Navigate to="/404" />} />
          </Routes>
        </SidebarProvider>
      </ThemeProvider>
      <Toaster />
    </div>
  );
};
