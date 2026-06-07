import { Map } from 'maplibre-gl'
import { useEffect } from 'react'

let warned = false

/**
 * Debug overlay that colors roads by urban density from vector tiles.
 *
 * TODO: not yet ported to the MapLibre 3D renderer. It is gated behind the `routingGraphLayerAllowed` config flag
 * (off by default). Porting requires a MapLibre vector-tile source for
 * `${routingApi}mvt/{z}/{x}/{y}.mvt?render_all=true` plus the urban-density road styling.
 */
export default function useUrbanDensityLayer(map: Map, urbanDensityEnabled: boolean) {
    useEffect(() => {
        if (urbanDensityEnabled && !warned) {
            warned = true
            console.warn('The urban density debug layer is not yet available with the MapLibre 3D renderer.')
        }
    }, [map, urbanDensityEnabled])
}
