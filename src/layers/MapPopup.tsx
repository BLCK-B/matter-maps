import { Map } from 'maplibre-gl'
import { JSX, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Coordinate } from '@/utils'

interface MapPopupProps {
    map: Map
    coordinate: Coordinate | null
    children: JSX.Element
}

/**
 * Positions arbitrary React children at a geographic coordinate on the map. Replaces the former ol.Overlay: the
 * children are portalled into a div that lives inside the map container and is moved on every map render so it
 * tracks the projected pixel of the coordinate (also while the 3D camera moves).
 */
export default function MapPopup({ map, coordinate, children }: MapPopupProps) {
    const elRef = useRef<HTMLDivElement | null>(null)
    if (elRef.current == null) {
        const el = document.createElement('div')
        el.style.position = 'absolute'
        el.style.top = '0'
        el.style.left = '0'
        el.style.zIndex = '1'
        el.style.willChange = 'transform'
        elRef.current = el
    }

    useEffect(() => {
        const el = elRef.current!
        map.getContainer().appendChild(el)
        return () => {
            if (el.parentElement) el.parentElement.removeChild(el)
        }
    }, [map])

    useEffect(() => {
        const el = elRef.current!
        const update = () => {
            if (!coordinate) {
                el.style.display = 'none'
                return
            }
            el.style.display = ''
            const p = map.project([coordinate.lng, coordinate.lat])
            el.style.transform = `translate(${p.x}px, ${p.y}px)`
        }
        update()
        map.on('move', update)
        map.on('render', update)
        return () => {
            map.off('move', update)
            map.off('render', update)
        }
    }, [map, coordinate])

    return createPortal(children, elRef.current)
}
