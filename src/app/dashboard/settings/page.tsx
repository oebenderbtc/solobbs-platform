import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { CopyButton } from "@/components/ui/CopyButton";
import { getDictionary } from "@/i18n/server";

export default async function SettingsPage() {
  const dict = await getDictionary();
  const session = await auth();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session!.user.id } });

  const rows = [
    [dict.settingsPage.name, user.name],
    [dict.settingsPage.email, user.email],
    [dict.settingsPage.city, user.city || "—"],
    [dict.settingsPage.phone, user.phone || "—"],
    [
      dict.settingsPage.verified,
      user.isVerified ? dict.settingsPage.verified : dict.settingsPage.notVerified,
    ],
    [dict.dashboard.rating, user.rating.toFixed(1)],
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={dict.settingsPage.eyebrow}
        title={dict.settingsPage.title}
        description={dict.settingsPage.description}
      />

      <div className="surface max-w-2xl space-y-1 rounded-[1.75rem] p-2 sm:p-3">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-2xl px-4 py-3.5 transition hover:bg-ink/40"
          >
            <span className="text-mist">{label}</span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-2xl px-4 py-3.5">
          <div>
            <span className="text-mist">{dict.settingsPage.referral}</span>
            <p className="mt-1 font-medium text-champagne">{user.referralCode}</p>
          </div>
          <CopyButton value={user.referralCode} />
        </div>
        {user.bio && (
          <div className="rounded-2xl px-4 py-3.5">
            <p className="text-mist">Bio</p>
            <p className="mt-2 leading-relaxed">{user.bio}</p>
          </div>
        )}
      </div>
    </div>
  );
}
