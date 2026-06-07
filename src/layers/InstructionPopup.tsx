import { useEffect } from 'react'
import styles from '@/layers/DefaultMapPopup.module.css'
import { Map } from 'maplibre-gl'
import MapPopup from '@/layers/MapPopup'
import Dispatcher from '@/stores/Dispatcher'
import { InstructionClicked } from '@/actions/Actions'
import { Coordinate } from '@/utils'

interface InstructionPopupProps {
    map: Map
    coordinate: Coordinate | null
    instructionText: string
}

/**
 * The popup shown when we click one of the instructions
 */
export default function InstructionPopup({ map, instructionText, coordinate }: InstructionPopupProps) {
    useEffect(() => {
        const closeInstructionPopup = () => Dispatcher.dispatch(new InstructionClicked(null, ''))
        map.on('click', closeInstructionPopup)
        return () => {
            map.off('click', closeInstructionPopup)
        }
    }, [map])
    return (
        <MapPopup map={map} coordinate={coordinate}>
            <div className={styles.popup}>
                <p>{instructionText}</p>
            </div>
        </MapPopup>
    )
}
