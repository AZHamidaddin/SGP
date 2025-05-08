// tests/AllOffers.test.jsx
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AllOffers from '../src/AllOffers';

// stub out Navbar since we don't need its implementation here
jest.mock('../src/Navbar', () => () => <div data-testid="navbar">Navbar</div>);

// Mock fetch to return one offer
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () =>
      Promise.resolve({
        offers: [
          {
            _id: '42',
            'offer title': 'special offer',
            offer_image: 'image.jpg',
            'offer URL': 'http://example.com',
            parent: 'vox'
          }
        ]
      })
  })
);

describe('AllOffers Component', () => {
  test('renders loading then offer card', async () => {
    render(
      <MemoryRouter>
        <AllOffers />
      </MemoryRouter>
    );

    // initial loading state
    expect(screen.getByText(/Loading offers\.\.\./i)).toBeInTheDocument();

    // wait for fetch to resolve and the formatted title to appear
    await waitFor(() => expect(screen.getByText('Special Offer')).toBeInTheDocument());

    // verify the image rendered with the correct src and alt
    const img = screen.getByRole('img', { name: /Offer: Special Offer/i });
    expect(img).toHaveAttribute('src', 'image.jpg');

    // verify the link wraps the card and points to the correct URL
    const offerTitle = screen.getByText('Special Offer');
    const link = offerTitle.closest('a');
    expect(link).toHaveAttribute('href', 'http://example.com');
    expect(link).toHaveAttribute('target', '_blank');

    // verify the parent tag text and its color class
    const tag = screen.getByText('vox');
    expect(tag).toHaveClass('bg-blue-500');

    // ensure Navbar is rendered at top
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
  });
});
