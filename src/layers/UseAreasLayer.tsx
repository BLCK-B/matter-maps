import { Map } from 'maplibre-gl'
import { useEffect } from 'react'
import { FeatureCollection } from 'geojson'
import { runWhenStyleReady, safeRemoveLayer, safeRemoveSource } from '@/map/mapUtils'

const AREAS_SOURCE = 'gh-areas'
const AREAS_FILL = 'gh-areas-fill'
const AREAS_LINE = 'gh-areas-line'

let warnedAboutEditing = false

/**
 * Renders the custom-model "areas" polygons on the map.
 *
 * NOTE: Interactive drawing/modifying of areas (the old OpenLayers Draw/Modify/Snap interactions) is not yet
 * available with the MapLibre 3D renderer because MapLibre has no built-in vector editing — that would require an
 * additional draw library (e.g. mapbox-gl-draw / terra-draw). For now areas are shown read-only; editing them via
 * the map is disabled, but areas defined in the custom model JSON are still displayed.
 */
export default function useAreasLayer(map: Map, modifyOrNewAreas: boolean, customModelStr: string, cmEnabled: boolean) {
    useEffect(() => {
        const cancel = runWhenStyleReady(map, () => addAreasLayer(map, modifyOrNewAreas, customModelStr))
        return () => {
            cancel()
            removeAreasLayer(map)
        }
    }, [map, modifyOrNewAreas, cmEnabled, customModelStr])
}

function addAreasLayer(map: Map, modifyOrNewAreas: boolean, customModelStr: string) {
    removeAreasLayer(map)
    const customModel = getCustomModel(customModelStr)
    if (customModel == null) return

    const areas = customModel.areas as FeatureCollection | undefined
    if (!areas || !areas.features || areas.features.length === 0) {
        if (modifyOrNewAreas && !warnedAboutEditing) {
            warnedAboutEditing = true
            console.warn('Drawing/editing areas on the map is not yet supported with the MapLibre 3D renderer.')
        }
        return
    }

    map.addSource(AREAS_SOURCE, { type: 'geojson', data: areas })
    map.addLayer({
        id: AREAS_FILL,
        type: 'fill',
        source: AREAS_SOURCE,
        paint: { 'fill-color': 'rgba(229,229,229,0.5)' },
    })
    map.addLayer({
        id: AREAS_LINE,
        type: 'line',
        source: AREAS_SOURCE,
        paint: { 'line-color': '#F97777', 'line-width': 3 },
    })

    if (modifyOrNewAreas && !warnedAboutEditing) {
        warnedAboutEditing = true
        console.warn('Drawing/editing areas on the map is not yet supported with the MapLibre 3D renderer.')
    }
}

function getCustomModel(cm: string) {
    try {
        return JSON.parse(cm)
    } catch {
        return null
    }
}

function removeAreasLayer(map: Map) {
    safeRemoveLayer(map, AREAS_FILL, AREAS_LINE)
    safeRemoveSource(map, AREAS_SOURCE)
}
