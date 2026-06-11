import { Map } from 'maplibre-gl'
import { useEffect } from 'react'
import { PathDetailsStoreState } from '@/stores/PathDetailsStore'
import { FeatureCollection } from 'geojson'
import { Coordinate } from '@/utils'
import { ChartPathDetail } from '@/pathDetails/elevationWidget/types'
import { runWhenStyleReady, safeRemoveLayer, safeRemoveSource } from '@/map/mapUtils'

const HIGHLIGHTED_SOURCE = 'gh-path-detail-highlight'
const HIGHLIGHTED_LAYER = 'gh-path-detail-highlight'
const ACTIVE_SOURCE = 'gh-path-detail-active'
const ACTIVE_LAYER = 'gh-path-detail-active'

/**
 * This layer highlights path segments that are above the elevation threshold set by the horizontal line in the
 * path details diagram, and also draws colored route segments when a path detail is active.
 */
export default function usePathDetailsLayer(map: Map, pathDetails: PathDetailsStoreState, showPaths: boolean = true) {
    // Highlighted segments (elevation threshold)
    useEffect(() => {
        const cancel = runWhenStyleReady(map, () => addHighlightedSegments(map, pathDetails))
        return () => {
            cancel()
            safeRemoveLayer(map, HIGHLIGHTED_LAYER)
            safeRemoveSource(map, HIGHLIGHTED_SOURCE)
        }
    }, [map, pathDetails])

    // Active detail colored segments
    useEffect(() => {
        const cancel = runWhenStyleReady(map, () => {
            // incline ('_incline') is drawn directly onto the selected route by usePathsLayer, so the overlay
            // only handles the other (dropdown-selected) path details here
            if (pathDetails.activeDetail && showPaths && pathDetails.activeDetail.key !== '_incline')
                addActiveDetailLayer(map, pathDetails.activeDetail)
        })
        return () => {
            cancel()
            safeRemoveLayer(map, ACTIVE_LAYER)
            safeRemoveSource(map, ACTIVE_SOURCE)
        }
    }, [map, pathDetails.activeDetail, showPaths])
}

function addHighlightedSegments(map: Map, pathDetails: PathDetailsStoreState) {
    safeRemoveLayer(map, HIGHLIGHTED_LAYER)
    safeRemoveSource(map, HIGHLIGHTED_SOURCE)
    const segments: Coordinate[][] = pathDetails.pathDetailsHighlightedSegments
    const data: FeatureCollection = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'MultiLineString',
                    coordinates: segments.map(s => s.map(c => [c.lng, c.lat])),
                },
            },
        ],
    }
    map.addSource(HIGHLIGHTED_SOURCE, { type: 'geojson', data })
    map.addLayer({
        id: HIGHLIGHTED_LAYER,
        type: 'line',
        source: HIGHLIGHTED_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': 'red', 'line-width': 4 },
    })
}

function addActiveDetailLayer(map: Map, detail: ChartPathDetail) {
    safeRemoveLayer(map, ACTIVE_LAYER)
    safeRemoveSource(map, ACTIVE_SOURCE)
    // Sort segments so shorter ones are drawn last (on top). This ensures small distinctive segments
    // (e.g. steps, cobblestone) aren't overshadowed by adjacent longer segments with round line caps.
    const sorted = [...detail.segments].sort((a, b) => b.coordinates.length - a.coordinates.length)
    const data: FeatureCollection = {
        type: 'FeatureCollection',
        features: sorted.map(seg => ({
            type: 'Feature',
            properties: { color: seg.color || '#666' },
            geometry: { type: 'LineString', coordinates: seg.coordinates as number[][] },
        })),
    }
    map.addSource(ACTIVE_SOURCE, { type: 'geojson', data })
    map.addLayer({
        id: ACTIVE_LAYER,
        type: 'line',
        source: ACTIVE_SOURCE,
        layout: { 'line-cap': 'butt', 'line-join': 'round' },
        // slightly wider than the selected path's blue line (8) so the colors fully replace it, while the
        // selected path's white casing (10) still shows as a thin border
        paint: { 'line-color': ['get', 'color'], 'line-width': 9 },
    })
}
