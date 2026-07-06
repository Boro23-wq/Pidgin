// Server-side event capture for routes with no browser context (cron jobs,
// the manual digest-send API route). Uses PostHog's plain HTTP capture
// endpoint instead of the posthog-node SDK, since the SDK buffers/batches
// events and needs an explicit flush — easy to get wrong in a serverless
// function that returns before the buffer drains. A single fire-and-forget
// fetch per event avoids that entirely.
//
// distinct_id is the Clerk user id, matching what PostHogIdentify() uses
// client-side (components/posthog-provider.tsx), so server- and
// client-captured events land on the same PostHog person profile.
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  if (!POSTHOG_KEY) return;
  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        distinct_id: distinctId,
        properties,
      }),
    });
  } catch (err) {
    // Analytics must never block or fail a digest send.
    console.error(`[posthog-server] failed to capture "${event}":`, err);
  }
}
