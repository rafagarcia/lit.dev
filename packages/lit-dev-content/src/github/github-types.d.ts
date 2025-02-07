/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

export type GitHubSigninReceiverMessage =
  | {code: string; error?: undefined}
  | {code?: undefined; error: string};
