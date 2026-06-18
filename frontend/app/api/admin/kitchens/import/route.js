import { mapAdminMutationError, redirectWithFlash } from "../../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../../lib/auth";
import { shouldStartKitchenImportAgent, startKitchenImportAgent } from "../../../../../lib/kitchen-import-agent";
import { importKitchenFromFiles } from "../../../../../lib/kitchen-import";
import { prisma } from "../../../../../lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request) {
  await requireAdminApi();

  try {
    const formData = await request.formData();
    const result = await importKitchenFromFiles(formData);
    let agentResult;
    try {
      agentResult = shouldStartKitchenImportAgent(formData)
        ? await startKitchenImportAgent({ prisma, kitchenId: result.kitchen.id, importResult: result })
        : { started: false, warning: "Codex finisher was not started." };
    } catch (agentError) {
      const message = agentError instanceof Error ? agentError.message : "Codex finisher failed to start.";
      console.error("Kitchen import Codex finisher failed to start:", agentError);
      agentResult = { started: false, warning: `Codex finisher failed to start: ${message}` };
    }
    const agentMessage = agentResult.started
      ? ` Codex finisher started; log: ${agentResult.logPath}.`
      : ` ${agentResult.warning || "Codex finisher was not started."}`;
    const warningSuffix = result.warnings.length ? ` ${result.warnings.join(" ")}` : "";

    return redirectWithFlash(
      request,
      `/admin/kitchens/${result.kitchen.id}`,
      "success",
      `Kitchen imported with ${result.itemCount} items.${warningSuffix}${agentMessage}`,
    );
  } catch (error) {
    return redirectWithFlash(request, "/admin/kitchens", "error", mapAdminMutationError(error, "Kitchen import"));
  }
}
