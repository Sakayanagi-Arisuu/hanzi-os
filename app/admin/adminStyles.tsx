// The route compiler resolves Vite's raw CSS import; TypeScript has no built-in query-module type.
// @ts-expect-error -- handled by the Vite/Vinext asset pipeline.
import adminCss from "./admin.css?raw";

/** Keep the admin-only skin out of the learner client asset budget. */
export function AdminStyles() {
  return <style data-admin-styles dangerouslySetInnerHTML={{ __html: adminCss }} />;
}
