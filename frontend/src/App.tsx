import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { OffersListPage } from './pages/offers/OffersListPage';
import { OfferFormPage } from './pages/offers/OfferFormPage';
import { OfferDetailPage } from './pages/offers/OfferDetailPage';
import { CustomersListPage } from './pages/customers/CustomersListPage';
import { CustomerFormPage } from './pages/customers/CustomerFormPage';
import { CustomerDetailPage } from './pages/customers/CustomerDetailPage';
import { UsersPage } from './pages/users/UsersPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { FollowUpsPage } from './pages/followups/FollowUpsPage';
import { DocumentsPage } from './pages/documents/DocumentsPage';
import { AuditPage } from './pages/audit/AuditPage';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />

          {/* Offers */}
          <Route path="/offers" element={<OffersListPage />} />
          <Route path="/offers/new" element={<OfferFormPage />} />
          <Route path="/offers/:id" element={<OfferDetailPage />} />
          <Route path="/offers/:id/edit" element={<OfferFormPage />} />

          {/* Customers */}
          <Route path="/customers" element={<CustomersListPage />} />
          <Route path="/customers/new" element={<CustomerFormPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/customers/:id/edit" element={<CustomerFormPage />} />

          {/* Follow-ups */}
          <Route path="/followups" element={<FollowUpsPage />} />

          {/* Reports */}
          <Route path="/reports" element={<ReportsPage />} />

          {/* Documents */}
          <Route path="/documents" element={<DocumentsPage />} />

          {/* Administration */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGEMENT']} />}>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/audit" element={<AuditPage />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
