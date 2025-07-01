import React, { useState, useEffect } from "react";
import Head from "next/head";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/router";
import Link from "next/link";
import { useCurrentSubdomain } from "../hooks/useCurrentSubdomain";

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title = "Admin Dashboard",
}) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { subdomain, isAdminSubdomain } = useCurrentSubdomain();

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  const menuItems = [
    { name: "Dashboard", href: "/admin", icon: "📊" },
    { name: "Products", href: "/admin/products", icon: "📦" },
    { name: "Categories", href: "/admin/categories", icon: "📂" },
    { name: "Orders", href: "/admin/orders", icon: "📋" },
    { name: "Users", href: "/admin/users", icon: "👥" },
    { name: "Analytics", href: "/admin/analytics", icon: "📈" },
    { name: "SMS Campaign", href: "/admin/sms-campaign", icon: "📊" },
    { name: "Whatsapp Campaign", href: "/admin/whatsapp", icon: "📊" },
    { name: "Domain Management", href: "/admin/domains", icon: "🌐" },
    { name: "Settings", href: "/admin/settings", icon: "⚙️" },
    ...(user.subdomain ? [{ name: "Subdomain", href: "/admin/settings/subdomain", icon: "🌐" }] : []),
  ];

  return (
    <>
      <Head>
        <title>{title} - Anjum's Admin</title>
        <meta
          name="description"
          content="Admin dashboard for managing the ecommerce store"
        />
      </Head>

      <div className="min-h-screen bg-gray-100 flex">
        {/* Sidebar */}
        <div
          className={`${sidebarOpen ? "w-64" : "w-20"} bg-gray-900 text-white transition-all duration-300`}
        >
          <div className="p-4">
            <div className="flex items-center space-x-2">
                <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-xl px-2 py-1 rounded">
                  {user.subdomain ? user.subdomain.charAt(0).toUpperCase() : user.firstName.charAt(0).toUpperCase()}
                </div>
                {sidebarOpen && (
                  <span className="text-xl font-bold">
                    {user.subdomain ? `${user.subdomain}.store` : "Admin Dashboard"}
                  </span>
                )}
              </div>
          </div>

          <nav className="mt-8">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors ${
                  router.pathname === item.href
                    ? "bg-gray-800 text-white border-r-4 border-orange-500"
                    : ""
                }`}
              >
                <span className="text-2xl">{item.icon}</span>
                {sidebarOpen && <span className="ml-3">{item.name}</span>}
              </Link>
            ))}
          </nav>

          {/* <div className="absolute bottom-4 left-4 right-4">
            <Link href="/" className="flex items-center px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors rounded">
              <span className="text-2xl">🌐</span>
              {sidebarOpen && <span className="ml-3">Visit Store</span>}
            </Link>
          </div> */}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <header className="bg-white shadow-sm border-b">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
                <h1 className="text-2xl font-semibold text-gray-900">
                  {title}
                </h1>
                {user.subdomain && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    {user.subdomain}.store
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <button className="relative text-gray-600 hover:text-gray-900">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-5 5-5-5h5v-5a7 7 0 000-14h-5l5-5 5 5h-5v5a7 7 0 000 14z"
                    />
                  </svg>
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    3
                  </span>
                </button>

                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {user.firstName?.charAt(0)}
                  </div>
                  <span className="text-gray-700">
                    {user.firstName} {user.lastName}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </>
  );
};

export default AdminLayout;
