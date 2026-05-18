/**
 * camera.js — Capacitor-aware photo capture utility
 * Falls back to file input on web/browser.
 */

const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())

/**
 * Take a photo using the device camera.
 * Returns a base64 data URI string, or null on cancel/error.
 */
export async function takePhoto() {
  if (isNative()) {
    try {
      const { Camera } = await import('@capacitor/camera')
      const { CameraResultType, CameraSource } = await import('@capacitor/camera')
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        quality: 80,
        allowEditing: false,
        saveToGallery: false,
      })
      return photo.dataUrl
    } catch (err) {
      if (err.message?.includes('cancelled') || err.message?.includes('canceled')) return null
      console.error('[camera] takePhoto error:', err)
      return null
    }
  }

  // Browser fallback — open file picker
  return _browserFilePicker('image/*')
}

/**
 * Pick a photo from the device gallery / photo library.
 * Returns a base64 data URI string, or null on cancel/error.
 */
export async function pickFromGallery() {
  if (isNative()) {
    try {
      const { Camera } = await import('@capacitor/camera')
      const { CameraResultType, CameraSource } = await import('@capacitor/camera')
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        quality: 80,
        allowEditing: false,
      })
      return photo.dataUrl
    } catch (err) {
      if (err.message?.includes('cancelled') || err.message?.includes('canceled')) return null
      console.error('[camera] pickFromGallery error:', err)
      return null
    }
  }

  // Browser fallback — open file picker
  return _browserFilePicker('image/*')
}

/**
 * Pick multiple photos from gallery.
 * Returns array of base64 data URI strings.
 */
export async function pickMultiplePhotos() {
  if (isNative()) {
    try {
      const { Camera } = await import('@capacitor/camera')
      const result = await Camera.pickImages({
        quality: 80,
      })
      return result.photos.map(p => p.dataUrl).filter(Boolean)
    } catch (err) {
      if (err.message?.includes('cancelled') || err.message?.includes('canceled')) return []
      console.error('[camera] pickMultiplePhotos error:', err)
      return []
    }
  }

  // Browser fallback — multiple file picker
  const dataUrl = await _browserFilePicker('image/*', true)
  return dataUrl ? [dataUrl] : []
}

// ─── Internal helper ──────────────────────────────────────────────────────────

function _browserFilePicker(accept = 'image/*', multiple = false) {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = multiple

    input.onchange = async (e) => {
      const files = Array.from(e.target.files || [])
      if (!files.length) return resolve(null)

      const file = files[0]
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(file)
    }

    input.oncancel = () => resolve(null)
    // handle no selection (click-away)
    window.addEventListener('focus', () => {
      setTimeout(() => {
        if (!input.files?.length) resolve(null)
      }, 500)
    }, { once: true })

    input.click()
  })
}
