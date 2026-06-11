import { useEffect } from 'react'
import { Map, MapLayerMouseEvent } from 'maplibre-gl'
import { Path } from '@/api/graphhopper'
import Dispatcher from '@/stores/Dispatcher'
import { PathDetailsHover, SetSelectedPath } from '@/actions/Actions'
import { TurnNavigationStoreState } from '@/stores/TurnNavigationStore'
import { QueryPoint } from '@/stores/QueryStore'
import { runWhenStyleReady, safeRemoveLayer, safeRemoveSource } from '@/map/mapUtils'
import { planeDist, getSlopeColor } from '@/pathDetails/elevationWidget/colors'
import { FeatureCollection } from 'geojson'

const PATHS_SOURCE = 'gh-paths'
const PATHS_CASING = 'gh-paths-casing'
const PATHS_LINE = 'gh-paths-line'
const SELECTED_SOURCE = 'gh-selected-path'
const SELECTED_INCLINE_SOURCE = 'gh-selected-path-incline'
const SELECTED_CASING = 'gh-selected-path-casing'
const SELECTED_LINE = 'gh-selected-path-line'
const ACCESS_SOURCE = 'gh-access-network'
const ACCESS_LINE = 'gh-access-network'

// handlers we register on the (re-created) unselected paths layer and need to remove again
let onClick: ((e: MapLayerMouseEvent) => void) | null = null
let onEnter: (() => void) | null = null
let onLeave: (() => void) | null = null
// handlers for the hover tooltip (distance from start + elevation) on the selected route
let onSelectedMove: ((e: MapLayerMouseEvent) => void) | null = null
let onSelectedLeave: (() => void) | null = null

export default function usePathsLayer(
    map: Map,
    paths: Path[],
    selectedPath: Path,
    queryPoints: QueryPoint[],
    turnNavigation: TurnNavigationStoreState,
    showPaths: boolean = true,
    inclineColors: boolean = false,
) {
    useEffect(() => {
        const cancel = runWhenStyleReady(map, () => {
            removeAll(map)
            if (turnNavigation.showUI && turnNavigation.activePath) {
                addSelectedPath(map, turnNavigation.activePath, false)
            } else if (showPaths) {
                addUnselectedPaths(
                    map,
                    paths.filter(p => p != selectedPath),
                )
                addSelectedPath(map, selectedPath, inclineColors)
                addAccessNetwork(map, selectedPath, queryPoints)
            }
        })
        return () => {
            cancel()
            removeAll(map)
        }
    }, [
        map,
        paths,
        selectedPath,
        turnNavigation.showUI,
        turnNavigation.activePath,
        showPaths,
        queryPoints,
        inclineColors,
    ])
}

function removeAll(map: Map) {
    if (onClick) {
        map.off('click', PATHS_LINE, onClick)
        map.off('click', PATHS_CASING, onClick)
        onClick = null
    }
    if (onEnter) {
        map.off('mouseenter', PATHS_LINE, onEnter)
        map.off('mouseenter', PATHS_CASING, onEnter)
        onEnter = null
    }
    if (onLeave) {
        map.off('mouseleave', PATHS_LINE, onLeave)
        map.off('mouseleave', PATHS_CASING, onLeave)
        onLeave = null
    }
    if (onSelectedMove) {
        map.off('mousemove', SELECTED_CASING, onSelectedMove)
        map.off('mousemove', SELECTED_LINE, onSelectedMove)
        onSelectedMove = null
    }
    if (onSelectedLeave) {
        map.off('mouseleave', SELECTED_CASING, onSelectedLeave)
        map.off('mouseleave', SELECTED_LINE, onSelectedLeave)
        onSelectedLeave = null
    }
    safeRemoveLayer(map, PATHS_CASING, PATHS_LINE, SELECTED_CASING, SELECTED_LINE, ACCESS_LINE)
    safeRemoveSource(map, PATHS_SOURCE)
    safeRemoveSource(map, SELECTED_SOURCE)
    safeRemoveSource(map, SELECTED_INCLINE_SOURCE)
    safeRemoveSource(map, ACCESS_SOURCE)
}

