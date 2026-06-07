import Dispatcher from '@/stores/Dispatcher'
import maplibregl, { Map } from 'maplibre-gl'
import { MapIsLoaded, StopSyncCurrentLocation } from '@/actions/Actions'
import { getInitialStyle } from '@/map/mapStyle'

let map: Map | undefined

export function createMap(): Map {
    // The container is created detached and later attached to the layout by MapComponent. This way the single map
    // instance can be moved between the small/large screen layouts without being destroyed.
    const container = document.createElement('div')
    container.style.width = '100%'
    container.style.height = '100%'

    map = new maplibregl.Map({
        container,
        style: getInitialStyle(),
        center: [10, 10],
        // MapLibre uses one zoom level less than OpenLayers did (the old MapLibreLayer bridge used `zoom - 1`).
        zoom: 1,
        pitch: 0,
        maxPitch: 85,
        // we provide our own attribution control so we can place it like before
        attributionControl: false,
        // keep the map north-up by default but allow the user to rotate/tilt into 3D (right-drag, ctrl-drag, two finger)
        dragRotate: true,
        pitchWithRotate: true,
    })

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showZoom: true, showCompass: true }))
    map.addControl(new maplibregl.AttributionControl({ compact: false }))

    map.on('load', () => Dispatcher.dispatch(new MapIsLoaded()))

    // when the user drags the map we stop following the current location (previously the OL 'pointerdrag' event)
    map.on('dragstart', e => {
        if ((e as any).originalEvent) Dispatcher.dispatch(new StopSyncCurrentLocation())
    })

    return map
}

export function setMap(m: Map) {
    map = m
}

export function getMap(): Map {
    if (!map) throw Error('Map must be initialized before it can be used. Use "createMap" when starting the app')
    return map
}
