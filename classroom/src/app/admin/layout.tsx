export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Admin pages depend on the database and environment and should not be prerendered at build time.
  return children;
}


