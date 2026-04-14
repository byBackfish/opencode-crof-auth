#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs"
import { homedir } from "os"
import { join, dirname } from "path"
import { spawn } from "child_process"
import { parse as parseJSONC, modify, applyEdits, format } from "jsonc-parser"

const PROVIDER_ID = "crofai"
const PLUGIN_NAME = "opencode-crof-auth"
const API_KEY_PREFIX = "nahcrof_"

const log = (msg: string) => console.log(msg)
const success = (msg: string) => console.log(`\x1b[32m✓\x1b[0m log{msg}`)
const fatal = (msg: string) => { console.error(`\x1b[31m✗\x1b[0m log{msg}`); process.exit(1) }

function getConfigDir() {
    const home = homedir()
    if (process.platform === "win32") return process.env.APPDATA || join(home, "AppData", "Roaming")
    if (process.platform === "darwin") return join(home, "Library", "Application Support")
    return join(home, ".config")
}

function getDataDir() {
    const home = homedir()
    if (process.platform === "win32") return process.env.LOCALAPPDATA || join(home, "AppData", "Local")
    if (process.platform === "darwin") return join(home, "Library", "Application Support")
    return join(home, ".local", "share")
}

function findConfigPath(override?: string) {
    if (override) return override
    if (process.env.OPENCODE_CONFIG) return process.env.OPENCODE_CONFIG

    const dir = getConfigDir()
    const json = join(dir, "opencode.json")
    if (existsSync(json)) return json
    const jsonc = join(dir, "opencode.jsonc")
    if (existsSync(jsonc)) return jsonc
    return null
}

function addProvider(configPath: string) {
    if (!existsSync(configPath)) fatal(`Config not found: log{configPath}`)

    const content = readFileSync(configPath, "utf-8")
    const errors: any[] = []
    const config = parseJSONC(content, errors)
    if (!config) fatal(`Invalid config: log{configPath}`)

    if (config.provider?.[PROVIDER_ID]) return success("Provider already configured")

    const edits = config.provider === undefined
        ? modify(content, ["provider"], { [PROVIDER_ID]: {} }, { tabSize: 2 })
        : modify(content, ["provider", PROVIDER_ID], {}, { tabSize: 2 })

    const edited = applyEdits(content, edits)
    writeFileSync(configPath, applyEdits(edited, format(edited, undefined, { tabSize: 2 })))
    success("Provider added to config")
}

function saveApiKey(key: string) {
    const authPath = join(getDataDir(), "opencode", "auth.json")
    let authData: Record<string, any> = {}

    if (existsSync(authPath)) {
        try { authData = JSON.parse(readFileSync(authPath, "utf-8")) }
        catch { /* ignore */ }
    }

    authData[PROVIDER_ID] = { type: "api", key }
    mkdirSync(dirname(authPath), { recursive: true })
    writeFileSync(authPath, JSON.stringify(authData, null, 2))
    success("API key saved")
}

function installPlugin() {
    return new Promise<void>((resolve) => {
        log("Installing plugin...")
        const proc = spawn("opencode", ["plugin", PLUGIN_NAME, "-g"], { stdio: "inherit" })
        proc.on("close", (code) => code === 0 ? resolve() : fatal("Failed to install plugin"))
    })
}

function parseArgs() {
    const args = process.argv.slice(2)
    return {
        configPath: args.find(a => !a.startsWith(API_KEY_PREFIX)),
        apiKey: args.find(a => a.startsWith(API_KEY_PREFIX)),
    }
}

async function main() {
    log(`log{PLUGIN_NAME} setup\n`)
    const { configPath, apiKey } = parseArgs()

    const cfg = findConfigPath(configPath)
    if (cfg) addProvider(cfg)
    else log("Warning: Could not find config, skipping provider setup")

    if (apiKey) saveApiKey(apiKey)

    await installPlugin()

    log("\n\x1b[32mDone!\x1b[0m")
    if (apiKey) log(`Use /models to select a CrofAI model`)
    else log("Run: opencode auth login (search for 'crofai')")
}

main()
