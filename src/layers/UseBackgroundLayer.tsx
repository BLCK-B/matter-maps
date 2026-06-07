import { useEffect } from 'react'
import { Map } from 'maplibre-gl'
import { RasterStyle, StyleOption } from '@/stores/MapOptionsStore'
import { runWhenStyleReady, safeRemoveLayer, safeRemoveSource } from '@/map/mapUtils'
import { HILLSHADE_LAYER } from '@/map/mapStyle'

const BASEMAP_SOURCE = 'gh-basemap'
const BASEMAP_LAYER = 'gh-basemap'

export default function useBackgroundLayer(map: Map, styleOption: StyleOption) {
    useEffect(() => {
        const cancel = runWhenStyleReady(map, () => addBackground(map, styleOption))
        return () => {
            cancel()
            removeBackground(map)
        }
    }, [map, styleOption])
}

function removeBackground(map: Map) {
    safeRemoveLayer(map, BASEMAP_LAYER)
    safeRemoveSource(map, BASEMAP_SOURCE)
}

function addBackground(map: Map, styleOption: StyleOption) {
    removeBackground(map)
    if (styleOption.type === 'vector') {
        // Vector basemaps (full style.json) are not yet supported by the 3D MapLibre renderer because swapping the
        // whole style would wipe our overlays. The current style options are all raster, so this is a no-op for now.
        console.warn('Vector basemap styles are not yet supported with the MapLibre 3D renderer:', styleOption.name)
        return
    }
    const rasterStyle = styleOption as RasterStyle
    map.addSource(BASEMAP_SOURCE, {
        type: 'raster',
        tiles: rasterStyle.url,
        tileSize: 256,
        maxzoom: rasterStyle.maxZoom ?? 19,
        attribution: rasterStyle.attribution,
    })
    // insert the basemap below the (persistent) hillshade layer so terrain shading is drawn on top of the tiles
    const beforeId = map.getLayer(HILLSHADE_LAYER) ? HILLSHADE_LAYER : undefined
    map.addLayer({ id: BASEMAP_LAYER, type: 'raster', source: BASEMAP_SOURCE }, beforeId)
}
