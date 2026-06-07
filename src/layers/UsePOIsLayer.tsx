import maplibregl, { Map, Marker } from 'maplibre-gl'
import { useEffect } from 'react'
import { POIsStoreState } from '@/stores/POIsStore'

import charger from '../pois/img/charger.svg'
import cinematic_blur from '../pois/img/cinematic_blur.svg'
import car_repair from '../pois/img/car_repair.svg'
import car_rental from '../pois/img/car_rental.svg'
import flight_takeoff_svg from '../pois/img/flight_takeoff.svg'
import home_and_garden from '../pois/img/home_and_garden.svg'
import hotel_svg from '../pois/img/hotel.svg'
import local_hospital_svg from '../pois/img/local_hospital.svg'
import local_parking_svg from '../pois/img/local_parking.svg'
import local_pharmacy_svg from '../pois/img/local_pharmacy.svg'
import local_atm from '../pois/img/local_atm.svg'
import local_gas_station from '../pois/img/local_gas_station.svg'
import local_post_office from '../pois/img/local_post_office.svg'
import location_city from '../pois/img/location_city.svg'
import luggage_svg from '../pois/img/luggage.svg'
import museum_svg from '../pois/img/museum.svg'
import pedal_bike from '../pois/img/pedal_bike.svg'
import police from '../pois/img/police.svg'
import pool from '../pois/img/pool.svg'
import recycling from '../pois/img/recycling.svg'
import restaurant_svg from '../pois/img/restaurant.svg'
import school_svg from '../pois/img/school.svg'
import sports_handball_svg from '../pois/img/sports_handball.svg'
import store_svg from '../pois/img/store.svg'
import train_svg from '../pois/img/train.svg'
import universal_currency_alt_svg from '../pois/img/universal_currency_alt.svg'
import visibility from '../pois/img/visibility.svg'
import wifi from '../pois/img/wifi.svg'
import water_drop from '../pois/img/water_drop.svg'

import { createPOIMarker } from '@/layers/createMarkerSVG'
import Dispatcher from '@/stores/Dispatcher'
import { SelectPOI } from '@/actions/Actions'

const svgStrings: { [id: string]: string } = {}

const svgObjects: { [id: string]: any } = {
    car_rental: car_rental(),
    car_repair: car_repair(),
    charger: charger(),
    cinematic_blur: cinematic_blur(),
    flight_takeoff: flight_takeoff_svg(),
    home_and_garden: home_and_garden(),
    hotel: hotel_svg(),
    local_atm: local_atm(),
    local_gas_station: local_gas_station(),
    local_hospital: local_hospital_svg(),
    local_parking: local_parking_svg(),
    local_pharmacy: local_pharmacy_svg(),
    local_post_office: local_post_office(),
    location_city: location_city(),
    luggage: luggage_svg(),
    museum: museum_svg(),
    pedal_bike: pedal_bike(),
    police: police(),
    recycling: recycling(),
    restaurant: restaurant_svg(),
    school: school_svg(),
    sports_handball: sports_handball_svg(),
    pool: pool(),
    store: store_svg(),
    train: train_svg(),
    universal_currency_alt: universal_currency_alt_svg(),
    visibility: visibility(),
    water_drop: water_drop(),
    wifi: wifi(),
}

for (const k in svgObjects) {
    const svgObj = svgObjects[k]
    svgStrings[k] = createPOIMarker(svgObj.props.children.props.d)
}

export default function usePOIsLayer(map: Map, poisState: POIsStoreState) {
    useEffect(() => {
        const markers: Marker[] = []
        poisState.pois.forEach(poi => {
            const el = document.createElement('div')
            el.style.cursor = 'pointer'
            el.innerHTML = svgStrings[poi.icon] ?? svgStrings['store']
            const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
                .setLngLat([poi.coordinate.lng, poi.coordinate.lat])
                .addTo(map)
            el.addEventListener('click', e => {
                e.stopPropagation()
                el.style.transform += ' scale(1.4)'
                Dispatcher.dispatch(new SelectPOI(poi))
            })
            markers.push(marker)
        })

        // clicking on the empty map (not on a POI marker) clears the selection
        const onMapClick = () => Dispatcher.dispatch(new SelectPOI(null))
        if (poisState.pois.length > 0) map.on('click', onMapClick)

        return () => {
            markers.forEach(m => m.remove())
            map.off('click', onMapClick)
        }
    }, [map, poisState.pois])
}
