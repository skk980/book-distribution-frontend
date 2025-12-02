// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import BooksPage from "./pages/BooksPage";
import BoxesPage from "./pages/BoxesPage";
import DistributorsPage from "./pages/DistributorsPage";
import TripsPage from "./pages/TripsPage";
import ActiveTripsPage from "./pages/ActiveTripsPage";
import ReportsPage from "./pages/ReportsPage";
import LoginPage from "./pages/LoginPage";

function App() {
  return (
    <Routes>
      {/* Public route (no layout) */}
      <Route path="/login" element={<LoginPage />} />

      {/* Redirect root to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* All app pages wrapped inside Layout */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/books" element={<BooksPage />} />
        <Route path="/boxes" element={<BoxesPage />} />
        <Route path="/distributors" element={<DistributorsPage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/active-trips" element={<ActiveTripsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
