/**
 * This script is used to rename the binary with the platform specific postfix.
 * When `tauri build` is ran, it looks for the binary name appended with the platform specific postfix.
 */

import { execa } from 'execa'
import fs from 'fs'

const BINARY_NAME = 'backend'
const PATH_SOURCE_BINARY = '_package/binary'
const PATH_DESTINATION_BINARY = 'src-tauri/binaries/'

async function main() {
  const rustTargetInfo = JSON.parse(
    (
      await execa('rustc', ['-Z', 'unstable-options', '--print', 'target-spec-json'], {
        env: {
          RUSTC_BOOTSTRAP: 1,
        },
      })
    ).stdout
  )
  const platformPostfix = rustTargetInfo['llvm-target']
  const platformPostfix2 = `${rustTargetInfo['arch']}-${rustTargetInfo['vendor']}-${rustTargetInfo['archive-format']}`

  if (!fs.existsSync(PATH_DESTINATION_BINARY)) {
    fs.mkdirSync(PATH_DESTINATION_BINARY, { recursive: true })
  }

  // TODO: Make it so that the binaries are looked for dynamically and append the platform postfix
  // ^^ should ofcourse not append it if a tripplet is already present.
  // fs.copyFileSync(
  //   `${PATH_SOURCE_BINARY}/${BINARY_NAME}`,
  //   `src-tauri/target/debug/${BINARY_NAME}-${platformPostfix2}`
  // )
  fs.copyFileSync(`${PATH_SOURCE_BINARY}/${BINARY_NAME}`, `${PATH_DESTINATION_BINARY}/${BINARY_NAME}-${platformPostfix2}`)

  // fs.copyFileSync(
  //   `${PATH_SOURCE_BINARY}/${BINARY_NAME}`,
  //   `src-tauri/target/debug/${BINARY_NAME}-${platformPostfix}`
  // )
  fs.copyFileSync(`${PATH_SOURCE_BINARY}/${BINARY_NAME}`, `${PATH_DESTINATION_BINARY}/${BINARY_NAME}-${platformPostfix}`)
}

main().catch((e) => {
  throw e
})
