import { DateField } from './DateField';
import { Row } from './kit';
import { Toggle } from './Toggle';

const WEEK = 7;
const midnight = (ms: number) => new Date(ms).setHours(0, 0, 0, 0);

/** An optional return date, stored as local midnight. null means none. */
export function DueDate({ value, onChange, from }: { value: number | null; onChange: (v: number | null) => void; from: Date }) {
  const suggested = () => new Date(from.getFullYear(), from.getMonth(), from.getDate() + WEEK).getTime();
  return (
    <>
      <Row title="Return due date" subtitle="Reminds you at 9:00 am">
        <Toggle accessibilityLabel="Return due date" value={value !== null} onValueChange={(on) => onChange(on ? suggested() : null)} />
      </Row>
      {value !== null ? (
        <Row title="Due on">
          <DateField value={new Date(value)} minimumDate={new Date(midnight(from.getTime()))} mode="date" onChange={(d) => onChange(midnight(d.getTime()))} />
        </Row>
      ) : null}
    </>
  );
}
