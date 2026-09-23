'use client';

import dynamic from 'next/dynamic';
import { AtlasMapShell } from './AtlasMapShell';

const ToladotMap = dynamic(() => import('./ToladotMap'), {
  ssr: false,
  loading: () => (
    <AtlasMapShell
      stage={
        <div
          className="atlas-canvas"
          style={{ height: '100%', minHeight: 510, position: 'relative' }}
        >
          <div className="atlas-loading" role="status">
            טוען את המפה…
          </div>
        </div>
      }
    />
  ),
});

export function MapPageClient({
  initialPerson = '',
  initialPlace = '',
  initialPeriod = '',
}: {
  initialPerson?: string;
  initialPlace?: string;
  initialPeriod?: string;
}) {
  return (
    <ToladotMap
      initialPerson={initialPerson}
      initialPlace={initialPlace}
      initialPeriod={initialPeriod}
    />
  );
}
