import Link from 'next/link';
import {notFound} from 'next/navigation';
import {atlas} from '@/domain/toladot-map';
import PlaceEntry from './place-entry';
export const metadata={title:'ערך מקום · מפת תולדות',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const place=atlas.places.find(p=>p.slug===slug);if(!place)notFound();return <main className="atlas" dir="rtl"><div className="atlas-full-entry"><Link href={`/map?place=${place.id}`}>← חזרה למפת תולדות</Link><PlaceEntry place={place}/></div></main>;}
