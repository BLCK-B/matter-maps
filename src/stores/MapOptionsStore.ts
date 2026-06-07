import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import {
    MapIsLoaded,
    SelectMapLayer,
    ToggleExternalMVTLayer,
    ToggleRoutingGraph,
    ToggleUrbanDensityLayer,
} from '@/actions/Actions'
import config from 'config'

const osmAttribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'

export interface MapOptionsStoreState {
    styleOptions: StyleOption[]
    selectedStyle: StyleOption
    isMapLoaded: boolean
    routingGraphEnabled: boolean
    urbanDensityEnabled: boolean
    externalMVTEnabled: boolean
}

export interface StyleOption {
    name: string
    type: 'raster' | 'vector'
    url: string[] | string
    attribution: string
    maxZoom?: number
}

export interface RasterStyle extends StyleOption {
    type: 'raster'
    url: string[]
    tilePixelRatio?: number
}

const osmOrg: RasterStyle = {
    name: 'OpenStreetMap',
    type: 'raster',
    url: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    attribution: osmAttribution,
    maxZoom: 19,
}
const osmCycl: RasterStyle = {
    name: 'Cyclosm',
    type: 'raster',
    // The {a,b,c}.tile-cyclosm.openstreetmap.fr hosts are unreachable; the maintained CyclOSM endpoint is served
    // (with CORS, which MapLibre requires) from dev.{a,b,c}.tile.openstreetmap.fr.
    url: [
        'https://dev.a.tile.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
        'https://dev.b.tile.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
        'https://dev.c.tile.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    ],
    attribution:
        osmAttribution +
        ', &copy; <a href="https://github.com/cyclosm/cyclosm-cartocss-style/releases" target="_blank">CyclOSM</a>',
    maxZoom: 19,
}
const esriSatellite: RasterStyle = {
    name: 'Esri Satellite',
    type: 'raster',
    url: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    attribution:
        '&copy; <a href="http://www.esri.com/" target="_blank">Esri</a>' +
        ' i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18,
}
const openTopo: RasterStyle = {
    name: 'OpenTopoMap',
    type: 'raster',
    url: [
        'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
        'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
        'https://c.tile.opentopomap.org/{z}/{x}/{y}.png',
    ],
    attribution:
        osmAttribution +
        ', &copy; <a href="https://opentopomap.org" target="_blank">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
}

const styleOptions: StyleOption[] = [osmOrg, esriSatellite, openTopo, osmCycl]

export default class MapOptionsStore extends Store<MapOptionsStoreState> {
    constructor() {
        super(MapOptionsStore.getInitialState())
    }

    private static getInitialState(): MapOptionsStoreState {
        let selectedStyle = styleOptions.find(s => s.name === config.defaultTiles)
        if (!selectedStyle) {
            console.warn(
                `Could not find tile layer specified in config: '${config.defaultTiles}', using default instead`,
            )
            selectedStyle = styleOptions[0]
        }
        return {
            selectedStyle: selectedStyle!,
            styleOptions,
            routingGraphEnabled: false,
            urbanDensityEnabled: false,
            externalMVTEnabled: false,
            isMapLoaded: false,
        }
    }

    reduce(state: MapOptionsStoreState, action: Action): MapOptionsStoreState {
        if (action instanceof SelectMapLayer) {
            const styleOption = state.styleOptions.find(o => o.name === action.layer)
            if (styleOption)
                return {
                    ...state,
                    selectedStyle: styleOption,
                }
        } else if (action instanceof ToggleRoutingGraph) {
            if (state.routingGraphEnabled === action.routingGraphEnabled) return state
            return {
                ...state,
                routingGraphEnabled: action.routingGraphEnabled,
            }
        } else if (action instanceof ToggleUrbanDensityLayer) {
            if (state.urbanDensityEnabled === action.urbanDensityEnabled) return state
            return {
                ...state,
                urbanDensityEnabled: action.urbanDensityEnabled,
            }
        } else if (action instanceof ToggleExternalMVTLayer) {
            if (state.externalMVTEnabled === action.externalMVTLayerEnabled) return state
            return {
                ...state,
                externalMVTEnabled: action.externalMVTLayerEnabled,
            }
        } else if (action instanceof MapIsLoaded) {
            return {
                ...state,
                isMapLoaded: true,
            }
        }
        return state
    }
}
