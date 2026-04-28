// src/shared/components/RequirePermission.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/shared/contexts/AuthContext";

export function RequirePermission({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const { user, isReady, hasPermission } = useAuth();
  const location = useLocation();

  if (!isReady) return null;

  if (!user) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }

  if (!hasPermission(permission)) {
    // ✅ show forbidden page instead of silent redirect
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-md w-full bg-card border rounded-xl p-6">
          <h2 className="text-lg font-semibold">Access denied</h2>
          <p className="text-sm text-muted-foreground mt-2">
            You don&apos;t have permission to access this page.
          </p>

          <div className="mt-4 text-xs text-muted-foreground">
            Required: <span className="font-mono">{permission}</span>
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            Your role: <span className="font-mono">{user.role}</span>
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            Your permissions:
            <div className="mt-2 font-mono whitespace-pre-wrap">
              {(user.permissions ?? []).join(", ") || "(none)"}
            </div>
          </div>

          <div className="mt-6">
            <button
              className="w-full rounded-md bg-black text-white py-2 text-sm"
              onClick={() => window.history.back()}
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}