// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation, type Location } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import {
  ExplorerLink,
  isDetailPath,
  masterLocation,
  useExplorerNavigate,
} from './explorer-navigation'
import { usePageParam } from '@/hooks/use-page-param'

afterEach(cleanup)

function Probe() {
  const location = useLocation()
  const navigate = useExplorerNavigate()
  const [page, setPage] = usePageParam()
  return createElement(
    'div',
    null,
    createElement(
      'output',
      { 'data-testid': 'location' },
      JSON.stringify(location),
    ),
    createElement(ExplorerLink, { to: '/block/123' }, 'Block'),
    createElement(
      'button',
      { onClick: () => navigate('/tx/abc') },
      'Transaction',
    ),
    createElement(ExplorerLink, { to: '/charts' }, 'Charts'),
    createElement('button', { onClick: () => setPage(page + 1) }, 'Next page'),
    createElement('output', { 'data-testid': 'page' }, page),
  )
}
function current(): Location {
  return JSON.parse(screen.getByTestId('location').textContent!)
}
function start(path: string) {
  render(
    createElement(
      MemoryRouter,
      { initialEntries: [path] },
      createElement(Probe),
    ),
  )
}

describe('explorer reading pane navigation', () => {
  it.each([
    '/',
    '/blocks?page=3&q=123',
    '/tx?page=2',
    '/address/Fexample?page=4',
    '/charts',
    '/mempool',
  ])(
    'keeps %s as the origin through block and transaction navigation',
    (origin) => {
      start(origin)
      const source = current()
      fireEvent.click(screen.getByText('Block'))
      expect(current().pathname).toBe('/block/123')
      expect(masterLocation(current())).toEqual(source)
      fireEvent.click(screen.getByText('Transaction'))
      expect(current().pathname).toBe('/tx/abc')
      expect(masterLocation(current())).toEqual(source)
      fireEvent.click(screen.getByText('Charts'))
      expect(current().pathname).toBe('/charts')
      expect(current().state).toBeNull()
    },
  )

  it.each([
    ['/block/123', '/blocks'],
    ['/tx/abc', '/tx'],
  ])('supplies a list for the direct URL %s', (detail, list) => {
    start(detail)
    expect(masterLocation(current()).pathname).toBe(list)
    fireEvent.click(screen.getByText('Transaction'))
    expect(masterLocation(current()).pathname).toBe(list)
  })

  it('only recognizes individual block and transaction routes as panes', () => {
    for (const path of ['/block/123', '/block/hash/', '/tx/hash'])
      expect(isDetailPath(path)).toBe(true)
    for (const path of [
      '/',
      '/blocks',
      '/tx',
      '/tx/',
      '/tx/hash/extra',
      '/address/hash',
    ])
      expect(isDetailPath(path)).toBe(false)
  })

  it('keeps other filters while changing the page', () => {
    start('/blocks?page=2&q=abc&time=24h')
    fireEvent.click(screen.getByText('Next page'))
    expect(new URLSearchParams(current().search).get('page')).toBe('3')
    expect(new URLSearchParams(current().search).get('q')).toBe('abc')
    expect(new URLSearchParams(current().search).get('time')).toBe('24h')
  })

  it.each(['-1', '1.5', 'Infinity', 'abc'])(
    'normalizes invalid pagination %s',
    (page) => {
      start(`/blocks?page=${page}`)
      expect(screen.getByTestId('page').textContent).toBe('1')
    },
  )
})
