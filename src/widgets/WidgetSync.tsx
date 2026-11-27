import MonthWidget from './MonthWidget';
import { useWidgetSync, type WidgetData } from './useWidgetSync';

// The timeline starts the new cycle at zero even if the app isn't opened.
const publish = ({ current, next }: WidgetData) => MonthWidget.updateTimeline([{ date: new Date(), props: current }, next]);

/** Keeps the home screen widget up to date. */
export function WidgetSync() {
  useWidgetSync(publish);
  return null;
}
