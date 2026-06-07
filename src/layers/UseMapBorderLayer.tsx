import { Map } from 'maplibre-gl'
import { Bbox } from '@/api/graphhopper'
import { useEffect } from 'react'
import { runWhenStyleReady, safeRemoveLayer, safeRemoveSource } from '@/map/mapUtils'

const BORDER_SOURCE = 'gh-border'
const BORDER_LAYER = 'gh-border'

export default function useMapBorderLayer(map: Map, bbox: Bbox) {
    useEffect(() => {
        const cancel = runWhenStyleReady(map, () => {
            if (JSON.stringify(bbox) !== '[-180,-90,180,90]') addBorderLayer(map, bbox)
        })
        return () => {
            cancel()
            removeBorderLayer(map)
        }
    }, [map, bbox])
}

function addBorderLayer(map: Map, bbox: Bbox) {
    removeBorderLayer(map)
    map.addSource(BORDER_SOURCE, {
        type: 'geojson',
        data: {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: [
                    [bbox[0], bbox[1]],
                    [bbox[0], bbox[3]],
                    [bbox[2], bbox[3]],
                    [bbox[2], bbox[1]],
                    [bbox[0], bbox[1]],
                ],
            },
        },
    })
    map.addLayer({
        id: BORDER_LAYER,
        type: 'line',
        source: BORDER_SOURCE,
        paint: { 'line-color': '#AAAAAA', 'line-width': 2 },
    })
}

function removeBorderLayer(map: Map) {
    safeRemoveLayer(map, BORDER_LAYER)
    safeRemoveSource(map, BORDER_SOURCE)
}
