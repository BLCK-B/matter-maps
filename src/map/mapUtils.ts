import { Map } from 'maplibre-gl'

/**
 * MapLibre throws if you add sources/layers before the style has finished loading. Our React layer hooks run as
 * soon as the component mounts, which is usually before the map's 'load' event. This helper defers the given
 * callback until the style is ready (running it immediately if it already is) and returns a cancel function so an
 * unmounting effect can avoid running against a disposed map.
 */
export function runWhenStyleReady(map: Map, fn: () => void): () => void {
    let active = true
    if (map.isStyleLoaded()) {
        fn()
        return () => {
            active = false
        }
    }
    const onLoad = () => {
        if (active) fn()
    }
    map.once('load', onLoad)
    return () => {
        active = false
        map.off('load', onLoad)
    }
}

export function safeRemoveLayer(map: Map, ...ids: string[]) {
    for (const id of ids) {
        try {
            if (map.getLayer(id)) map.removeLayer(id)
        } catch {
            // map may already be disposed
        }
    }
}

export function safeRemoveSource(map: Map, id: string) {
    try {
        if (map.getSource(id)) map.removeSource(id)
    } catch {
        // map may already be disposed
    }
}
