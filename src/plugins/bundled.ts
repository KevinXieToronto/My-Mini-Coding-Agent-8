/**
 * The set of plugins shipped with MiniClaw.
 *
 * The real OpenClaw discovers plugin manifests on disk; MiniClaw keeps a static bundled list.
 * This module is the single sanctioned boundary crossing from core into plugin code.
 */
import type { Plugin } from "../plugin-sdk.js"
import cliChannel from "../../extensions/cli-channel/plugin.js"
import openaiProvider from "../../extensions/openai-provider/plugin.js"

export const bundledPlugins: readonly Plugin[] = [cliChannel, openaiProvider]
