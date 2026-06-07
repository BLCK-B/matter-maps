import { useEffect } from 'react'
import { Map, MapLayerMouseEvent } from 'maplibre-gl'
import { Path } from '@/api/graphhopper'
import Dispatcher from '@/stores/Dispatcher'
import { SetSelectedPath } from '@/actions/Actions'
import { TurnNavigationStoreState } from '@/stores/TurnNavigationStore'
import { QueryPoint } from '@/stores/QueryStore'
import { runWhenStyleReady, safeRemoveLayer, safeRemoveSource } from '@/map/mapUtils'
import { FeatureCollection } from 'geojson'

const PATHS_SOURCE = 'gh-paths'
const PATHS_CASING = 'gh-paths-casing'
const PATHS_LINE = 'gh-paths-line'
const SELECTED_SOURCE = 'gh-selected-path'
const SELECTED_CASING = 'gh-selected-path-casing'
const SELECTED_LINE = 'gh-selected-path-line'
const ACCESS_SOURCE = 'gh-access-network'
const ACCESS_LINE = 'gh-access-network'

// handlers we register on the (re-created) unselected paths layer and need to remove again
let onClick: ((e: MapLayerMouseEvent) => void) | null = null
let onEnter: (() => void) | null = null
let onLeave: (() => void) | null = null

export default function usePathsLayer(
    map: Map,
    paths: Path[],
    selectedPath: Path,
    queryPoints: QueryPoint[],
    turnNavigation: TurnNavigationStoreState,
    showPaths: boolean = true,
) {
    useEffect(() => {
        const cancel = runWhenStyleReady(map, () => {
            removeAll(map)
            if (turnNavigation.showUI && turnNavigation.activePath) {
                addSelectedPath(map, turnNavigation.activePath)
            } else if (showPaths) {
                addUnselectedPaths(
                    map,
                    paths.filter(p => p != selectedPath),
                )
                addSelectedPath(map, selectedPath)
                addAccessNetwork(map, selectedPath, queryPoints)
            }
        })
        return () => {
            cancel()
            removeAll(map)
        }
    }, [map, paths, selectedPath, turnNavigation.showUI, turnNavigation.activePath, showPaths, queryPoints])
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
    safeRemoveLayer(map, PATHS_CASING, PATHS_LINE, SELECTED_CASING, SELECTED_LINE, ACCESS_LINE)
    safeRemoveSource(map, PATHS_SOURCE)
    safeRemoveSource(map, SELECTED_SOURCE)
    safeRemoveSource(map, ACCESS_SOURCE)
}

function lineString(coordinates: number[][]) {
    return { type: 'LineString' as const, coordinates }
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

function addSelectedPath(map: Map, selectedPath: Path) {
    const coordinates = (selectedPath.points?.coordinates as number[][]) ?? []
    const data: FeatureCollection = {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: {}, geometry: lineString(coordinates) }],
    }
    map.addSource(SELECTED_SOURCE, { type: 'geojson', data })
    map.addLayer({
        id: SELECTED_CASING,
        type: 'line',
        source: SELECTED_SOURCE,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': 'rgba(255,255,255,0.9)', 'line-width': 10, 'line-opacity': 0.8 },
    })
    map.addLayer({
        id: SELECTED_LINE,
        type: 'line',
        source: SELECTED_SOURCE,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': 'rgba(39,100,200,0.85)', 'line-width': 8, 'line-opacity': 0.8 },
    })
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
