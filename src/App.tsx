import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AppSettingsProvider } from './contexts/AppSettingsContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { InventoryListPage } from './pages/InventoryListPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { ProductNewPage } from './pages/ProductNewPage'
import { ProductEditPage } from './pages/ProductEditPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { InventoryCountPage } from './pages/InventoryCountPage'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  return (
    <AppSettingsProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<InventoryListPage />} />
                <Route path="/products/new" element={<ProductNewPage />} />
                <Route path="/products/:id" element={<ProductDetailPage />} />
                <Route path="/products/:id/edit" element={<ProductEditPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/inventory-count" element={<InventoryCountPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </AppSettingsProvider>
  )
}

export default App
