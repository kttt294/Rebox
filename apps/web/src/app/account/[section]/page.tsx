import { notFound } from "next/navigation";
import { AddressSettings, PasswordSettings, PersonalInformation, PrivacySettings, PurchaseOrders } from "../../../features/account-center";

const sections = { address: AddressSettings, password: PasswordSettings, privacy: PrivacySettings, personal: PersonalInformation, orders: PurchaseOrders } as const;

export default async function AccountDevelopmentPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const Section = sections[section as keyof typeof sections];
  if (!Section) notFound();
  return <Section />;
}
