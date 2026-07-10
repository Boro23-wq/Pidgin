/**
 * Encrypts any user_tokens rows still holding plaintext Gmail tokens.
 *
 *   npx tsx scripts/backfill-token-encryption.ts --dry-run
 *   npx tsx scripts/backfill-token-encryption.ts
 *
 * ORDER MATTERS. Run this only AFTER the code that understands ciphertext is
 * deployed. The previously-deployed code reads refresh_token raw and hands it
 * straight to Google; if it sees ciphertext it will fail every Gmail call and
 * every user will appear to need a reconnect.
 *
 * Idempotent: already-encrypted rows are skipped, so re-running is harmless.
 * Once this reports 0 remaining, set TOKENS_REQUIRE_ENCRYPTION=true so a
 * plaintext token becomes an error rather than a silent downgrade.
 */
// Next reads .env.local; plain `dotenv/config` would only read .env.
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { encryptToken, isEncrypted } from "../lib/crypto";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  if (!process.env.TOKEN_ENCRYPTION_KEY) throw new Error("TOKEN_ENCRYPTION_KEY required");

  // Guard against the exact footgun this script enables: encrypting rows while
  // the flag is on means nothing can read them until the new code is live.
  if (process.env.TOKENS_REQUIRE_ENCRYPTION === "true") {
    console.warn("TOKENS_REQUIRE_ENCRYPTION=true — set it only AFTER this backfill completes.\n");
  }

  const supabase = createClient(url, key);

  const { data, error } = await supabase
    .from("user_tokens")
    .select("clerk_user_id, access_token, refresh_token");
  if (error) throw error;

  const rows = data ?? [];
  const stale = rows.filter(
    (r) => !isEncrypted(r.refresh_token) || !isEncrypted(r.access_token)
  );

  console.log(`${rows.length} rows total, ${stale.length} needing encryption.`);
  if (stale.length === 0) {
    console.log("Nothing to do. Safe to set TOKENS_REQUIRE_ENCRYPTION=true.");
    return;
  }
  if (DRY_RUN) {
    console.log("Dry run — no writes. Re-run without --dry-run to apply.");
    return;
  }

  let done = 0;
  for (const row of stale) {
    const { error: updateError } = await supabase
      .from("user_tokens")
      .update({
        access_token: isEncrypted(row.access_token)
          ? row.access_token
          : encryptToken(row.access_token),
        refresh_token: isEncrypted(row.refresh_token)
          ? row.refresh_token
          : encryptToken(row.refresh_token),
      })
      .eq("clerk_user_id", row.clerk_user_id);

    if (updateError) {
      console.error(`  FAILED ${row.clerk_user_id}:`, updateError.message);
      continue;
    }
    done++;
    console.log(`  encrypted ${row.clerk_user_id}`);
  }

  console.log(`\n${done}/${stale.length} rows encrypted.`);
  if (done === stale.length) {
    console.log("All rows encrypted. Now set TOKENS_REQUIRE_ENCRYPTION=true in Vercel.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
