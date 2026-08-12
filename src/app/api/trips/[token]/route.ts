import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { getTripByToken } from "@/lib/trip-data";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { token } = await params;
    const trip = await getTripByToken(token);
    if (!trip) return jsonError("Trip not found", 404);
    return jsonOk(trip);
  } catch (error) {
    return handleApiError(error);
  }
}
