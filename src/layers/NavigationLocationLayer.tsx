import { useEffect, useRef } from 'react'
import maplibregl, { Map, Marker } from 'maplibre-gl'
import { TurnNavigationStoreState } from '@/stores/TurnNavigationStore'

// This renders the arrow at the current location during turn navigation. The map itself is rotated so the travel
// direction points up (see MapActionReceiver); the arrow stays viewport-aligned and therefore always points up.
export default function useNavigationLocationLayer(map: Map, turnNavigation: TurnNavigationStoreState) {
    const markerRef = useRef<Marker | null>(null)

    useEffect(() => {
        if (!turnNavigation.showUI) return
        const el = document.createElement('div')
        el.innerHTML = svgArrowData
        const marker = new maplibregl.Marker({ element: el, rotationAlignment: 'viewport' })
            .setLngLat([turnNavigation.coordinate.lng, turnNavigation.coordinate.lat])
            .addTo(map)
        markerRef.current = marker
        return () => {
            marker.remove()
            markerRef.current = null
        }
    }, [map, turnNavigation.showUI])

    useEffect(() => {
        markerRef.current?.setLngLat([turnNavigation.coordinate.lng, turnNavigation.coordinate.lat])
    }, [turnNavigation.coordinate])
}

// a filled version of navigation.svg
const svgArrowData =
    '<svg xmlns="http://www.w3.org/2000/svg" height="50" width="50">' +
    '  <ellipse style="fill:rgba(255,255,255,0.6865);stroke:none;stroke-opacity:1" cx="25" cy="25" rx="25" ry="25" />' +
    '  <path style="fill:rgb(107,165,255);stroke:none;" d="M 24.776074,3.1477509 8.838421,39.50552 10.332578,40.99967 24.776074,34.425391 Z M 20.264723,30.914663 Z"/>' +
    '  <path style="fill:rgb(3,89,194);stroke:none;" d="M 24.772775,3.1435869 40.710421,39.50135 39.216266,40.995503 24.772775,34.421221 Z M 29.28412,30.910489 Z"/>' +
    '</svg>'
