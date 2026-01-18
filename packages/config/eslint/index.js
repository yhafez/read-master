/**
 * Read Master - Shared ESLint Configurations
 *
 * Available configurations:
 * - baseConfig: Core TypeScript rules for all packages
 * - reactConfig: React/JSX support for frontend apps
 * - nodeConfig: Node.js/serverless support for backend apps
 * - libraryConfig: Shared packages used in both environments
 * - ignoreConfig: Standard ignore patterns
 */

export { baseConfig, ignoreConfig } from "./base.js";
export { reactConfig } from "./react.js";
export { nodeConfig } from "./node.js";
export { libraryConfig } from "./library.js";
