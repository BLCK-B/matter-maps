import { StyleSpecification } from 'maplibre-gl'

// ids of the persistent base style elements that survive background switches
export const DEM_SOURCE = 'gh-dem'
export const HILLSHADE_LAYER = 'gh-hillshade'

// Free, global elevation tiles used for 3D terrain + hillshading (see https://mapterhorn.com).
const DEM_TILEJSON = 'https://tiles.mapterhorn.com/tilejson.json'

/**
 * The initial MapLibre style. It only contains the elements that should persist when the user switches the
 * background map (the DEM source for 3D terrain, the hillshade layer, the sky and the terrain config). The actual
 * basemap (raster tiles) is added/removed on top by {@link useBackgroundLayer} so switching it never wipes our
 * GeoJSON overlays.
 */
export function getInitialStyle(): StyleSpecification {
    return {
        version: 8,
        sources: {
            [DEM_SOURCE]: {
                type: 'raster-dem',
                url: DEM_TILEJSON,
            },
        },
        layers: [
            {
                id: HILLSHADE_LAYER,
                type: 'hillshade',
                source: DEM_SOURCE,
                paint: { 'hillshade-shadow-color': '#473B24' },
            },
        ],
        terrain: { source: DEM_SOURCE, exaggeration: 1 },
        sky: {
            'sky-color': '#199EF3',
            'sky-horizon-blend': 0.5,
            'horizon-color': '#ffffff',
            'horizon-fog-blend': 0.5,
            'fog-color': '#dfe9f5',
            'fog-ground-blend': 0.5,
        },
    }
}
