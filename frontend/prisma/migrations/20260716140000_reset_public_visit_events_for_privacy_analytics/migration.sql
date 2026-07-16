-- Start the privacy-first analytics report with a clean event history.
-- This removes visit/contract-access analytics only; contracts and orders remain intact.
DELETE FROM "PublicVisitEvent";
