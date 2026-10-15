/** The fixture preview is opt-in and never grants Admin or Dealer access. */
export function ownerPreviewAllowed(
  portal: string,
  nodeEnv: string | undefined,
  enabled: string | undefined,
): boolean {
  return portal === 'my' && nodeEnv === 'development' && enabled === '1';
}
