import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, role: true },
  });

  if (!dbUser) {
    redirect("/api/auth/force-logout");
  }

  if (dbUser.role !== "ADMIN") redirect("/dashboard");

  return (
    <DashboardShell role={dbUser.role} name={dbUser.name || "Admin"}>
      {children}
    </DashboardShell>
  );
}
