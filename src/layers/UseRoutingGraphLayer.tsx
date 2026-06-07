import { Map } from 'maplibre-gl'
import { useEffect } from 'react'

let warned = false

/**
 * Debug overlay that renders the GraphHopper routing graph from vector tiles.
 *
 * TODO: not yet ported to the MapLibre 3D renderer. It is gated behind the `routingGraphLayerAllowed` config flag
 * (off by default). Porting requires adding a MapLibre vector-tile source for `${routingApi}mvt/{z}/{x}/{y}.mvt`
 * plus the road styling and the hover/selection handling that previously used OpenLayers' getFeaturesAtPixel.
 */
export default function useRoutingGraphLayer(map: Map, routingGraphEnabled: boolean) {
    useEffect(() => {
        if (routingGraphEnabled && !warned) {
            warned = true
            console.warn('The routing graph debug layer is not yet available with the MapLibre 3D renderer.')
        }
    }, [map, routingGraphEnabled])
}
