import { Outlet } from "react-router";

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-600 mb-2">Business Manager</h1>
          <p className="text-muted-foreground">Multitenant Business Management Platform</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
