/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as authOptions from "../authOptions.js";
import type * as bodyLanguageSnapshots from "../bodyLanguageSnapshots.js";
import type * as cheatingIncidents from "../cheatingIncidents.js";
import type * as codeSubmissions from "../codeSubmissions.js";
import type * as http from "../http.js";
import type * as interviews from "../interviews.js";
import type * as lib_authz from "../lib/authz.js";
import type * as reports from "../reports.js";
import type * as scores from "../scores.js";
import type * as transcripts from "../transcripts.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  authOptions: typeof authOptions;
  bodyLanguageSnapshots: typeof bodyLanguageSnapshots;
  cheatingIncidents: typeof cheatingIncidents;
  codeSubmissions: typeof codeSubmissions;
  http: typeof http;
  interviews: typeof interviews;
  "lib/authz": typeof lib_authz;
  reports: typeof reports;
  scores: typeof scores;
  transcripts: typeof transcripts;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
