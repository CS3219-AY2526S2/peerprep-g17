import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RequireAuth, RequireAdmin } from "@/components/RouteGuards";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import DashboardPage from "@/pages/DashboardPage";
import AdminPage from "@/pages/AdminPage";
import QuestionPage from "@/pages/QuestionPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/questions"
          element={
            <RequireAdmin>
              <QuestionPage />
            </RequireAdmin>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
