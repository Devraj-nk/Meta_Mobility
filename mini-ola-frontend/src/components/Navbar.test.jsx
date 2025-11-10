import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from './Navbar';

test('renders Meta Mobility brand in navbar', () => {
  render(
    <BrowserRouter>
      <Navbar />
    </BrowserRouter>
  );
  const brand = screen.getByText(/Meta Mobility/i);
  expect(brand).toBeInTheDocument();
});
