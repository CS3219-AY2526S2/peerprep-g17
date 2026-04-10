import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { USER_API_URL } from "@/config";
import type { User } from "@/types";

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

// User type is imported from @/types

interface ProfileUpdatePayload {
  username?: string;
  university?: string;
  bio?: string;
  profilePhotoUrl?: string | null;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateProfile: (payload: ProfileUpdatePayload) => Promise<void>;
  uploadProfilePhoto: (file: File) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>; 
}

const AuthContext = createContext<AuthContextType | null>(null);

function normalizeUser(payload: Partial<User> & { id: string }): User {
  return {
    id: payload.id,
    username: payload.username || "",
    email: payload.email || "",
    role: payload.role || "user",
    university: payload.university || "",
    bio: payload.bio || "",
    profilePhotoUrl: payload.profilePhotoUrl || null,
  };
}

function normalizeStoredUser(raw: string | null): User | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<User> & { id?: string };
    if (!parsed.id) {
      return null;
    }

    return normalizeUser(parsed as Partial<User> & { id: string });
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("token"),
  );

  const [user, setUser] = useState<User | null>(() =>
    normalizeStoredUser(localStorage.getItem("user")),
  );

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

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!token) {
      return;
    }

    const res = await fetch(`${USER_API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || "Failed to fetch profile");
    }

    setUser(normalizeUser(json.data));
  }, [token]);

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await fetch(`${USER_API_URL}/login`, {
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

    setUser(normalizeUser(json.data));
  }, []);

  const signup = useCallback(
    async (username: string, email: string, password: string) => {
      const res = await fetch(`${USER_API_URL}/register`, {
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

      setUser(normalizeUser(json.data));
    },
    [],
  );

  const updateProfile = useCallback(
    async (payload: ProfileUpdatePayload): Promise<void> => {
      if (!token) {
        throw new Error("Not authenticated");
      }

      const res = await fetch(`${USER_API_URL}/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to update profile");
      }

      setUser(normalizeUser(json.data));
    },
    [token],
  );

  const uploadProfilePhoto = useCallback(
    async (file: File): Promise<void> => {
      if (!token) {
        throw new Error("Not authenticated");
      }

      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch(`${USER_API_URL}/me/photo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to upload profile photo");
      }

      setUser(normalizeUser(json.data));
    },
    [token],
  );

  const logout = useCallback(() => {
    console.log("[Auth] Logout — token cleared");
    setToken(null);
    setUser(null);
  }, []);

  const loginWithToken = useCallback(async(token: string): Promise<void> => {
    setToken(token)
    const res = await fetch(`${USER_API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (!res.ok) {
      throw new Error(json.error || "Failed to fetch profile")
    }
    setUser(normalizeUser(json.data))
    }, [])

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        login,
        signup,
        logout,
        refreshProfile,
        updateProfile,
        uploadProfilePhoto,
        loginWithToken
      }}
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
