import { Action, ActionReceiver } from '@/stores/Dispatcher'
import { Map, LngLatBoundsLike, EaseToOptions } from 'maplibre-gl'
import {
    InfoReceived,
    LocationUpdate,
    PathDetailsRangeSelected,
    RouteRequestSuccess,
    SetBBox,
    SetSelectedPath,
    TurnNavigationStart,
    TurnNavigationStop,
    MoveMapToPoint,
} from '@/actions/Actions'
import RouteStore from '@/stores/RouteStore'
import { Bbox } from '@/api/graphhopper'

// MapLibre uses one zoom level less than the previous OpenLayers setup, so we translate the (historic) OL zoom
// numbers used by the navigation logic into MapLibre zoom levels.
const ZOOM_OFFSET = 1
// the pitch (in degrees) we tilt the camera to while turn-by-turn navigation is active
const NAVIGATION_PITCH = 55

export default class MapActionReceiver implements ActionReceiver {
    readonly map: Map
    private readonly routeStore: RouteStore
    private readonly isSmallScreenQuery: () => boolean
    private readonly onMove: () => boolean
    private readonly onUserDrag: () => void

    constructor(map: Map, routeStore: RouteStore, isSmallScreenQuery: () => boolean, onMove: () => boolean) {
        this.map = map
        this.routeStore = routeStore
        this.isSmallScreenQuery = isSmallScreenQuery
        this.onMove = onMove
        this.onUserDrag = () => {
            this.onMove()
        }
    }

    receive(action: Action) {
        const isSmallScreen = this.isSmallScreenQuery()
        if (action instanceof SetBBox) {
            fitBounds(this.map, action.bbox, isSmallScreen)
        } else if (action instanceof TurnNavigationStop) {
            this.map.off('dragstart', this.onUserDrag)
            this.map.easeTo({
                bearing: 0,
                pitch: 0,
                zoom: 16 - ZOOM_OFFSET,
                padding: { top: 0, bottom: 0, left: 0, right: 0 },
                duration: 300,
            })
        } else if (action instanceof TurnNavigationStart) {
            // auto-tilt into 3D for navigation and stop auto-following once the user drags the map
            this.map.easeTo({ pitch: NAVIGATION_PITCH, duration: 300 })
            this.map.on('dragstart', this.onUserDrag)
        } else if (action instanceof LocationUpdate) {
            // The main navigation event: whenever the location updates we move (and rotate) the map with an
            // animation. The current-location arrow (see NavigationLocationLayer) follows the store coordinate.
            const size = this.map.getCanvas()
            const width = size.clientWidth
            const height = size.clientHeight
            const center: [number, number] = [action.coordinate.lng, action.coordinate.lat]

            if (action.syncView) {
                const args: EaseToOptions = {
                    center,
                    easing: t => t, // linear
                    // animation lasts at least 1000ms because location updates come in every 1s
                    duration: 1050,
                    // move the rotation anchor a bit down so the current location is not centered but lower
                    padding: { top: (height * 2) / 3, right: 0, bottom: width > 1200 ? 0 : 100, left: 0 },
                }

                // pick a zoom level depending on the speed but with hysteresis to avoid zooming back and forth
                const oldZoom = this.map.getZoom() + ZOOM_OFFSET
                if (oldZoom < 16) args.zoom = 16 - ZOOM_OFFSET
                else if (oldZoom > 18) args.zoom = 18 - ZOOM_OFFSET
                else if (action.speed < 6) args.zoom = 18 - ZOOM_OFFSET
                else if (action.speed > 8 && action.speed <= 20) args.zoom = 17 - ZOOM_OFFSET
                else if (action.speed > 23) args.zoom = 16 - ZOOM_OFFSET

                if (!Number.isNaN(action.heading) && action.speed > 0) {
                    // MapLibre bearing is clockwise from north (degrees); setting it to the heading makes the
                    // travel direction point up on screen.
                    const bearing = action.heading
                    const bearingDelta = Math.abs(normalizeBearing(this.map.getBearing() - bearing))
                    const cur = this.map.getCenter()
                    const smallMove = lonLatDistanceMeters([cur.lng, cur.lat], center) < 1
                    if ((smallMove || action.speed <= 0.5) && bearingDelta > 45) {
                        // ignore heavy rotation when nearly no movement (avoids jitter)
                    } else {
                        args.bearing = bearing
                    }
                }

                this.map.stop() // cancel stacked animations if updates come too fast
                this.map.easeTo(args)
            }
            // when not syncing the view we leave the camera alone; the arrow still follows the store coordinate
        } else if (action instanceof MoveMapToPoint) {
            let zoom = this.map.getZoom()
            if (zoom < 8 - ZOOM_OFFSET) zoom = 8 - ZOOM_OFFSET
            this.map.easeTo({
                zoom,
                center: [action.coordinate.lng, action.coordinate.lat],
                duration: 400,
            })
        } else if (action instanceof RouteRequestSuccess) {
            const bbox = action.result.paths[0].bbox!
            const widerBBox = [bbox[0], bbox[1], bbox[2], bbox[3]] as Bbox
            action.request.points.forEach(p => {
                widerBBox[0] = Math.min(p[0], widerBBox[0])
                widerBBox[1] = Math.min(p[1], widerBBox[1])
                widerBBox[2] = Math.max(p[0], widerBBox[2])
                widerBBox[3] = Math.max(p[1], widerBBox[3])
            })
            if (widerBBox[2] - widerBBox[0] < 0.001) {
                widerBBox[0] -= 0.0005
                widerBBox[2] += 0.0005
            }
            if (widerBBox[3] - widerBBox[1] < 0.001) {
                widerBBox[1] -= 0.0005
                widerBBox[3] += 0.0005
            }
            if (action.zoom) fitBounds(this.map, widerBBox, isSmallScreen)
        } else if (action instanceof SetSelectedPath) {
            // Forcing to change bounds is ugly if zoomed in and for alternatives. See #437
        } else if (action instanceof PathDetailsRangeSelected) {
            const bbox = action.bbox ? action.bbox : this.routeStore.state.selectedPath.bbox
            if (bbox) fitBounds(this.map, bbox, isSmallScreen)
        } else if (action instanceof InfoReceived) {
            if (JSON.stringify(action.result.bbox) === '[-180,-90,180,90]') {
                // play it safe in terms of initial page loading time and do nothing
            } else {
                fitBounds(this.map, action.result.bbox, isSmallScreen)
            }
        }
    }
}

function fitBounds(map: Map, bbox: Bbox, isSmallScreen: boolean) {
    const bounds: LngLatBoundsLike = [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
    ]
    map.fitBounds(bounds, {
        padding: isSmallScreen
            ? { top: 200, right: 16, bottom: 32, left: 16 }
            : { top: 100, right: 100, bottom: 200, left: 500 },
        animate: false,
    })
}

function normalizeBearing(deg: number): number {
    let d = deg % 360
    if (d > 180) d -= 360
    if (d < -180) d += 360
    return d
}

function lonLatDistanceMeters(a: number[], b: number[]): number {
    const R = 6378137
    const dLat = ((b[1] - a[1]) * Math.PI) / 180
    const dLng = ((b[0] - a[0]) * Math.PI) / 180
    const lat = ((a[1] + b[1]) / 2) * (Math.PI / 180)
    const x = dLng * Math.cos(lat)
    return Math.sqrt(x * x + dLat * dLat) * R
}
