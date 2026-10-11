// Design system section 5.6: skeletons match the shape of the content that is
// about to render, keeping the layout stable while data loads.

export function SummaryCardsSkeleton() {
  return (
    <section className="summary-grid" aria-hidden="true">
      {[0, 1, 2, 3].map((index) => (
        <article key={index} className="summary-card">
          <span className="skeleton skeleton-label" />
          <span className="skeleton skeleton-value" />
          <span className="skeleton skeleton-caption" />
        </article>
      ))}
    </section>
  );
}

export function LineChartSkeleton() {
  return (
    <div className="chart-skeleton chart-skeleton-line" aria-hidden="true">
      <span className="skeleton skeleton-flat-line" />
    </div>
  );
}

export function BarChartSkeleton() {
  return (
    <div className="chart-skeleton chart-skeleton-bars" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <span key={index} className="skeleton skeleton-bar" />
      ))}
    </div>
  );
}

export function TableSkeleton({
  columns = 4,
  rows = 3,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="table-skeleton" aria-hidden="true">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="table-skeleton-row">
          {Array.from({ length: columns }, (_, columnIndex) => (
            <span key={columnIndex} className="skeleton table-skeleton-cell" />
          ))}
        </div>
      ))}
    </div>
  );
}
