import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Home from './Home'

test('renders hero heading on Home page', () => {
  render(
    <BrowserRouter>
      <Home />
    </BrowserRouter>
  )
  expect(screen.getByText(/Your Ride, Your Way/i)).toBeInTheDocument()
})
