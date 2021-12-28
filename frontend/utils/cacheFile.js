// TODO: Need directives on Android:
// https://capacitorjs.com/docs/apis/filesystem

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Http } from '@capacitor-community/http'

const clear = async (path = '', olderThan = null) => {
  console.log('clear:', path)
  console.log('clear:', olderThan)
  if (path !== 'test') return true
  const { files } = await Filesystem.readdir({
    directory: Directory.Cache,
    path,
  })
  if (files.length === 0) return true // nothing to process
  return Promise.all(
    files.map(async (path2) => {
      const pathCombined = `${path}/${path2}`
      console.log('checking ', pathCombined)
      const stat = await Filesystem.stat({
        directory: Directory.Cache,
        path: pathCombined,
      })

      console.log('clear:', stat)
      console.log('clear:', stat.mtime)
      console.log('clear:', olderThan)
      console.log('clear:', stat.mtime < olderThan)

      if (stat.type === 'directory') {
        console.log('is folder => run this.clear(', pathCombined, ',', olderThan, ') recursive')
        await clear(pathCombined, olderThan)
        // after cleraing a folder we have to re-check if it is empty by now
        const { files } = await Filesystem.readdir({
          directory: Directory.Cache,
          path,
        })
        if (files.length !== 0) {
          console.log('folder is not empty (probably because clear with olderThan) => do not delete folder')
          // when olderThen is used the folder may not be empty after the clear process since files may be left cause not old enough to delete!
          return true
        }
        console.log('folder is empty => delte folder')
        await Filesystem.rmdir({
          directory: Directory.Cache,
          path: pathCombined,
        })
        console.log(`folder ${pathCombined} deleted successfully`)
      } else if (!olderThan || stat.mtime < olderThan) {
        console.log('is file => delte file')
        await Filesystem.deleteFile({
          directory: Directory.Cache,
          path: pathCombined,
        })
        console.log(`file ${pathCombined} deleted successfully`)
      }
      return true
    })
  )
}

export default {
  exists: async (path) => {
    try {
      await Filesystem.stat({
        directory: Directory.Cache,
        path,
      })
      return true
    } catch (error) {
      return false
    }
  },

  write: async (path, data) => {
    // TODO: Possibly needs to check folder exists and create folder?
    await Filesystem.writeFile({
      directory: Directory.Cache,
      path,
      data,
      encoding: Encoding.UTF8,
    })
  },

  // return { blob, path }
  download: async (path, url) => {
    const options = {
      fileDirectory: Directory.Cache,
      url,
      filePath: path,
      method: 'GET',
    }
    return await Http.downloadFile(options)
  },

  read: async (path) => {
    try {
      return await Filesystem.readFile({
        directory: Directory.Cache,
        path,
        // encoding: Encoding.UTF8,
      })
    } catch (error) {
      console.log('cacheFile read:', error)
      return false
    }
  },

  delete: async (path) => {
    await Filesystem.deleteFile({
      directory: Directory.Cache,
      path,
    })
  },

  clear,
}
