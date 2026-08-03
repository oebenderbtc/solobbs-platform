import { redirect } from "next/navigation";

/** Payment methods removed from the product UI; keep route for old bookmarks. */
export default function PaymentMethodsRemovedPage() {
  redirect("/dashboard/settings");
}
