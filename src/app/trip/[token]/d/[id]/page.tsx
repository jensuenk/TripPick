import { TripDashboard } from "@/components/trip/trip-dashboard";

type Props = {
  params: Promise<{ token: string; id: string }>;
};

export default async function DestinationPage({ params }: Props) {
  const { token, id } = await params;
  return <TripDashboard token={token} initialDestinationId={id} />;
}
