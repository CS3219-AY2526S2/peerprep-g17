/*
AI Assistance Disclosure:
Tool: ChatGPT, date: 2026-03-18
Scope: Added boilerplate code for Google OAuth.
Author review: I checked page behavior manually and added Github OAuth. 
*/

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Handles the redirect back from Google OAuth.
 * Extracts the token from the URL, logs the user in, then navigates to dashboard.
 */
export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const [error, setError] = useState("");
  const params = new URLSearchParams(window.location.search);
  const provider = params.get("provider") || "Google";
  const capitalizedProvider = provider.charAt(0).toUpperCase() + provider.slice(1);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      navigate("/login");
      return;
    }

    loginWithToken(token)
      .then(() => navigate("/"))
      .catch(() => {
        setError(`${capitalizedProvider} login failed. Please try again.`);
        setTimeout(() => navigate("/login"), 2000);
      });
  }, [loginWithToken, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              Signing you in with {capitalizedProvider}...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
