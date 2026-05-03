import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from './i18n/language-context';
import './i18n/i18n';
import { AppRoutes } from './routes/app-routes';

import ErrorBoundary from './components/ErrorBoundary';

const queryClient = new QueryClient();

export default function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider defaultLanguage="en-US" defaultModules={['common', 'auth']}>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </LanguageProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
