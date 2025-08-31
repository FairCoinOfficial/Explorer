// Simple middleware that doesn't handle locale routing
// since we're using a language selector instead
export function middleware() {
  // No middleware processing needed
  return;
}

export const config = {
  // Don't match any paths for now since we're not using locale routing
  matcher: []
};
