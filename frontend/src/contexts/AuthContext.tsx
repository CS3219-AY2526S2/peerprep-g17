import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

const API_URL = "http://localhost:8081/api/users";

function decodeToken(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return {
      ...payload,
      issuedAt: new Date(payload.iat * 1000).toLocaleString(),
      expiresAt: new Date(payload.exp * 1000).toLocaleString(),
    };
  } catch {
    return null;
  }
}

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("token"),
  );

  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  async function login(identifier: string, password: string) {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || "Login failed");
    }

    setToken(json.data.token);

    console.log("[Auth] Login successful", decodeToken(json.data.token));

    setUser({
      id: json.data.id,
      username: json.data.username,
      email: json.data.email,
      role: json.data.role,
    });
  }

  async function signup(username: string, email: string, password: string) {
    const res = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || "Signup failed");
    }

    setToken(json.data.token);

    console.log("[Auth] Signup successful", decodeToken(json.data.token));

    setUser({
      id: json.data.id,
      username: json.data.username,
      email: json.data.email,
      role: json.data.role,
    });
  }

  function logout() {
    console.log("[Auth] Logout — token cleared");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ token, user, isAuthenticated: !!token, login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
