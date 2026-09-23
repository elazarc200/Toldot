import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AtlasMapShell } from '@/components/map/AtlasMapShell';

afterEach(cleanup);

it('renders full atlas chrome while the map chunk loads', () => {
  render(
    <AtlasMapShell
      stage={
        <div className="atlas-loading" role="status">
          טוען את המפה…
        </div>
      }
    />,
  );
  expect(screen.getByRole('heading', { name: /מפת תולדות/ })).toBeInTheDocument();
  expect(screen.getByLabelText('חיפוש במפה')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /סינון ושכבות/ })).toBeInTheDocument();
  expect(screen.getByText(/מרכז ראשי/)).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('טוען את המפה');
});