function lineString(coordinates: number[][]) {
    return { type: 'LineString' as const, coordinates }
}

// Splits the route into segments colored by incline (the INCLINE_CATEGORIES scale used by the elevation graph),
// merging consecutive same-color segments. Expects [lng, lat, ele] coordinates.
function buildInclineFeatures(coordinates: number[][]): FeatureCollection {
    const features: FeatureCollection['features'] = []
    let current: { color: string; coords: number[][] } | null = null
    for (let i = 0; i < coordinates.length - 1; i++) {
        const a = coordinates[i]
        const b = coordinates[i + 1]
        const dist = planeDist(a, b)
        const slope = dist > 0 ? ((b[2] - a[2]) / dist) * 100 : 0
        const color = getSlopeColor(slope)
        if (current && current.color === color) {
            current.coords.push([b[0], b[1]])
        } else {
            if (current) features.push(segmentFeature(current.color, current.coords))
            current = { color, coords: [[a[0], a[1]], [b[0], b[1]]] }
        }
    }
    if (current) features.push(segmentFeature(current.color, current.coords))
    return { type: 'FeatureCollection', features }
}

function segmentFeature(color: string, coords: number[][]) {
    return { type: 'Feature' as const, properties: { color }, geometry: lineString(coords) }
}

function addUnselectedPaths(map: Map, paths: Path[]) {
    const data: FeatureCollection = {
        type: 'FeatureCollection',
        features: paths
            .filter(p => p.points?.coordinates)
            .map((path, index) => ({
                type: 'Feature' as const,
                properties: { index },
                geometry: lineString(path.points.coordinates as number[][]),
            })),
    }
    map.addSource(PATHS_SOURCE, { type: 'geojson', data })
    map.addLayer({
        id: PATHS_CASING,
        type: 'line',
        source: PATHS_SOURCE,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': 'rgba(39,93,173,0.8)', 'line-width': 6, 'line-opacity': 0.7 },
    })
    map.addLayer({
        id: PATHS_LINE,
        type: 'line',
        source: PATHS_SOURCE,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': 'rgba(201,217,241,0.7)', 'line-width': 4, 'line-opacity': 0.7 },
    })

    // select an alternative path when clicked
    onClick = (e: MapLayerMouseEvent) => {
        const feature = e.features?.[0]
        if (!feature) return
        const index = feature.properties?.index as number
        Dispatcher.dispatch(new SetSelectedPath(paths[index]))
    }
    map.on('click', PATHS_LINE, onClick)
    map.on('click', PATHS_CASING, onClick)
    onEnter = () => (map.getCanvas().style.cursor = 'pointer')
    onLeave = () => (map.getCanvas().style.cursor = '')
    map.on('mouseenter', PATHS_LINE, onEnter)
    map.on('mouseenter', PATHS_CASING, onEnter)
    map.on('mouseleave', PATHS_LINE, onLeave)
    map.on('mouseleave', PATHS_CASING, onLeave)
}

