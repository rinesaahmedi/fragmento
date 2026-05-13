WITH parsed AS (
  SELECT
    "id",
    string_to_array(regexp_replace(COALESCE("clientAddress", ''), ',\s*(Floor|Unit):.*$', ''), ',') AS parts
  FROM "ServiceClaim"
  WHERE COALESCE(NULLIF(BTRIM("clientAddress"), ''), '') <> ''
)
UPDATE "ServiceClaim" sc
SET
  "clientCountry" = COALESCE(NULLIF(BTRIM(sc."clientCountry"), ''), NULLIF(BTRIM(parsed.parts[array_length(parsed.parts, 1)]), '')),
  "clientPostalCode" = COALESCE(
    NULLIF(BTRIM(sc."clientPostalCode"), ''),
    NULLIF(split_part(BTRIM(parsed.parts[GREATEST(array_length(parsed.parts, 1) - 1, 1)]), ' ', 1), '')
  ),
  "clientCity" = COALESCE(
    NULLIF(BTRIM(sc."clientCity"), ''),
    NULLIF(BTRIM(regexp_replace(BTRIM(parsed.parts[GREATEST(array_length(parsed.parts, 1) - 1, 1)]), '^\S+\s*', '')), '')
  )
FROM parsed
WHERE sc."id" = parsed."id";

