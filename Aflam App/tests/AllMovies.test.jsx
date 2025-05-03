// tests/AllMovies.test.jsx
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AllMovies from '../src/AllMovies';
import { UserContext } from '../src/UserContext';

// Mock fetch to return one movie
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () =>
      Promise.resolve([
        { _id: '1', Title: 'Test Movie', 'Image URL': 'img.jpg', Language: 'en' }
      ])
  })
);

test('renders loading then movie card', async () => {
  render(
    <UserContext.Provider value={{ user: { name: 'Test User', id: '123' } }}>
      <AllMovies />
    </UserContext.Provider>
  );

  // Adjusted to match the actual loading text
  expect(screen.getByText(/Loading\.\.\./i)).toBeInTheDocument();

  // Wait for the mock fetch to resolve and the movie title to appear
  await waitFor(() => expect(screen.getByText('Test Movie')).toBeInTheDocument());

  // Verify the image URL got applied
  const img = screen.getByRole('img', { name: /Test Movie/i });
  expect(img).toHaveAttribute('src', 'img.jpg');
});
