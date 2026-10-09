// Synthetic QA-only records. Never imported by the website or production Worker.
export const testFilms = [
  { id: 'fixture-film-a', title: 'Fixture Film A', releaseYear: 2026, territory: 'GB' },
  { id: 'fixture-film-b', title: 'Fixture Film B', releaseYear: 2026, territory: 'GB' }
];
export const testReviews = [
  { reviewId: 'a1', filmId: 'fixture-film-a', releaseYear: 2026, criticId: 'critic-a', criticName: 'Critic A', publication: 'Fixture Journal', publicationUrl: 'https://example.test/about', reviewUrl: 'https://example.test/review/a', score: 4, scoreOutOf: 5, territory: 'GB', publishedAt: '2026-01-01', checkedAt: '2026-10-08', permissionCleared: true, professionalVerified: true, ratingKind: 'numeric-professional-review' },
  { reviewId: 'a2', filmId: 'fixture-film-a', releaseYear: 2026, criticId: 'critic-b', criticName: 'Critic B', publication: 'Fixture Paper', publicationUrl: 'https://example.test/paper', reviewUrl: 'https://example.test/review/b', score: 3, scoreOutOf: 4, territory: 'GB', publishedAt: '2026-01-02', checkedAt: '2026-10-08', permissionCleared: true, professionalVerified: true, ratingKind: 'numeric-professional-review' },
  { reviewId: 'a3', filmId: 'fixture-film-a', releaseYear: 2026, criticId: 'critic-c', criticName: 'Critic C', publication: 'Fixture Review', publicationUrl: 'https://example.test/review', reviewUrl: 'https://example.test/review/c', score: 8, scoreOutOf: 10, territory: 'GB', publishedAt: '2026-01-03', checkedAt: '2026-10-08', permissionCleared: true, professionalVerified: true, ratingKind: 'numeric-professional-review' }
];
