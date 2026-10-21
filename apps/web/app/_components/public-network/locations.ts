/** Public directory shares one partner-location model for sales and service.
 * No fixture locations may be displayed as real approved businesses. */
export type PublicCapability = 'sales' | 'test_ride' | 'service';
export type PublicLocation = {
  id: string;
  name: string;
  country: 'DE' | 'AT';
  city: string;
  address: string;
  capabilities: readonly PublicCapability[];
  approvedForPublication: boolean;
  authorizationActive: boolean;
};

/** First release intentionally has no externally verified partner-location records.
 * Future backend integration must query only organization-approved public projections. */
export const publicLocations: readonly PublicLocation[] = [];

export function publishedLocations(capability: 'sales' | 'service', country: 'DE' | 'AT'): readonly PublicLocation[] {
  return publicLocations.filter((location) =>
    location.country === country &&
    location.approvedForPublication &&
    location.authorizationActive &&
    location.capabilities.includes(capability)
  );
}
