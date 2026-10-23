import { serve } from "inngest/next";
import inngest from "@/config/inngest";
import { inngestFunctions } from "@/lib/inngest";

/**
 * Inngest endpoint for background function discovery, scheduling, and execution.
 * Handles App Router route handler requests for Inngest cloud and Inngest dev server.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
});
