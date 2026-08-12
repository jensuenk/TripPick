import { TripDashboard } from "@/components/trip/trip-dashboard";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function TripPage({ params }: Props) {
  const { token } = await params;
  return <TripDashboard token={token} />;
}
