#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "fs"
import { homedir } from "os"
import { join } from "path"
import { spawn } from "child_process"
import { parse as parseJSONC, modify, applyEdits, format } from "jsonc-parser"

const RED = "\x1b[31m"
const GREEN = "\x1b[32m"
const YELLOW = "\x1b[33m"
const RESET = "\x1b[0m"

const CROFAI_PROVIDER_ID = "crofai"
const PLUGIN_NAME = "opencode-crof-auth"

function getConfigPath() {
    if (process.argv.length > 2) {
        return process.argv[2]
    }

    if (process.env.OPENCODE_CONFIG) {
        return process.env.OPENCODE_CONFIG
    }

    const home = homedir()
    const platform = process.platform

    let configDir
    if (platform === "win32") {
        configDir = join(process.env.APPDATA || join(home, "AppData", "Roaming"), "opencode")
    } else if (platform === "darwin") {
        configDir = join(home, "Library", "Application Support", "opencode")
    } else {
        configDir = join(home, ".config", "opencode")
    }

    const jsonPath = join(configDir, "opencode.json")
    if (existsSync(jsonPath)) return jsonPath

    const jsoncPath = join(configDir, "opencode.jsonc")
    if (existsSync(jsoncPath)) return jsoncPath

    return null
}

function addCrofaiProvider(configPath) {
    if (!existsSync(configPath)) {
        console.error(`${RED}Error:${RESET} Config file not found at ${configPath}`)
        console.error(`  Please create the config file first, or run:`)
        console.error(`    npx ${PLUGIN_NAME} <path-to-config>`)
        return false
    }

    const content = readFileSync(configPath, "utf-8")
    const errors = []
    const config = parseJSONC(content, errors)

    if (config === null || config === undefined) {
        console.error(`${RED}Error:${RESET} Could not parse config at ${configPath}`)
        return false
    }

    const providers = config.provider || {}
    if (providers[CROFAI_PROVIDER_ID]) {
        console.log(`${GREEN}OK:${RESET} crofai provider already exists in ${configPath}`)
        return true
    }

    const edits = config.provider === undefined
        ? modify(content, ["provider"], { [CROFAI_PROVIDER_ID]: {} }, { tabSize: 2 })
        : modify(content, ["provider", CROFAI_PROVIDER_ID], {}, { tabSize: 2 })

    const edited = applyEdits(content, edits)
    const fmtEdits = format(edited, undefined, { tabSize: 2 })
    writeFileSync(configPath, applyEdits(edited, fmtEdits))
    console.log(`${GREEN}OK:${RESET} Added crofai provider to ${configPath}`)
    return true
}

function installPlugin() {
    return new Promise((resolve) => {
        console.log(`Installing plugin via opencode plugin...`)

        const proc = spawn("opencode", ["plugin", PLUGIN_NAME, "-g"], {
            stdio: "inherit",
        })

        proc.on("close", (code) => {
            resolve(code === 0)
        })
    })
}

async function setup() {
    console.log(`${PLUGIN_NAME} setup\n`)

    const installed = await installPlugin()
    if (!installed) {
        console.error(`${RED}Error:${RESET} Failed to install plugin.`)
        console.error(`  Please ensure 'opencode' is installed and in your PATH.`)
        process.exit(1)
    }

    const configPath = getConfigPath()
    if (!configPath) {
        console.error(`${RED}Error:${RESET} Could not find opencode config file.`)
        console.error(`  Expected location: ~/.config/opencode/opencode.json`)
        console.error(`  Or specify a path: npx ${PLUGIN_NAME} <path-to-config>`)
        process.exit(1)
    }

    const configured = addCrofaiProvider(configPath)
    if (!configured) {
        process.exit(1)
    }

    console.log(`\n${GREEN}Done!${RESET}`)
    console.log(`Next steps:`)
    console.log(`  1. Run: opencode auth login crofai (or /connect in opencode)`)
    console.log(`  2. Select a CrofAI model using: /models`)
}

setup()
