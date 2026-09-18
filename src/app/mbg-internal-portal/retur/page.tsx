import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import ReturListClient from "./ReturListClient";

export const metadata = {
  title: "Manajemen Retur | MBG Internal Portal",
};

export default async function ReturPage() {
  const session = await getSession();
  
  if (!session) {
    redirect("/mbg-internal-portal/login");
  }

  const isSuperAdmin = session.role === "SUPERADMIN";

  return (
    <ReturListClient
      isSuperAdmin={isSuperAdmin}
      userBranch={session.asal_cabang}
    />
  );
}
