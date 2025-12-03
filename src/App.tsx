// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import BooksPage from "./pages/BooksPage";
import DistributorsPage from "./pages/DistributorsPage";
import TripsPage from "./pages/TripsPage";
import ActiveTripsPage from "./pages/ActiveTripsPage";
import ReportsPage from "./pages/ReportsPage";
import LoginPage from "./pages/LoginPage";

// Check login status
const isLoggedIn = () => {
  return !!localStorage.getItem("authToken");
};

// Wrapper: block pages when NOT logged-in
function ProtectedRoute({ children }: { children: JSX.Element }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  return children;
}

// Wrapper: prevent visiting login if already logged-in
function PublicRoute({ children }: { children: JSX.Element }) {
  if (isLoggedIn()) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Root → redirect based on token */}
      <Route
        path="/"
        element={
          isLoggedIn() ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Public route (login only) */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* All login-protected pages */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/books" element={<BooksPage />} />
        <Route path="/distributors" element={<DistributorsPage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/active-trips" element={<ActiveTripsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  );
}
