import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import ReturFormClient from "./ReturFormClient";

export const metadata = {
  title: "Ajukan Retur Baru | MBG Internal Portal",
};

export default async function NewReturPage({
  searchParams,
}: {
  searchParams: { sku?: string };
}) {
  const session = await getSession();
  
  if (!session) {
    redirect("/mbg-internal-portal/login");
  }

  // Pre-fill SKU if provided in query params (e.g., ?sku=123456)
  const initialSku = searchParams.sku || "";

  return (
    <ReturFormClient
      cashierName={session.nama_lengkap}
      branchName={session.asal_cabang}
      initialSku={initialSku}
      userRole={session.role}
    />
  );
}
