declare module "*?route-entry-v14" {
  import type { ComponentType } from "react";

  export const MockExamsPage: ComponentType<{
    mode: "catalog" | "history" | "runner";
  }>;
}
