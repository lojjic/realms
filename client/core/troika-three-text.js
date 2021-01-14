import './three.js'

// NOTE: these UMD builds expect a THREE global
// The ESM builds won't work without importMaps in place
import 'https://cdn.jsdelivr.net/npm/troika-worker-utils'
import 'https://cdn.jsdelivr.net/npm/troika-three-utils'
import 'https://cdn.jsdelivr.net/npm/troika-three-text'

export const Text = window.troika_three_text.Text
