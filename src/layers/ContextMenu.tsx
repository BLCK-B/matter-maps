import { Map, MapMouseEvent } from 'maplibre-gl'
import { ContextMenuContent } from '@/map/ContextMenuContent'
import { useEffect, useRef, useState } from 'react'
import { QueryPoint } from '@/stores/QueryStore'
import styles from '@/layers/ContextMenu.module.css'
import { RouteStoreState } from '@/stores/RouteStore'
import { Coordinate } from '@/utils'

interface ContextMenuProps {
    map: Map
    route: RouteStoreState
    queryPoints: QueryPoint[]
}

export default function ContextMenu({ map, route, queryPoints }: ContextMenuProps) {
    const [menuCoordinate, setMenuCoordinate] = useState<Coordinate | null>(null)
    const container = useRef<HTMLDivElement | null>(null)

    const closeContextMenu = () => setMenuCoordinate(null)

    useEffect(() => {
        const el = container.current!
        el.style.position = 'absolute'
        el.style.top = '0'
        el.style.left = '0'
        el.style.zIndex = '3'
        map.getContainer().appendChild(el)

        const openAt = (lng: number, lat: number) => setMenuCoordinate({ lng, lat })

        // right-click (desktop) — MapLibre fires 'contextmenu' on the map directly
        const onContextMenu = (e: MapMouseEvent) => {
            e.preventDefault()
            openAt(e.lngLat.lng, e.lngLat.lat)
        }
        map.on('contextmenu', onContextMenu)

        // long touch (mobile), see #229
        const canvas = map.getCanvasContainer()
        const longTouchHandler = new LongTouchHandler((x, y) => {
            const lngLat = map.unproject([x, y])
            openAt(lngLat.lng, lngLat.lat)
        })
        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length !== 1) return longTouchHandler.cancel()
            const rect = canvas.getBoundingClientRect()
            longTouchHandler.onTouchStart(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top)
        }
        const handleTouchEnd = () => longTouchHandler.cancel()
        canvas.addEventListener('touchstart', handleTouchStart)
        canvas.addEventListener('touchmove', handleTouchEnd)
        canvas.addEventListener('touchend', handleTouchEnd)

        // close on a plain click or when the map starts moving
        map.on('click', closeContextMenu)
        map.on('movestart', closeContextMenu)

        return () => {
            map.off('contextmenu', onContextMenu)
            canvas.removeEventListener('touchstart', handleTouchStart)
            canvas.removeEventListener('touchmove', handleTouchEnd)
            canvas.removeEventListener('touchend', handleTouchEnd)
            map.off('click', closeContextMenu)
            map.off('movestart', closeContextMenu)
            if (el.parentElement) el.parentElement.removeChild(el)
        }
    }, [map])

    // keep the menu positioned at its geographic coordinate while the camera moves
    useEffect(() => {
        const el = container.current!
        const update = () => {
            if (!menuCoordinate) {
                el.style.display = 'none'
                return
            }
            el.style.display = ''
            const p = map.project([menuCoordinate.lng, menuCoordinate.lat])
            el.style.transform = `translate(${p.x}px, ${p.y}px)`
        }
        update()
        map.on('move', update)
        map.on('render', update)
        return () => {
            map.off('move', update)
            map.off('render', update)
        }
    }, [map, menuCoordinate])

    return (
        <div className={styles.contextMenu} ref={container}>
            {menuCoordinate && (
                <ContextMenuContent
                    coordinate={menuCoordinate!}
                    queryPoints={queryPoints}
                    route={route}
                    onSelect={closeContextMenu}
                />
            )}
        </div>
    )
}

// See #229
class LongTouchHandler {
    private readonly callback: (x: number, y: number) => void
    private currentTimeout: number = 0
    private x = 0
    private y = 0

    constructor(onLongTouch: (x: number, y: number) => void) {
        this.callback = onLongTouch
    }

    onTouchStart(x: number, y: number) {
        this.x = x
        this.y = y
        this.currentTimeout = window.setTimeout(() => this.callback(this.x, this.y), 500)
    }

    cancel() {
        window.clearTimeout(this.currentTimeout)
    }
}
