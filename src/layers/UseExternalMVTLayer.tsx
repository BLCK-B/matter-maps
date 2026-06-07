import { Map } from 'maplibre-gl'
import { useEffect } from 'react'

let warned = false

/**
 * Debug overlay that renders an external Mapbox Vector Tile source configured via `config.externalMVTLayer`.
 *
 * TODO: not yet ported to the MapLibre 3D renderer. It is gated behind the `externalMVTLayer` config flag (off by
 * default). Porting requires adding a MapLibre vector-tile source for `config.externalMVTLayer.url` plus the
 * per-layer styling and hover/selection handling that previously used OpenLayers' getFeaturesAtPixel.
 */
export default function useExternalMVTLayer(map: Map, externalMVTLayerEnabled: boolean) {
    useEffect(() => {
        if (externalMVTLayerEnabled && !warned) {
            warned = true
            console.warn('The external MVT debug layer is not yet available with the MapLibre 3D renderer.')
        }
    }, [map, externalMVTLayerEnabled])
}
