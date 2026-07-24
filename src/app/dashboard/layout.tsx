import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role === "ADMIN") redirect("/admin");

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, role: true },
  });

  if (!dbUser) {
    redirect("/api/auth/force-logout");
  }

  return (
    <DashboardShell role={dbUser.role} name={dbUser.name || "Modelo"}>
      {children}
    </DashboardShell>
  );
}
