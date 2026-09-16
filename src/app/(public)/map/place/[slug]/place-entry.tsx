"use client";
import {AtlasPlaceCard} from '@/components/map/AtlasPlaceCard';
import {type AtlasPlace,emptyTime} from '@/domain/toladot-map';
import '@/components/map/atlas.css';
export default function PlaceEntry({place}:{place:AtlasPlace}){return <AtlasPlaceCard place={place} time={emptyTime} fullEntry/>;}
