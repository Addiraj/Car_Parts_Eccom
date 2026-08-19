export async function sendSreAlertEmail(_services: any[], recipient?: string) {
  console.log("[SRE] Alert email notification requested for:", recipient);
  return { success: true, message: "Alert logged" };
}
