import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AuthApi } from "@/shared/lib/services/auth";

export default function OAuthSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const next = params.get("next") || "/dashboard";

      if (!token) {
        toast.error("OAuth failed", { description: "Missing token" });
        navigate("/auth/login", { replace: true });
        return;
      }

      // 1) store token
      localStorage.setItem("access_token", token);

      // 2) fetch user from backend using token
      try {
        const user = await AuthApi.me();
        localStorage.setItem("auth_user", JSON.stringify(user));

        // optional
        localStorage.removeItem("current_business_id");

        // notify contexts (si tu l’utilises)
        window.dispatchEvent(new Event("auth-changed"));

        toast.success("Logged in!");
        navigate(next, { replace: true });
      } catch (e) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("auth_user");
        toast.error("OAuth failed", { description: "Cannot load user profile" });
        navigate("/auth/login", { replace: true });
      }
    };

    run();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-sm text-muted-foreground">Logging in...</div>
    </div>
  );
}
