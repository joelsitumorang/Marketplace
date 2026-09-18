import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import ReturFormClient from "./ReturFormClient";

export const metadata = {
  title: "Ajukan Retur Baru | MBG Internal Portal",
};

export default async function NewReturPage(props: {
  searchParams: Promise<{ sku?: string }>;
}) {
  const session = await getSession();
  
  if (!session) {
    redirect("/mbg-internal-portal/login");
  }

  const searchParams = await props.searchParams;
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
