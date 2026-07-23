interface MiniCalendarProps {
  highlightDates: string[];
}

export function MiniCalendar({ highlightDates }: MiniCalendarProps) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7; // lundi = 0
  const cells: Array<number | null> = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const highlightSet = new Set(
    highlightDates
      .map((d) => d.split('-').map(Number))
      .filter(([y, m]) => y === year && m - 1 === month)
      .map(([, , day]) => day)
  );

  return (
    <div className="mini-cal">
      {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
        <div className="cal-day-head" key={`${d}-${i}`}>{d}</div>
      ))}
      {cells.map((day, i) => (
        <div
          key={i}
          className={`cal-day ${day === null ? 'empty' : ''} ${day === today.getDate() ? 'today' : ''} ${day && highlightSet.has(day) && day !== today.getDate() ? 'has-event' : ''}`.trim()}
        >
          {day || ''}
        </div>
      ))}
    </div>
  );
}

export default MiniCalendar;