function addSelectedPath(map: Map, selectedPath: Path, inclineColors: boolean) {
    const coordinates = (selectedPath.points?.coordinates as number[][]) ?? []
    const has3D = coordinates.length > 0 && coordinates[0].length >= 3
    const data: FeatureCollection = {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: {}, geometry: lineString(coordinates) }],
    }
    map.addSource(SELECTED_SOURCE, { type: 'geojson', data })
    // white casing/border underneath the route
    map.addLayer({
        id: SELECTED_CASING,
        type: 'line',
        source: SELECTED_SOURCE,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': 'rgba(255,255,255,0.9)', 'line-width': 11, 'line-opacity': 0.9 },
    })

    if (inclineColors && has3D && coordinates.length >= 2) {
        // color the route itself by incline (same color scale as the elevation graph)
        map.addSource(SELECTED_INCLINE_SOURCE, { type: 'geojson', data: buildInclineFeatures(coordinates) })
        map.addLayer({
            id: SELECTED_LINE,
            type: 'line',
            source: SELECTED_INCLINE_SOURCE,
            layout: { 'line-join': 'round', 'line-cap': 'butt' },
            paint: { 'line-color': ['get', 'color'], 'line-width': 8 },
        })
    } else {
        map.addLayer({
            id: SELECTED_LINE,
            type: 'line',
            source: SELECTED_SOURCE,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': 'rgba(39,100,200,0.85)', 'line-width': 8, 'line-opacity': 0.8 },
        })
    }

    // hovering the route shows a tooltip with the distance from the start and the elevation at that point
    // (the same popup the elevation graph uses)
    if (coordinates.length >= 2) {
        const cumulative: number[] = [0]
        for (let i = 1; i < coordinates.length; i++)
            cumulative[i] = cumulative[i - 1] + planeDist(coordinates[i - 1], coordinates[i])
        const has3D = coordinates[0].length >= 3

        let pending: [number, number] | null = null
        let scheduled = false
        const compute = () => {
            scheduled = false
            if (!pending) return
            let bestIdx = 0
            let bestDist = Infinity
            for (let i = 0; i < coordinates.length; i++) {
                const d = planeDist(pending, coordinates[i])
                if (d < bestDist) {
                    bestDist = d
                    bestIdx = i
                }
            }
            const c = coordinates[bestIdx]
            Dispatcher.dispatch(
                new PathDetailsHover({
                    point: { lng: c[0], lat: c[1] },
                    elevation: has3D ? c[2] : 0,
                    description: '',
                    distance: cumulative[bestIdx],
                }),
            )
        }
        onSelectedMove = (e: MapLayerMouseEvent) => {
            pending = [e.lngLat.lng, e.lngLat.lat]
            map.getCanvas().style.cursor = 'crosshair'
            if (!scheduled) {
                scheduled = true
                requestAnimationFrame(compute)
            }
        }
        onSelectedLeave = () => {
            Dispatcher.dispatch(new PathDetailsHover(null))
            map.getCanvas().style.cursor = ''
        }
        map.on('mousemove', SELECTED_CASING, onSelectedMove)
        map.on('mouseleave', SELECTED_CASING, onSelectedLeave)
    }
}

function createBezierLineString(start: number[], end: number[]): number[][] {
    const bezierPoints: number[][] = []
    const center = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2]
    const radius = Math.hypot(end[0] - start[0], end[1] - start[1]) / 2

    const startAngle = Math.atan2(start[1] - center[1], start[0] - center[0])
    const endAngle = Math.atan2(end[1] - center[1], end[0] - center[0])

    const controlPoints = [
        center[0] + (1 / 2) * radius * Math.sin(startAngle + (1 / 2) * (endAngle - startAngle)),
        center[1] + (1 / 2) * radius * Math.cos(startAngle + (1 / 2) * (endAngle - startAngle)),
    ]

    bezierPoints.push(start)
    for (let t = 0; t <= 1; t += 0.1) {
        bezierPoints.push([
            (1 - t) * (1 - t) * start[0] + 2 * t * (1 - t) * controlPoints[0] + t * t * end[0],
            (1 - t) * (1 - t) * start[1] + 2 * t * (1 - t) * controlPoints[1] + t * t * end[1],
        ])
    }
    bezierPoints.push(end)
    return bezierPoints
}

function addAccessNetwork(map: Map, selectedPath: Path, queryPoints: QueryPoint[]) {
    const features: FeatureCollection['features'] = []
    const snapped = selectedPath.snapped_waypoints?.coordinates ?? []
    for (let i = 0; i < snapped.length; i++) {
        if (i >= queryPoints.length) break // can happen if deleted too fast
        const start = [queryPoints[i].coordinate.lng, queryPoints[i].coordinate.lat]
        const end = snapped[i] as number[]
        features.push({
            type: 'Feature',
            properties: {},
            geometry: lineString(createBezierLineString(start, end)),
        })
    }
    map.addSource(ACCESS_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features } })
    map.addLayer({
        id: ACCESS_LINE,
        type: 'line',
        source: ACCESS_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': 'rgba(143,183,241,0.9)', 'line-width': 5, 'line-dasharray': [0.2, 2] },
    })
}
