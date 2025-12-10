// src/types/react-big-calendar.d.ts

declare module 'react-big-calendar' {
  import { ComponentType, ReactNode } from 'react';

  export type View = 'month' | 'week' | 'work_week' | 'day' | 'agenda';

  export interface ToolbarProps {
    date: Date;
    view: View;
    views: View[];
    label: string;
    localizer: any;
    onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY' | 'DATE', newDate?: Date) => void;
    onView: (view: View) => void;
    children?: ReactNode;
  }

  export interface CalendarProps {
    localizer: any;
    events: any[];
    startAccessor?: string | ((event: any) => Date);
    endAccessor?: string | ((event: any) => Date);
    style?: React.CSSProperties;
    culture?: string;
    messages?: any;
    eventPropGetter?: (event: any, start: Date, end: Date, isSelected: boolean) => { style?: React.CSSProperties; className?: string };
    onView?: (view: View) => void;
    view?: View;
    onSelectEvent?: (event: any) => void;
    components?: any;
  }

  export const Calendar: ComponentType<CalendarProps>;
  export function dateFnsLocalizer(config: any): any;
}