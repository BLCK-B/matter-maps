import { Map } from 'maplibre-gl'
import { useEffect } from 'react'
import { runWhenStyleReady, safeRemoveLayer, safeRemoveSource } from '@/map/mapUtils'
import { HILLSHADE_LAYER } from '@/map/mapStyle'

const BUILDINGS_SOURCE = 'gh-3d-buildings'
const BUILDINGS_LAYER = 'gh-3d-buildings'
const BASEMAP_LAYER = 'gh-basemap'

// Free, key-less global OSM vector tiles using the unmodified OpenMapTiles schema, whose `building` source-layer
// carries render_height / render_min_height — exactly what we extrude into 3D shapes. See https://openfreemap.org.
// Attribution is added automatically by MapLibre from the source's TileJSON.
const OPENFREEMAP_PLANET = 'https://tiles.openfreemap.org/planet'

/**
 * Renders OSM building footprints as 3D extrusions (osmbuildings.org style) on top of the current basemap.
 *
 * Our basemaps are raster (flat images) so they cannot carry building geometry; we add a separate vector source
 * just for the buildings and extrude it with a fill-extrusion layer. Tilt the map (right-drag / ctrl-drag / two
 * fingers) to see the 3D shapes — when enabling we also tilt the camera if it is looking straight down.
 */
export default function use3DBuildingsLayer(map: Map, enabled: boolean) {
    useEffect(() => {
        if (!enabled) return
        const cancel = runWhenStyleReady(map, () => {
            addBuildings(map)
            // make the 3D obvious by tilting the camera when we're looking straight down
            if (map.getPitch() < 20) map.easeTo({ pitch: 55, duration: 800 })
        })
        return () => {
            cancel()
            safeRemoveLayer(map, BUILDINGS_LAYER)
            safeRemoveSource(map, BUILDINGS_SOURCE)
        }
    }, [map, enabled])
}

function addBuildings(map: Map) {
    safeRemoveLayer(map, BUILDINGS_LAYER)
    safeRemoveSource(map, BUILDINGS_SOURCE)
    map.addSource(BUILDINGS_SOURCE, { type: 'vector', url: OPENFREEMAP_PLANET })

    // Insert below our other overlays (route, POIs, markers, ...) so flat ground lines stay drawn on top of the
    // extrusions, but above the basemap/hillshade. Falls back to the top of the stack when no overlay exists yet.
    const skip = new Set([BASEMAP_LAYER, HILLSHADE_LAYER])
    const firstOverlay = (map.getStyle().layers ?? []).find(l => l.id.startsWith('gh-') && !skip.has(l.id))

    map.addLayer(
        {
            id: BUILDINGS_LAYER,
            type: 'fill-extrusion',
            source: BUILDINGS_SOURCE,
            'source-layer': 'building',
            minzoom: 14,
            paint: {
                // tint taller buildings slightly darker for a bit of depth
                'fill-extrusion-color': [
                    'interpolate',
                    ['linear'],
                    ['coalesce', ['get', 'render_height'], 0],
                    0,
                    '#e6e6e6',
                    40,
                    '#cfd4da',
                    120,
                    '#a7adb6',
                ],
                'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 0],
                'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
                'fill-extrusion-opacity': 0.9,
            },
        },
        firstOverlay?.id,
    )
}
