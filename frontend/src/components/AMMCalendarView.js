import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Calendar as CalendarIcon, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Info,
  X
} from 'lucide-react';

const localizer = momentLocalizer(moment);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Custom styles for calendar
const calendarStyle = {
  height: '700px',
  backgroundColor: 'transparent'
};

function AMMCalendarView() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    loadCalendarEvents();
  }, [currentDate]);

  const loadCalendarEvents = async () => {
    setLoading(true);
    try {
      // Get start and end of current month
      const startOfMonth = moment(currentDate).startOf('month').toISOString();
      const endOfMonth = moment(currentDate).endOf('month').toISOString();
      
      const response = await axios.get(
        `${API}/amm/calendar-events?start_date=${startOfMonth}&end_date=${endOfMonth}`
      );
      
      if (response.data.success) {
        const calendarEvents = response.data.data.events.map(event => ({
          id: event.id,
          title: event.title,
          start: new Date(event.start),
          end: event.end ? new Date(event.end) : new Date(event.start),
          resource: event,
          style: {
            backgroundColor: event.color,
            borderColor: event.color,
            color: '#fff'
          }
        }));
        setEvents(calendarEvents);
      }
    } catch (error) {
      console.error('Error loading calendar events:', error);
      toast.error('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setShowEventDetail(true);
  };

  const handleNavigate = (date) => {
    setCurrentDate(date);
  };

  const eventStyleGetter = (event) => {
    return {
      style: event.style
    };
  };

  const EventDetailModal = () => {
    if (!selectedEvent) return null;

    const resource = selectedEvent.resource;
    const statusIcon = {
      'completed': <CheckCircle className="w-5 h-5 text-green-400" />,
      'running': <Clock className="w-5 h-5 text-yellow-400 animate-spin" />,
      'in_progress': <Clock className="w-5 h-5 text-yellow-400 animate-spin" />,
      'failed': <AlertCircle className="w-5 h-5 text-red-400" />,
      'error': <AlertCircle className="w-5 h-5 text-red-400" />,
      'pending': <Info className="w-5 h-5 text-blue-400" />
    }[resource.status] || <Info className="w-5 h-5 text-slate-400" />;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <Card className="glass-card border-0 w-full max-w-2xl mx-4 max-h-[80vh] overflow-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {statusIcon}
                <div>
                  <CardTitle>{resource.amm_name}</CardTitle>
                  <CardDescription>Execution Details</CardDescription>
                </div>
              </div>
              <Button
                onClick={() => setShowEventDetail(false)}
                variant="ghost"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Badge */}
            <div>
              <Badge className={`${
                resource.status === 'completed' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                resource.status === 'running' || resource.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                resource.status === 'failed' || resource.status === 'error' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                'bg-blue-500/20 text-blue-300 border-blue-500/30'
              }`}>
                {resource.status.toUpperCase()}
              </Badge>
            </div>

            {/* Timing Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400 mb-1">Scheduled Start</p>
                <p className="text-white">{moment(selectedEvent.start).format('MMMM D, YYYY')}</p>
                <p className="text-sm text-slate-400">{moment(selectedEvent.start).format('h:mm A')}</p>
              </div>
              {selectedEvent.end && (
                <div>
                  <p className="text-sm text-slate-400 mb-1">End Time</p>
                  <p className="text-white">{moment(selectedEvent.end).format('MMMM D, YYYY')}</p>
                  <p className="text-sm text-slate-400">{moment(selectedEvent.end).format('h:mm A')}</p>
                </div>
              )}
            </div>

            {/* Execution Stats */}
            <div className="border-t border-slate-700/30 pt-4">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Execution Statistics</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Measurements Performed</p>
                  <p className="text-2xl font-bold text-white">{resource.measurements_performed || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Orders Generated</p>
                  <p className="text-2xl font-bold text-white">{resource.generated_orders?.length || 0}</p>
                </div>
              </div>
            </div>

            {/* Generated Orders */}
            {resource.generated_orders && resource.generated_orders.length > 0 && (
              <div className="border-t border-slate-700/30 pt-4">
                <h4 className="text-sm font-medium text-slate-300 mb-2">Generated Orders</h4>
                <div className="space-y-1">
                  {resource.generated_orders.map((orderId, idx) => (
                    <p key={idx} className="text-xs text-slate-400 font-mono">
                      {orderId}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="border-t border-slate-700/30 pt-4 flex justify-end space-x-2">
              <Button
                onClick={() => setShowEventDetail(false)}
                variant="ghost"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  // Navigate to AMM detail or execution detail
                  window.location.href = `/automatic-mode?amm=${resource.amm_config_id}`;
                }}
                className="btn-spectrum"
              >
                View AMM Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6" />
            AMM Calendar View
          </h2>
          <p className="text-slate-400">
            Visual schedule of all Automatic Mode Measurements
          </p>
        </div>
        <Button 
          onClick={loadCalendarEvents}
          disabled={loading}
          className="btn-spectrum"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Legend */}
      <Card className="glass-card border-0">
        <CardContent className="p-4">
          <div className="flex items-center space-x-6">
            <p className="text-sm text-slate-400 font-medium">Status Legend:</p>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-sm text-slate-300">Completed</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-yellow-500"></div>
              <span className="text-sm text-slate-300">In Progress</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span className="text-sm text-slate-300">Failed/Error</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span className="text-sm text-slate-300">Pending</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card className="glass-card border-0">
        <CardContent className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="calendar-container">
              <style>{`
                .calendar-container .rbc-calendar {
                  background: transparent;
                  color: #e2e8f0;
                }
                .calendar-container .rbc-header {
                  background: rgba(30, 41, 59, 0.5);
                  color: #cbd5e1;
                  border-color: rgba(51, 65, 85, 0.3);
                  padding: 10px 5px;
                  font-weight: 600;
                }
                .calendar-container .rbc-day-bg {
                  border-color: rgba(51, 65, 85, 0.3);
                }
                .calendar-container .rbc-today {
                  background-color: rgba(59, 130, 246, 0.1);
                }
                .calendar-container .rbc-off-range-bg {
                  background-color: rgba(15, 23, 42, 0.5);
                }
                .calendar-container .rbc-date-cell {
                  color: #cbd5e1;
                  padding: 5px;
                }
                .calendar-container .rbc-event {
                  border-radius: 4px;
                  padding: 2px 5px;
                  font-size: 12px;
                  border: none;
                }
                .calendar-container .rbc-event:hover {
                  opacity: 0.8;
                }
                .calendar-container .rbc-toolbar {
                  margin-bottom: 20px;
                }
                .calendar-container .rbc-toolbar button {
                  color: #cbd5e1;
                  border-color: rgba(51, 65, 85, 0.5);
                  background-color: rgba(30, 41, 59, 0.5);
                  padding: 8px 16px;
                  border-radius: 6px;
                  font-weight: 500;
                }
                .calendar-container .rbc-toolbar button:hover {
                  background-color: rgba(51, 65, 85, 0.8);
                }
                .calendar-container .rbc-toolbar button.rbc-active {
                  background-color: rgba(59, 130, 246, 0.3);
                  border-color: rgba(59, 130, 246, 0.5);
                }
                .calendar-container .rbc-month-view {
                  border-color: rgba(51, 65, 85, 0.3);
                  background: rgba(15, 23, 42, 0.3);
                }
              `}</style>
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={calendarStyle}
                onSelectEvent={handleSelectEvent}
                onNavigate={handleNavigate}
                eventPropGetter={eventStyleGetter}
                views={['month', 'week', 'day']}
                defaultView="month"
                popup
                tooltipAccessor={(event) => `${event.title} - ${event.resource.status}`}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Detail Modal */}
      {showEventDetail && <EventDetailModal />}
    </div>
  );
}

export default AMMCalendarView;
