import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { USER_API_URL } from "@/config";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

interface UserRecord {
  _id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

interface AdminPrivilegeRequest {
  id: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  requester: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
  reviewer: {
    id: string;
    username: string;
    email: string;
  } | null;
  reviewedAt: string | null;
  createdAt: string;
}

export default function AdminPage() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [adminRequests, setAdminRequests] = useState<AdminPrivilegeRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function fetchUsers() {
    try {
      const res = await fetch(USER_API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to fetch users");
        return;
      }

      setUsers(json.data);
    } catch {
      setError("Could not connect to User Service");
    } finally {
      setLoading(false);
    }
  }

  async function fetchAdminRequests() {
    setLoadingRequests(true);
    try {
      const res = await fetch(`${USER_API_URL}/admin-requests?status=pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to fetch admin requests");
        return;
      }

      setAdminRequests(json.data || []);
    } catch {
      setError("Could not connect to User Service");
    } finally {
      setLoadingRequests(false);
    }
  }

  useEffect(() => {
    fetchUsers();
    fetchAdminRequests();
  }, [token]);

  async function handleRoleChange(userId: string, newRole: string) {
    setError("");
    try {
      const res = await fetch(
        `${USER_API_URL}/${userId}/role`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role: newRole }),
        },
      );

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to update role");
        return;
      }

      // Refresh user list to reflect the change
      await fetchUsers();
    } catch {
      setError("Could not connect to User Service");
    }
  }

  async function handleAdminRequestReview(
    requestId: string,
    status: "approved" | "rejected",
  ) {
    setError("");

    try {
      const res = await fetch(`${USER_API_URL}/admin-requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Failed to review request");
        return;
      }

      await Promise.all([fetchAdminRequests(), fetchUsers()]);
    } catch {
      setError("Could not connect to User Service");
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 pt-24">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
            <p className="mt-2 text-muted-foreground">
              Manage all registered users
            </p>
          </div>
          <span className="rounded-md bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {users.length} users
          </span>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <p className="mt-12 text-center text-sm text-muted-foreground">
            Loading users…
          </p>
        ) : (
          <div className="mt-8 overflow-hidden rounded-xl border border-border/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Username
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u._id}
                    className="border-b border-border/30 last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 font-medium">
                      <Link
                        to={`/users/${u._id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {u.username}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                          u.role === "admin"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u._id === currentUser?.id ? (
                        <span className="text-xs text-muted-foreground">
                          You
                        </span>
                      ) : u.role === "admin" ? (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleRoleChange(u._id, "user")}
                        >
                          Demote
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleRoleChange(u._id, "admin")}
                        >
                          Promote
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <section className="mt-10 rounded-xl border border-border/50 p-5">
          <h2 className="text-lg font-semibold tracking-tight">
            Pending Admin Requests
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review user requests for admin privileges.
          </p>

          {loadingRequests ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Loading requests...
            </p>
          ) : adminRequests.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No pending admin requests.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {adminRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-lg border border-border/50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{request.requester.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.requester.email}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(request.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-muted-foreground">
                    {request.reason}
                  </p>

                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleAdminRequestReview(request.id, "approved")
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleAdminRequestReview(request.id, "rejected")
                      }
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
