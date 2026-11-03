// Checks that every message catalog matches the Spanish source: the same
// keys, no empty messages, and the same ICU arguments and rich-text tags, so
// a translation can't drop a `{name}` or a `<osm>` link. Run in CI.
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const DIR = join(import.meta.dirname, "..", "messages")
const SOURCE = "es"

function flatten(messages, prefix = "", out = new Map()) {
  for (const [key, value] of Object.entries(messages)) {
    const path = prefix + key
    if (value && typeof value === "object") flatten(value, `${path}.`, out)
    else out.set(path, value)
  }
  return out
}

// The argument names and tags in an ICU message, skipping the literal text of
// plural/select branches (`{count, plural, one {unidad} …}`).
function signature(message) {
  const found = new Set()
  let i = 0

  function text(until) {
    while (i < message.length && message[i] !== until) {
      if (message[i] === "{") argument()
      else if (message[i] === "<") tag()
      else i++
    }
  }

  function tag() {
    const match = /^<\/?([\w-]+)>/.exec(message.slice(i))
    if (match) found.add(`<${match[1]}>`)
    i += match ? match[0].length : 1
  }

  function argument() {
    i++ // {
    const [head] = /^[^,}]*/.exec(message.slice(i))
    i += head.length
    found.add(`{${head.trim()}}`)
    if (message[i] === "}") return void i++

    i++ // ,
    const [type] = /^[^,}]*/.exec(message.slice(i))
    i += type.length
    if (message[i] === ",") i++
    if (!["plural", "select", "selectordinal"].includes(type.trim())) {
      while (i < message.length && message[i] !== "}") i++
      return void i++
    }

    // Branches: `key {sub-message}` until the closing brace.
    while (i < message.length && message[i] !== "}") {
      if (message[i] === "{") {
        i++
        text("}")
        i++
      } else i++
    }
    i++
  }

  text(undefined)
  return [...found].sort().join(" ")
}

const source = flatten(
  JSON.parse(readFileSync(join(DIR, `${SOURCE}.json`), "utf8"))
)
const problems = []

for (const file of readdirSync(DIR).filter((name) => name.endsWith(".json"))) {
  const locale = file.replace(/\.json$/, "")
  const messages = flatten(JSON.parse(readFileSync(join(DIR, file), "utf8")))

  for (const [key, value] of messages) {
    if (typeof value !== "string" || value.trim() === "") {
      problems.push(`${locale}: ${key} is empty`)
    }
    if (locale === SOURCE) continue
    if (!source.has(key)) {
      problems.push(`${locale}: ${key} is not in ${SOURCE}.json`)
    } else if (signature(value) !== signature(source.get(key))) {
      problems.push(
        `${locale}: ${key} uses "${signature(value)}" but ${SOURCE}.json uses "${signature(source.get(key))}"`
      )
    }
  }
  for (const key of source.keys()) {
    if (!messages.has(key)) problems.push(`${locale}: ${key} is missing`)
  }
}

if (problems.length > 0) {
  console.error(problems.join("\n"))
  process.exit(1)
}

console.log(`Message catalogs match ${SOURCE}.json (${source.size} keys).`)
