import { Buffer } from 'node:buffer'
import sharp from 'sharp'
import { fabric } from 'fabric'
import cacheManager from 'cache-manager'
import fsStore from 'cache-manager-fs-hash'
import hash from 'object-hash'

// Const memoryCache = cacheManager.caching({
// 	store: 'memory',
// 	max: 100,
// 	ttl: 10 * 60, /* Seconds */
// });

const diskCache = cacheManager.caching({
  store: fsStore,
  options: {
    path: 'tmp/stream-deck-images', // Path for cached files
    ttl: 60 * 60 * 24 * 365, // Time to life in seconds
    subdirs: true, // Create subdirectories to reduce the
    // files in a single dir (default: false)
    zip: false, // Zip files to save disk space (default: false)
  },
})

const cache = cacheManager.multiCaching([
  // MemoryCache, // not using memory cache in development since the restart is way more common than one may think and on restart it would always rerender everything
  diskCache,
])

sharp.concurrency(10)

export default class RenderButton {
  async render(options = {}) {
    try {
      return cache.wrap(hash(options), () => RenderButton.prototype.renderImage(options))
    } catch (error) {
      console.log('error while trying to render image via cache or actually render', error)
    }
  }

  async renderImage(options = {}) {
    const { keyIndex, label: textString, backgroundColor } = options
    const time = Date.now()
    console.log(`render ${keyIndex} ${textString} ${time}`)
    // Const canvas = new fabric.Canvas()
    const canvas = new fabric.StaticCanvas(null, {
      backgroundColor,
      width: options.streamDeck.ICON_SIZE,
      height: options.streamDeck.ICON_SIZE,
      renderOnAddRemove: false,
    })
    if (textString) {
      const text = new fabric.Textbox(textString, {
        fill: '#FFFFFF',
        fontFamily: 'Source Sans Pro',
        textAlign: 'center',
      })
      canvas.add(text)
      text.scaleToWidth(options.streamDeck.ICON_SIZE)
      if (text.getScaledHeight() > options.streamDeck.ICON_SIZE) {
        text.scaleToHeight(options.streamDeck.ICON_SIZE)
      }

      text.center()
    }

    try {
      console.log(`render ${keyIndex} ${textString}: buffering ${(Date.now() - time) / 1000}`)
      const imgBuff = await sharp(Buffer.from(canvas.toSVG()))
        // .resize(options.streamDeck.ICON_SIZE, options.streamDeck.ICON_SIZE)
        .flatten()
        .raw()
        .toBuffer()
      console.log(`render ${keyIndex} ${textString}: sending ${(Date.now() - time) / 1000}`)
      return imgBuff
    } catch (error) {
      console.log('error inside render', error)
    }
  }
}
