import maplibregl, { GeoJSONSource, Map, Marker } from 'maplibre-gl'
import { useEffect, useRef } from 'react'
import { CurrentLocationStoreState } from '@/stores/CurrentLocationStore'
import { Feature, FeatureCollection } from 'geojson'
import { runWhenStyleReady, safeRemoveLayer, safeRemoveSource } from '@/map/mapUtils'

const ACCURACY_SOURCE = 'gh-cur-loc-accuracy'
const ACCURACY_FILL = 'gh-cur-loc-accuracy-fill'
const ACCURACY_LINE = 'gh-cur-loc-accuracy-line'
const DOT_SOURCE = 'gh-cur-loc-dot'
const DOT_LAYER = 'gh-cur-loc-dot'

export default function useCurrentLocationLayer(map: Map, locationState: CurrentLocationStoreState) {
    const headingMarkerRef = useRef<Marker | null>(null)

    useEffect(() => {
        if (!locationState.enabled) return
        const cancel = runWhenStyleReady(map, () => addLayers(map))
        return () => {
            cancel()
            removeLayers(map)
            headingMarkerRef.current?.remove()
            headingMarkerRef.current = null
        }
    }, [map, locationState.enabled])

    useEffect(() => {
        if (!locationState.enabled || !locationState.coordinate) return
        const cancel = runWhenStyleReady(map, () => {
            const coordinate = locationState.coordinate!
            const center: [number, number] = [coordinate.lng, coordinate.lat]
            ;(map.getSource(DOT_SOURCE) as GeoJSONSource | undefined)?.setData(pointFeatureCollection(center))
            ;(map.getSource(ACCURACY_SOURCE) as GeoJSONSource | undefined)?.setData(
                circlePolygon(center, locationState.accuracy),
            )

            // heading triangle via a (map aligned) DOM marker so it rotates with the device heading
            if (locationState.heading != null) {
                if (!headingMarkerRef.current) {
                    const el = document.createElement('div')
                    el.innerHTML = headingSvg
                    headingMarkerRef.current = new maplibregl.Marker({
                        element: el,
                        rotationAlignment: 'map',
                    }).setLngLat(center)
                    headingMarkerRef.current.addTo(map)
                }
                headingMarkerRef.current.setLngLat(center)
                headingMarkerRef.current.setRotation(locationState.heading)
            } else if (headingMarkerRef.current) {
                headingMarkerRef.current.remove()
                headingMarkerRef.current = null
            }

            if (locationState.syncView) {
                const currentZoom = map.getZoom()
                // keep the OL behaviour: ensure we are zoomed in at least to (former OL) zoom 16 == MapLibre 15
                const targetZoom = currentZoom < 15 ? 15 : currentZoom
                if (Math.abs(targetZoom - currentZoom) > 0.1)
                    map.easeTo({ zoom: targetZoom, center, duration: 400 })
                else map.setCenter(center)
            }
        })
        return () => cancel()
    }, [
        locationState.coordinate,
        locationState.accuracy,
        locationState.heading,
        locationState.syncView,
        locationState.enabled,
    ])
}

function addLayers(map: Map) {
    removeLayers(map)
    const empty: FeatureCollection = { type: 'FeatureCollection', features: [] }
    map.addSource(ACCURACY_SOURCE, { type: 'geojson', data: empty })
    map.addLayer({
        id: ACCURACY_FILL,
        type: 'fill',
        source: ACCURACY_SOURCE,
        paint: { 'fill-color': 'rgba(66, 133, 244, 0.1)' },
    })
    map.addLayer({
        id: ACCURACY_LINE,
        type: 'line',
        source: ACCURACY_SOURCE,
        paint: { 'line-color': 'rgba(66, 133, 244, 0.3)', 'line-width': 1 },
    })
    map.addSource(DOT_SOURCE, { type: 'geojson', data: empty })
    map.addLayer({
        id: DOT_LAYER,
        type: 'circle',
        source: DOT_SOURCE,
        paint: {
            'circle-radius': 8,
            'circle-color': '#368fe8',
            'circle-stroke-color': '#FFFFFF',
            'circle-stroke-width': 2,
        },
    })
}

function removeLayers(map: Map) {
    safeRemoveLayer(map, ACCURACY_FILL, ACCURACY_LINE, DOT_LAYER)
    safeRemoveSource(map, ACCURACY_SOURCE)
    safeRemoveSource(map, DOT_SOURCE)
}

function pointFeatureCollection(center: [number, number]): FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: center } }],
    }
}

// builds a GeoJSON polygon approximating a circle of the given radius (in meters) around the center, because
// MapLibre's circle layer radius is given in screen pixels and cannot express a real-world accuracy radius.
function circlePolygon(center: [number, number], radiusMeters: number): Feature {
    const points = 64
    const coords: number[][] = []
    const earth = 6378137
    const lat = (center[1] * Math.PI) / 180
    const dLat = (radiusMeters / earth) * (180 / Math.PI)
    const dLng = (radiusMeters / (earth * Math.cos(lat))) * (180 / Math.PI)
    for (let i = 0; i <= points; i++) {
        const theta = (i / points) * 2 * Math.PI
        coords.push([center[0] + dLng * Math.cos(theta), center[1] + dLat * Math.sin(theta)])
    }
    return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } }
}

// blue triangle pointing "up" (north); the marker rotation aligns it with the heading
const headingSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="26" viewBox="0 0 20 26">' +
    '<polygon points="10,0 18,18 10,14 2,18" fill="#368fe8" stroke="#FFFFFF" stroke-width="1"/>' +
    '</svg>'
