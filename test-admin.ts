import { adminDashboardMetrics } from "./src/lib/admin.functions";

async function test() {
  try {
    console.log("Running adminDashboardMetrics...");
    const res = await adminDashboardMetrics({ data: undefined, context: {} });
    console.log("Success:", JSON.stringify(res, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
