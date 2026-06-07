import maplibregl, { Map, Marker } from 'maplibre-gl'
import { QueryPoint, QueryPointType } from '@/stores/QueryStore'
import { useEffect } from 'react'
import Dispatcher from '@/stores/Dispatcher'
import { SetPoint } from '@/actions/Actions'
import { coordinateToText } from '@/Converters'
import { createSvg } from '@/layers/createMarkerSVG'

const MARKER_SIZE = 35

export default function useQueryPointsLayer(map: Map, queryPoints: QueryPoint[]) {
    useEffect(() => {
        const markers: Marker[] = []
        queryPoints
            .map((point, i) => ({ index: i, point }))
            .filter(indexPoint => indexPoint.point.isInitialized)
            .forEach((indexPoint, i) => {
                const point = indexPoint.point
                const props = {
                    color: point.color,
                    number: point.type == QueryPointType.Via ? i : undefined,
                    size: MARKER_SIZE,
                }
                const el = document.createElement('div')
                el.style.cursor = 'pointer'
                el.innerHTML = createSvg(props)

                const marker = new maplibregl.Marker({ element: el, anchor: 'bottom', draggable: true })
                    .setLngLat([point.coordinate.lng, point.coordinate.lat])
                    .addTo(map)

                marker.on('dragstart', () => (map.getCanvas().style.cursor = 'grabbing'))
                marker.on('dragend', () => {
                    map.getCanvas().style.cursor = ''
                    const lngLat = marker.getLngLat()
                    const coordinate = { lng: lngLat.lng, lat: lngLat.lat }
                    Dispatcher.dispatch(
                        new SetPoint(
                            {
                                ...point,
                                coordinate,
                                queryText: coordinateToText(coordinate),
                            },
                            false,
                        ),
                    )
                })
                markers.push(marker)
            })
        return () => markers.forEach(m => m.remove())
    }, [map, queryPoints])
}
